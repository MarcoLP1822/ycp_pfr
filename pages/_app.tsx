// pages/_app.tsx
import type { AppProps } from 'next/app'
import { useState } from 'react'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { Session } from '@supabase/auth-helpers-react'

export default function MyApp({ Component, pageProps }: AppProps<{
  initialSession: Session
}>) {
  // Crea il client Supabase una sola volta (stato persistente)
  const [supabaseClient] = useState(() => createBrowserSupabaseClient())

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <Component {...pageProps} />
    </SessionContextProvider>
  )
}
