/**
 * Terminal prompts shared by the operator scripts.
 *
 * Both `pnpm seed` and `pnpm register` read credentials from whoever is sitting
 * at the terminal, and getting that right is fiddlier than it looks — hence one
 * copy rather than two that drift.
 *
 * The awkward part is that a terminal and a pipe need genuinely different code.
 * At a terminal a password is read keystroke by keystroke so it never appears on
 * screen. On piped input there is nothing to hide from, and Node's readline
 * resolves only the FIRST question() on a stream that has already ended, so
 * asking twice would hang forever — piped input is therefore read in one go and
 * split into lines.
 */

import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

/** Ctrl-C and the DEL byte most terminals send for backspace. Named rather than
 *  written as literals, because a raw control byte in source survives neither a
 *  copy-paste nor most editors. */
const CTRL_C = '\u0003'
const BACKSPACE = '\u007f'

/** Lines of piped stdin, read once and handed out in order. */
let pipedLines: string[] | null = null
let pipedIndex = 0

// Read all of a non-interactive stdin, so repeated prompts can be served from it.
async function readPipedLines(): Promise<string[]> {
  if (pipedLines) return pipedLines
  const chunks: Buffer[] = []
  for await (const chunk of stdin) chunks.push(chunk as Buffer)
  pipedLines = Buffer.concat(chunks).toString('utf8').split('\n')
  return pipedLines
}

// The next piped line, or an empty string once they run out.
async function nextPipedLine(): Promise<string> {
  const lines = await readPipedLines()
  return (lines[pipedIndex++] ?? '').trim()
}

/** A visible prompt: the answer is echoed as it is typed. */
export async function ask(prompt: string): Promise<string> {
  if (!stdin.isTTY) return nextPipedLine()

  const rl = createInterface({ input: stdin, output: stdout })
  const value = await rl.question(prompt)
  rl.close()
  return value.trim()
}

/**
 * A prompt whose answer is not echoed.
 *
 * The resume() at the bottom is load-bearing. Every ask() above ends in
 * rl.close(), and readline's close() calls input.pause() on stdin. Node only
 * auto-resumes a stream on a new 'data' listener when it was not EXPLICITLY
 * paused, so without the resume this listener is wired to a stream that never
 * flows: no keystroke arrives, the promise never settles, the event loop
 * empties, and node exits 0 with the prompt still on screen and nothing saved.
 */
export async function askHidden(prompt: string): Promise<string> {
  if (!stdin.isTTY) return nextPipedLine()

  stdout.write(prompt)
  const wasRaw = stdin.isRaw
  stdin.setRawMode(true)

  return new Promise<string>(resolve => {
    let value = ''
    const onData = (chunk: Buffer) => {
      // A typed key arrives as its own chunk, but a PASTE arrives as one chunk
      // of many characters. Comparing the whole chunk against '\n' would never
      // match a pasted password, so walk it character by character instead.
      for (const char of chunk.toString('utf8')) {
        // Enter ends the line; Ctrl-C aborts; backspace deletes.
        if (char === '\n' || char === '\r') {
          stdin.off('data', onData)
          stdin.setRawMode(wasRaw)
          stdin.pause()          // hand stdin back the way ask() leaves it
          stdout.write('\n')
          resolve(value)
          return
        }
        if (char === CTRL_C) {
          stdout.write('\n')
          process.exit(130)
        }
        if (char === BACKSPACE || char === '\b') {
          value = value.slice(0, -1)
          continue
        }
        value += char
      }
    }
    stdin.on('data', onData)
    stdin.resume()
  })
}

/** A yes/no gate in front of something consequential. Anything but y is no. */
export async function confirm(prompt: string): Promise<boolean> {
  const answer = await ask(`${prompt} [y/N] `)
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes'
}

/** One of a fixed set of options, asked until the answer is one of them. */
export async function askChoice<T extends string>(
  prompt: string, choices: readonly T[],
): Promise<T> {
  for (;;) {
    const answer = (await ask(`${prompt} (${choices.join('/')}): `)).toLowerCase()
    const match = choices.find(c => c.toLowerCase() === answer)
    if (match) return match
    // A piped script cannot correct itself, so a bad value there is fatal
    // rather than an endless loop.
    if (!stdin.isTTY) throw new Error(`Expected one of ${choices.join(', ')}, got "${answer}"`)
    console.log(`  Please answer with one of: ${choices.join(', ')}`)
  }
}

/** An email and a password, the password never echoed at a terminal. */
export async function askCredentials(): Promise<{ email: string; password: string }> {
  const email = await ask('Email:    ')
  const password = await askHidden('Password: ')
  return { email, password }
}
