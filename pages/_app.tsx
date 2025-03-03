/**
 * @file pages/_app.tsx
 * @description
 * This file is the custom App component in Next.js. It wraps all pages in a global layout,
 * ensuring the sidebar and header appear on every page. It also provides the Supabase session context
 * so that user authentication and session data can be accessed throughout the app.
 *
 * Key features:
 * - Wraps all pages in <MainLayout>, adding the header and sidebar globally.
 * - Manages user session with Supabase Auth Helpers.
 * - Provides a global logout handler that signs the user out and redirects to the home page.
 *
 * @dependencies
 * - Next.js: For the custom App component and router.
 * - Supabase Auth Helpers: For session handling.
 * - MainLayout: For displaying the global header and sidebar.
 * - React: For hooks and state management.
 *
 * @notes
 * - If you have pages that should NOT display the sidebar, you'll need to conditionally render
 *   <MainLayout> based on the current route. Currently, we display the sidebar on all pages.
 * - The environment variables for Supabase are taken from your .env.* files or hosting environment.
 */

import { useState } from 'react';
import { useRouter } from 'next/router';
import type { AppProps } from 'next/app';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider, useSession } from '@supabase/auth-helpers-react';
import type { Session } from '@supabase/auth-helpers-react';

import MainLayout from '../components/Layout/MainLayout';
import '../styles/global.css';

function MyApp({ Component, pageProps }: AppProps<{ initialSession: Session }>) {
  // Create the Supabase client once per app load
  const [supabaseClient] = useState(() => createPagesBrowserClient());

  // Access the current user session
  const session = useSession();
  const router = useRouter();

  /**
   * Logs the user out via Supabase and redirects to the home page.
   */
  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.push('/');
  };

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      {/* 
        Wrap every page in the MainLayout so the sidebar and header
        are shown on every route. We pass user + onLogout to the header.
      */}
      <MainLayout user={session?.user} onLogout={handleLogout}>
        <Component {...pageProps} />
      </MainLayout>
    </SessionContextProvider>
  );
}

export default MyApp;
