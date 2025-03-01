/**
 * @file pages/dashboard.tsx
 * @description
 * Dashboard page that integrates file upload, file listing, and version control.
 * The file list is fetched from the backend and displayed via <FileList>.
 * Users can trigger renaming, deletion, proofreading, and view version history.
 * When viewing version history, the modal provides two rollback options:
 * one for rolling back to a specific version and one to revert to the original text.
 *
 * @dependencies
 * - React for state management.
 * - Next.js router for navigation.
 * - FileUpload, FileList, and VersionControlModal components.
 *
 * @notes
 * - The rollback functions call the new /api/files/rollback endpoint.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import FileUpload from '../components/FileUpload';
import FileList, { FileData } from '../components/FileList';
import VersionControlModal, { Version } from '../components/VersionControlModal';

const Dashboard: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const router = useRouter();

  // State for version control modal
  const [showVersionModal, setShowVersionModal] = useState<boolean>(false);
  const [versionModalFileId, setVersionModalFileId] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);

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

  useEffect(() => {
    fetchFiles();
  }, []);

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
        console.error("Failed to rename file:", response.statusText);
      }
    } catch (error) {
      console.error("Error renaming file:", error);
    }
  };

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
        console.error("Failed to delete file:", response.statusText);
      }
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

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

  // When a file's "Version History" button is clicked.
  const handleViewVersions = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/versions?fileId=${fileId}`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data);
        setVersionModalFileId(fileId);
        setShowVersionModal(true);
      } else {
        console.error("Failed to fetch version history:", response.statusText);
      }
    } catch (error) {
      console.error("Error fetching version history:", error);
    }
  };

  // Callback to rollback to a specific version.
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

  // Callback to rollback to the original text.
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

  const handleCloseModal = () => {
    setShowVersionModal(false);
    setVersionModalFileId(null);
    setVersions([]);
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
  );
};

export default Dashboard;
