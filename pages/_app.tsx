/**
 * @description
 * Custom App component for initializing pages.
 * Imports global styles and wraps each page component.
 *
 * @dependencies
 * - Next.js: Provides the AppProps type and component rendering.
 *
 * @notes
 * - This file ensures that global CSS is applied across all pages.
 * - Modify this file to add global providers if necessary (e.g., context, state management).
 */
import React from 'react';
import '../styles/global.css'
import type { AppProps } from 'next/app'

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

export default MyApp