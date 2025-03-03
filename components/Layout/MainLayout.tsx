/**
 * @file components/Layout/MainLayout.tsx
 * @description
 * This component provides the overall layout structure for the application.
 * It includes a header at the top, a sidebar for navigation, and a main content area
 * that has been refined to ensure consistency with the updated Header and Sidebar styles.
 * The layout now uses increased padding to provide ample white space and adheres to a
 * modern, minimalist design aesthetic.
 *
 * Key features:
 * - Incorporates a top header with updated branding and authentication controls.
 * - Provides a responsive sidebar that aligns with the mocha color palette.
 * - Uses a centered container with increased padding for the main content.
 *
 * @dependencies
 * - React: For component creation.
 * - Header: Displays the top navigation bar.
 * - Sidebar: Provides navigation links on the side.
 *
 * @notes
 * - This layout is intended as a wrapper for pages requiring the full application layout.
 * - Adjustments have been made to padding and background colors to enhance the minimalist design.
 */

import React from 'react';
import Header, { HeaderProps } from './Header';
import Sidebar from './Sidebar';

export interface MainLayoutProps extends HeaderProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, user, onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Header */}
      <Header user={user} onLogout={onLogout} />
      {/* Main layout container with sidebar and content */}
      <div className="flex flex-1">
        {/* Sidebar for navigation */}
        <Sidebar />
        {/* Main content area with increased padding for ample white space */}
        <main className="flex-1 p-10 bg-white">
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
