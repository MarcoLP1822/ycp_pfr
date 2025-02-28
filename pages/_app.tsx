// pages/_app.tsx
import { useState } from 'react'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import type { AppProps } from 'next/app'
import type { Session } from '@supabase/auth-helpers-react'

import '../styles/global.css' // se usi Tailwind e altre global CSS

function MyApp({ Component, pageProps }: AppProps<{ initialSession: Session }>) {
  // Creiamo il client di Supabase una sola volta
  const [supabaseClient] = useState(() => createPagesBrowserClient());

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <Component {...pageProps} />
    </SessionContextProvider>
  )
}

export default MyApp
