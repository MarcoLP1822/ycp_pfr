/**
 * @file pages/dashboard.tsx
 * @description
 * This file implements the Dashboard page for the Web Proofreading App.
 * It now integrates both the file upload and file listing functionalities.
 * The file listing is fetched from the `/api/files/list` endpoint on mount,
 * and the <FileList> component displays the list with options to rename, delete,
 * or proofread a file.
 * 
 * Key features:
 * - Fetches file metadata from the backend on component mount.
 * - Maintains a local state for the file list.
 * - Provides event handlers for renaming, deleting, and proofreading actions.
 * - Uses Next.js router for navigation to the proofreading interface.
 * 
 * @dependencies
 * - React: For component creation and state management.
 * - FileUpload: For handling file uploads.
 * - FileList: For displaying the list of uploaded files.
 * - Next.js useRouter: For navigating to the proofreading interface.
 * 
 * @notes
 * - The event handlers call the corresponding API endpoints.
 * - The file list is refreshed on mount, and can be updated via the handlers.
 * - Error handling is implemented via console error logs for simplicity.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import FileUpload from '../components/FileUpload';
import FileList, { FileData } from '../components/FileList';

const Dashboard: React.FC = () => {
  // State to hold the list of files fetched from the backend
  const [files, setFiles] = useState<FileData[]>([]);
  const router = useRouter();

  /**
   * Fetch the list of files from the backend.
   * This function calls the `/api/files/list` endpoint and updates the local state.
   */
  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files/list');
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      } else {
        console.error("Failed to fetch files list: ", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  // useEffect to fetch the file list on component mount
  useEffect(() => {
    fetchFiles();
  }, []);

  /**
   * Handle the renaming of a file.
   * Calls the `/api/files/manage` endpoint with a PUT request to update the file name.
   * Updates the local state upon success.
   *
   * @param fileId - The unique identifier of the file.
   * @param newName - The new name to assign to the file.
   */
  const handleRename = async (fileId: string, newName: string) => {
    try {
      const response = await fetch('/api/files/manage', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file_id: fileId, new_name: newName })
      });
      if (response.ok) {
        // Update local state with the new file name
        const updatedFiles = files.map(file =>
          file.file_id === fileId ? { ...file, file_name: newName } : file
        );
        setFiles(updatedFiles);
      } else {
        console.error("Failed to rename file:", response.statusText);
      }
    } catch (error) {
      console.error("Error renaming file:", error);
    }
  };

  /**
   * Handle the deletion of a file.
   * Calls the `/api/files/manage` endpoint with a DELETE request.
   * Removes the file from the local state upon success.
   *
   * @param fileId - The unique identifier of the file to delete.
   */
  const handleDelete = async (fileId: string) => {
    try {
      const response = await fetch('/api/files/manage', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file_id: fileId })
      });
      if (response.ok) {
        // Remove the file from local state after deletion
        const updatedFiles = files.filter(file => file.file_id !== fileId);
        setFiles(updatedFiles);
      } else {
        console.error("Failed to delete file:", response.statusText);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  /**
   * Handle the proofreading action.
   * This function now triggers the proofreading process by calling the `/api/proofreading/process`
   * endpoint. Once the process is successfully triggered, it navigates the user to the proofreading
   * detail page.
   *
   * @param fileId - The unique identifier of the file to proofread.
   */
  const handleProofread = async (fileId: string) => {
    try {
      // Trigger the proofreading process
      const response = await fetch('/api/proofreading/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ file_id: fileId })
      });
      if (!response.ok) {
        console.error('Proofreading process failed:', response.statusText);
        return;
      }
      // Optionally, you can show a loading indicator while proofreading is in progress.
      // For now, we navigate immediately after triggering the process.
      router.push(`/proofreading/${fileId}`);
    } catch (error) {
      console.error('Error triggering proofreading process:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="mb-8">
        <FileUpload />
      </div>
      <div>
        <h2 className="text-2xl font-semibold mb-4">Your Files</h2>
        <FileList 
          files={files} 
          onRename={handleRename} 
          onDelete={handleDelete} 
          onProofread={handleProofread}
        />
      </div>
    </div>
  );
};

export default Dashboard;
