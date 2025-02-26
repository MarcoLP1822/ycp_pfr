/**
 * @file components/Layout/Header.tsx
 * @description
 * This component renders the header for the web app layout.
 * It displays the application branding and provides navigation controls,
 * such as a login link or a logout button if the user is authenticated.
 * 
 * Key features:
 * - Displays the app logo/name as a clickable link.
 * - Shows a login button when the user is not authenticated.
 * - Shows a logout button when the user is authenticated.
 * 
 * @dependencies
 * - React: For creating the component.
 * - Next.js Link: For navigation between pages.
 * 
 * @notes
 * - The component accepts optional props for user information and a logout handler.
 * - In a full implementation, the authentication state would be managed by context or a global state manager.
 */

import React from 'react';
import Link from 'next/link';

export interface HeaderProps {
  user?: any; // Replace 'any' with a proper user type based on your authentication model
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-gray-800 text-white flex justify-between items-center p-4">
      {/* Application branding */}
      <div className="text-xl font-bold">
        <Link href="/">
          <a>Proofreading App</a>
        </Link>
      </div>
      {/* Navigation controls */}
      <nav>
        {user ? (
          <button
            onClick={onLogout}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
          >
            Logout
          </button>
        ) : (
          <Link href="/">
            <a className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors">
              Login
            </a>
          </Link>
        )}
      </nav>
    </header>
  );
};

export default Header;
