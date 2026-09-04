'use client'

import { createContext, useContext, type ReactNode } from 'react'

/**
 * The app chrome, handed down to whoever is laying out an immersive page.
 *
 * AppShell owns these three controls -- it is the only thing that knows the
 * signed-in user, the workspace and the navigation for their role. But on a
 * page built like the Atlas they do not belong floating over the picture in
 * detached cards; they belong at the top of the panel, with the rest of the
 * page's own chrome.
 *
 * Passing them through a context rather than as props keeps AppShell from
 * having to know anything about the layout underneath it, and keeps the page
 * from having to re-derive a user it was never given.
 *
 * Null outside the cooperative app. The public garden renders the same shell
 * with no account and no navigation, and reads null here rather than being a
 * different component.
 */
export type ImmersiveChrome = {
  /** The workspace card: logo, cooperative name, where it is. */
  workspace: ReactNode
  /** Navigation between the app's sections. */
  nav: ReactNode
  /** The account menu. */
  account: ReactNode
}

const ImmersiveChromeContext = createContext<ImmersiveChrome | null>(null)

export function ImmersiveChromeProvider({
  value, children,
}: {
  value: ImmersiveChrome
  children: ReactNode
}) {
  return (
    <ImmersiveChromeContext.Provider value={value}>
      {children}
    </ImmersiveChromeContext.Provider>
  )
}

/** The chrome to place in this page's panel, or null on a public page. */
export function useImmersiveChrome(): ImmersiveChrome | null {
  return useContext(ImmersiveChromeContext)
}
