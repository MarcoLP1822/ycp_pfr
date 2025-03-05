/**
 * @file pages/_app.tsx
 * @description
 * This file is the custom App component for Next.js. We integrate:
 * - Supabase authentication context
 * - Material UI ThemeProvider for Material Design
 * - Global CSS
 * - Conditional layout usage (if the path is '/' or '/register', skip layout)
 *
 * Key features:
 * - Wraps the entire application in SessionContextProvider for Supabase
 * - Wraps the entire application in ThemeProvider for Material UI theming
 * - Applies Material UI baseline styles via <CssBaseline />
 * - Conditionally wraps pages in <MainLayout> except for login or registration
 *
 * @dependencies
 * - @supabase/auth-helpers-nextjs: For creating the Supabase client
 * - @supabase/auth-helpers-react: For the SessionContextProvider
 * - @mui/material/styles: For the ThemeProvider
 * - @mui/material/CssBaseline: For resetting default browser styles
 * - React & Next.js: For the application framework
 *
 * @notes
 * - Make sure you have installed @mui/material, @emotion/react, and @emotion/styled
 * - Adjust the conditional logic if you have other routes that should skip the sidebar
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import type { AppProps } from 'next/app';
import type { Session } from '@supabase/auth-helpers-react';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import '../styles/global.css'; // Tailwind/global CSS if you still want it
import theme from '../../styles/theme'; // Custom Material UI theme
import MainLayout from '../components/Layout/MainLayout';

function MyApp({ Component, pageProps }: AppProps<{ initialSession: Session }>) {
  // Create the Supabase client once
  const [supabaseClient] = useState(() => createPagesBrowserClient());

  const router = useRouter();
  const noLayoutNeeded = ['/', '/register']; // Add routes here that should NOT have the sidebar

  // If the current route is in noLayoutNeeded, skip the MainLayout
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

export default MyApp;
