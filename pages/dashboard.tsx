/**
 * @file pages/dashboard.tsx
 * @description
 * This file implements the Dashboard page for the Web Proofreading App.
 * It currently incorporates the FileUpload component to allow users to
 * upload documents for proofreading. The dashboard serves as the central
 * location for file management and will eventually include additional features
 * such as file listing, renaming, and deletion.
 * 
 * Key features:
 * - Integration of the FileUpload component.
 * - Responsive layout using Tailwind CSS.
 * 
 * @dependencies
 * - React: For component creation.
 * - FileUpload Component: For handling file uploads.
 * 
 * @notes
 * - Further dashboard functionalities can be added in this file as needed.
 */

import React from 'react';
import FileUpload from '../components/FileUpload';

const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="mb-8">
        <FileUpload />
      </div>
      {/* Future enhancements: Add file listing, renaming, deletion, and proofreading initiation controls here */}
    </div>
  );
};

export default Dashboard;
