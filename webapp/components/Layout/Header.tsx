/**
 * @file components/Layout/Header.tsx
 * @description
 * This component renders the header for the web app layout.
 * It incorporates the custom mocha color palette and a modern, sleek, minimalist design.
 * Accessibility enhancements include explicit aria-labels on interactive elements.
 *
 * Key features:
 * - Uses mocha-dark as the header background.
 * - Improved keyboard accessibility with focus rings.
 * - Explicit aria-labels for login/logout actions and navigation.
 *
 * @dependencies
 * - React: For creating the component.
 * - Next.js Link: For client-side navigation.
 *
 * @notes
 * - Ensure that the Tailwind configuration includes the mocha color palette.
 * - The header is responsive and its layout remains minimalistic across devices.
 */

import React from 'react';
import Link from 'next/link';

export interface HeaderProps {
  user?: any; // Replace 'any' with a proper user type based on your authentication model
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-mocha-dark text-white flex justify-between items-center px-6 py-4 shadow-md">
      {/* Application branding */}
      <div className="text-2xl font-bold">
        <Link
          href="/"
          className="hover:text-mocha-light transition-colors duration-300"
          aria-label="Go to Home"
        >
          Proofreading App
        </Link>
      </div>
      {/* Navigation controls */}
      <nav aria-label="Main Navigation">
        {user ? (
          <button
            onClick={onLogout}
            className="bg-mocha hover:bg-mocha-light text-white px-4 py-2 rounded transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-mocha-light"
            aria-label="Logout"
          >
            Logout
          </button>
        ) : (
          <Link
            href="/"
            className="bg-mocha hover:bg-mocha-light text-white px-4 py-2 rounded transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-mocha-light"
            aria-label="Login"
          >
            Login
          </Link>
        )}
      </nav>
    </header>
  );
};

export default Header;
