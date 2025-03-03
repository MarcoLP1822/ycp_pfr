/**
 * @file pages/dashboard.tsx
 * @description
 * Dashboard page that integrates file upload, file listing, and version control.
 * Users can trigger renaming, deletion, proofreading, and view version history.
 * When viewing version history, the modal provides two rollback options.
 *
 * Enhancements:
 * - Wrapped the entire dashboard in MainLayout to display the header and sidebar.
 * - Passes user and onLogout to MainLayout for authentication controls in the header.
 *
 * Key features:
 * - File management (upload, rename, delete).
 * - Proofreading triggers that redirect to the dynamic proofreading interface.
 * - Version history modal with rollback functionality.
 *
 * @dependencies
 * - React for state management.
 * - Next.js router for navigation.
 * - FileUpload, FileList, and VersionControlModal components for UI.
 * - MainLayout for the header + sidebar layout.
 * - useSession and useSupabaseClient for user/session info and logout.
 *
 * @notes
 * - The rollback functions call the /api/files/rollback endpoint.
 * - The user must be logged in to access this page (enforced by middleware).
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';

import MainLayout from '../components/Layout/MainLayout';
import FileUpload from '../components/FileUpload';
import FileList, { FileData } from '../components/FileList';
import VersionControlModal, { Version } from '../components/VersionControlModal';

const Dashboard: React.FC = () => {
  const router = useRouter();
  const session = useSession();
  const supabase = useSupabaseClient();

  const [files, setFiles] = useState<FileData[]>([]);
  const [showVersionModal, setShowVersionModal] = useState<boolean>(false);
  const [versionModalFileId, setVersionModalFileId] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);

  /**
   * Logs the user out and redirects to the home page.
   */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  /**
   * Fetches the list of files from the server.
   */
  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files/list');
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      } else {
        console.error('Failed to fetch files list: ', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Renames a file by calling the /api/files/manage endpoint with method=PUT.
   * @param fileId - The ID of the file to rename.
   * @param newName - The new name for the file.
   */
  const handleRename = async (fileId: string, newName: string) => {
    try {
      const response = await fetch('/api/files/manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId, new_name: newName }),
      });
      if (response.ok) {
        setFiles((prev) =>
          prev.map((file) =>
            file.file_id === fileId ? { ...file, file_name: newName } : file
          )
        );
      } else {
        console.error('Failed to rename file:', response.statusText);
      }
    } catch (error) {
      console.error('Error renaming file:', error);
    }
  };

  /**
   * Deletes a file by calling the /api/files/manage endpoint with method=DELETE.
   * @param fileId - The ID of the file to delete.
   */
  const handleDelete = async (fileId: string) => {
    try {
      const response = await fetch('/api/files/manage', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId }),
      });
      if (response.ok) {
        setFiles((prev) => prev.filter((file) => file.file_id !== fileId));
      } else {
        console.error('Failed to delete file:', response.statusText);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  /**
   * Initiates the proofreading process for a file by calling /api/proofreading/process.
   * @param fileId - The ID of the file to proofread.
   */
  const handleProofread = async (fileId: string) => {
    try {
      const response = await fetch('/api/proofreading/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId }),
      });
      if (!response.ok) {
        console.error('Proofreading process failed:', response.statusText);
        return;
      }
      router.push(`/proofreading/${fileId}`);
    } catch (error) {
      console.error('Error triggering proofreading process:', error);
    }
  };

  /**
   * Fetches version history for a file and opens the VersionControlModal.
   * @param fileId - The ID of the file whose version history should be viewed.
   */
  const handleViewVersions = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/versions?fileId=${fileId}`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data);
        setVersionModalFileId(fileId);
        setShowVersionModal(true);
      } else {
        console.error('Failed to fetch version history:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching version history:', error);
    }
  };

  /**
   * Rolls back the file to the previous version by calling /api/files/rollback with rollbackType='previous'.
   * @param versionId - The ID of the version (unused in this default logic, but included if needed).
   */
  const handleRollbackVersion = async (versionId: string) => {
    if (!versionModalFileId) return;
    try {
      const response = await fetch('/api/files/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: versionModalFileId, rollbackType: 'previous' }),
      });
      if (!response.ok) {
        const errBody = await response.json();
        throw new Error(errBody.error || 'Rollback failed');
      }
      const { updatedFile } = await response.json();
      alert('Rollback to previous version successful!');
      setFiles((prev) =>
        prev.map((f) => (f.file_id === updatedFile.file_id ? updatedFile : f))
      );
      setShowVersionModal(false);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  /**
   * Rolls back the file to its original text by calling /api/files/rollback with rollbackType='original'.
   */
  const handleRollbackOriginal = async () => {
    if (!versionModalFileId) return;
    try {
      const response = await fetch('/api/files/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: versionModalFileId, rollbackType: 'original' }),
      });
      if (!response.ok) {
        const errBody = await response.json();
        throw new Error(errBody.error || 'Rollback failed');
      }
      const { updatedFile } = await response.json();
      alert('Rollback to original text successful!');
      setFiles((prev) =>
        prev.map((f) => (f.file_id === updatedFile.file_id ? updatedFile : f))
      );
      setShowVersionModal(false);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  /**
   * Closes the version control modal.
   */
  const handleCloseModal = () => {
    setShowVersionModal(false);
    setVersionModalFileId(null);
    setVersions([]);
  };

  return (
    <MainLayout user={session?.user} onLogout={handleLogout}>
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 md:p-8 transition-all duration-300">
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
            onViewVersions={handleViewVersions}
          />
        </div>
        {showVersionModal && versionModalFileId && (
          <VersionControlModal
            isOpen={showVersionModal}
            versions={versions}
            onClose={handleCloseModal}
            onRollbackVersion={handleRollbackVersion}
            onRollbackOriginal={handleRollbackOriginal}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard;
