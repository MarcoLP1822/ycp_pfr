/**
 * @file components/Layout/MainLayout.tsx
 * @description
 * This component provides the overall layout structure for the application.
 * It includes a header at the top, a sidebar for navigation, and a main content area for page-specific content.
 * The layout has been refined to ensure consistency with the updated Header and Sidebar styles,
 * providing ample white space and a modern, minimalist aesthetic.
 *
 * Key features:
 * - Uses a light background for a clean look.
 * - Provides increased padding and a centered content container for improved readability.
 * - Integrates the Header and Sidebar components seamlessly.
 *
 * @dependencies
 * - React: For component creation.
 * - Header: Displays the top navigation bar.
 * - Sidebar: Provides navigation links on the side.
 *
 * @notes
 * - Accepts optional user and onLogout props to pass down to the Header.
 * - This layout should be used as a wrapper in pages that require the full application layout.
 */

import React from 'react';
import Header, { HeaderProps } from './Header';
import Sidebar from './Sidebar';

export interface MainLayoutProps extends HeaderProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, user, onLogout }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top Header */}
      <Header user={user} onLogout={onLogout} />
      {/* Layout with sidebar and main content */}
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-8 bg-white">
          {/* Centered container for consistent content width */}
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
