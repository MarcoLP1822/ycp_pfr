/**
 * @file components/Layout/MainLayout.tsx
 * @description
 * This component provides the overall layout structure for the application.
 * It includes a header at the top, a sidebar for navigation, and a main content area for page-specific content.
 * 
 * Key features:
 * - Wraps page content with a consistent layout.
 * - Integrates the Header and Sidebar components.
 * - Uses Tailwind CSS for responsive design and styling.
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
    <div className="flex flex-col min-h-screen">
      {/* Top header */}
      <Header user={user} onLogout={onLogout} />
      {/* Layout with sidebar and main content */}
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
