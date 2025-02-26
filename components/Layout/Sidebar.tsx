/**
 * @file components/Layout/Sidebar.tsx
 * @description
 * This component renders a sidebar for the application.
 * It provides navigation links for quick access to key pages such as the Dashboard and Proofreading.
 * 
 * Key features:
 * - Displays a vertical navigation menu using Tailwind CSS.
 * - Contains links that guide the user to different parts of the application.
 * 
 * @dependencies
 * - React: For component creation.
 * - Next.js Link: For client-side navigation.
 * 
 * @notes
 * - You can add additional navigation links as needed.
 */

import React from 'react';
import Link from 'next/link';

const Sidebar: React.FC = () => {
  return (
    <aside className="bg-gray-200 w-64 min-h-screen p-4">
      <nav className="space-y-4">
        <Link href="/dashboard">
          <a className="block text-gray-700 hover:text-blue-500">Dashboard</a>
        </Link>
        <Link href="/proofreading">
          <a className="block text-gray-700 hover:text-blue-500">Proofreading</a>
        </Link>
        {/* Future navigation links can be added here */}
      </nav>
    </aside>
  );
};

export default Sidebar;
