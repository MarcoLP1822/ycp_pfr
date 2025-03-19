// webapp/pages/_app.tsx
import { useState } from 'react';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import theme from '../styles/theme';
import MainLayout from '../components/Layout/MainLayout';

export default function MyApp({ Component, pageProps }: AppProps) {
  const [supabaseClient] = useState(() => createPagesBrowserClient());
  const router = useRouter();
  const noLayoutNeeded = ['/', '/register'];
  const isNoLayoutRoute = noLayoutNeeded.includes(router.pathname);

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {isNoLayoutRoute ? (
          <Component {...pageProps} />
        ) : (
          <MainLayout>
            <Component {...pageProps} />
          </MainLayout>
        )}
      </ThemeProvider>
    </SessionContextProvider>
  );
}
