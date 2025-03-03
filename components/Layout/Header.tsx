/**
 * @file components/Layout/Header.tsx
 * @description
 * This component renders the header for the web app layout.
 * It now incorporates the custom mocha color palette for a modern, sleek, and minimalist design.
 * The header uses a dark mocha background with contrasting white text and updated button styles
 * for login/logout actions with smooth transitions.
 *
 * Key features:
 * - Uses mocha-dark as the header background.
 * - Applies a modern typography with increased spacing.
 * - Provides login/logout buttons styled with the mocha color palette and smooth transitions.
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
        <Link href="/">
          <a className="hover:text-mocha-light transition-colors duration-300">Proofreading App</a>
        </Link>
      </div>
      {/* Navigation controls */}
      <nav>
        {user ? (
          <button
            onClick={onLogout}
            className="bg-mocha hover:bg-mocha-light text-white px-4 py-2 rounded transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-mocha-light"
          >
            Logout
          </button>
        ) : (
          <Link href="/">
            <a className="bg-mocha hover:bg-mocha-light text-white px-4 py-2 rounded transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-mocha-light">
              Login
            </a>
          </Link>
        )}
      </nav>
    </header>
  );
};

export default Header;
