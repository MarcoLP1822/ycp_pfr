/**
 * @file components/Layout/Sidebar.tsx
 * @description
 * This component renders a collapsible sidebar for the application.
 * It provides a navigation menu that is responsive and uses the mocha color palette,
 * aligning with a modern, sleek, and minimalist design.
 * Accessibility enhancements include explicit aria-labels for navigation.
 *
 * Key features:
 * - Collapsible menu on mobile devices with smooth transitions.
 * - Responsive design using Tailwind CSS breakpoints.
 * - Uses mocha-light for the sidebar background and mocha-dark for text.
 * - Hover effects for navigation links with transition animations.
 *
 * @dependencies
 * - React: For state management and rendering.
 * - Next.js Link: For client-side navigation.
 *
 * @notes
 * - The toggle button is only visible on mobile (using md:hidden).
 * - The sidebar is fixed on mobile to overlay content and relative on desktop.
 */

import React, { useState } from 'react';
import Link from 'next/link';

const Sidebar: React.FC = () => {
  // State to track whether the sidebar is collapsed on mobile devices
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div>
      {/* Toggle button for mobile devices */}
      <button
        className="md:hidden p-2 bg-mocha text-white rounded focus:outline-none focus:ring-2 focus:ring-mocha-light"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-label="Toggle Navigation Menu"
      >
        {/* Simple hamburger icon using SVG */}
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Sidebar navigation panel */}
      <aside
        className={`bg-mocha-light text-mocha-dark w-64 min-h-screen p-4 transition-transform transform 
                    ${isCollapsed ? '-translate-x-full' : 'translate-x-0'} 
                    md:translate-x-0 md:block fixed md:relative z-50`}
      >
        <nav className="space-y-4" aria-label="Sidebar Navigation">
          <Link
            href="/dashboard"
            className="block px-2 py-1 hover:bg-mocha hover:text-white rounded transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/proofreading"
            className="block px-2 py-1 hover:bg-mocha hover:text-white rounded transition-colors"
          >
            Proofreading
          </Link>
          {/* Future navigation links can be added here */}
        </nav>
      </aside>
    </div>
  );
};

export default Sidebar;
