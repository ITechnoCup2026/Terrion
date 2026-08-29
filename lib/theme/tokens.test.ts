import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * Every custom property a component reads must exist in the stylesheet.
 *
 * This is not style policing. An undefined custom property in an SVG `fill`
 * is not an error and does not fall back to anything sensible -- the
 * declaration is simply invalid, and the shape paints BLACK. That is how
 * `ProjectionChart` came to draw the dashboard's harvest bars as black slabs:
 * the palette rewrite renamed --terrion-primary to --terrion-green-700 and
 * nothing anywhere failed. It typechecks, it lints, it renders, and it is
 * wrong in a way only a human looking at the screen can see.
 *
 * Two shapes are checked, and the second is stricter on purpose:
 *
 *   var(--x)                     must be defined. var(--x, fallback) need not
 *                                be -- a fallback is the author saying the
 *                                property is optional, which is true of
 *                                --rise-delay and anything else set inline.
 *
 *   getPropertyValue('--x')      must be defined even when the JS has a `||`
 *                                fallback. A fallback there does not prevent
 *                                the bug, it disguises it: the canvas quietly
 *                                keeps painting a colour from the palette we
 *                                deleted, which is worse than painting black
 *                                because nobody notices.
 */

const ROOT = join(__dirname, '..', '..')
const STYLESHEET = join(ROOT, 'app', 'globals.css')
const SCANNED = ['app', 'components', 'lib']
const CODE = /\.(ts|tsx)$/

// Every `--name:` declaration in the stylesheet, wherever it is declared --
// :root, @theme inline, a media query. Only the name matters here.
function definedProperties(css: string): Set<string> {
  return new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map(m => m[1]))
}

// Every .ts/.tsx file under the scanned directories, tests excluded: a test
// naming a deliberately-missing property is describing a bug, not shipping one.
function sourceFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...sourceFiles(path))
    else if (CODE.test(entry.name) && !entry.name.includes('.test.')) found.push(path)
  }
  return found
}

/** Properties a file reads and cannot survive without. */
function requiredProperties(source: string): string[] {
  const required: string[] = []

  // var(--x) — but not var(--x, anything), which declares its own fallback.
  for (const m of source.matchAll(/var\(\s*(--[a-z0-9-]+)\s*([,)])/gi)) {
    if (m[2] === ')') required.push(m[1])
  }

  for (const m of source.matchAll(/getPropertyValue\(\s*['"`](--[a-z0-9-]+)['"`]/gi)) {
    required.push(m[1])
  }

  return required
}

describe('design tokens', () => {
  const defined = definedProperties(readFileSync(STYLESHEET, 'utf8'))
  const files = SCANNED.flatMap(d => sourceFiles(join(ROOT, d)))

  it('finds the stylesheet and something to check', () => {
    expect(defined.size).toBeGreaterThan(20)
    expect(files.length).toBeGreaterThan(20)
  })

  it('defines every custom property the code reads', () => {
    const missing: string[] = []

    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      for (const property of new Set(requiredProperties(source))) {
        if (!defined.has(property)) {
          missing.push(`${file.slice(ROOT.length + 1)} reads ${property}`)
        }
      }
    }

    expect(missing).toEqual([])
  })
})
