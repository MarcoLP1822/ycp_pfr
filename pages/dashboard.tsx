/**
 * @file pages/dashboard.tsx
 * @description
 * Dashboard page that integrates file upload, file listing, and version control.
 * Uses Material UI for a consistent design. 
 *
 * Key changes:
 * - Added `handleFileUploaded` to update `files` state when a file is successfully uploaded.
 * - Pass `onFileUploaded` to <FileUpload> so new files appear without a page refresh.
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Typography,
  Box,
} from '@mui/material';
import FileUpload from '../components/FileUpload';
import FileList, { FileData } from '../components/FileList';
import VersionControlModal, { Version } from '../components/VersionControlModal';

const Dashboard: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionModalFileId, setVersionModalFileId] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const router = useRouter();

  // Fetch all files
  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files/list');
      if (response.ok) {
        const data = await response.json();
        setFiles(data);
      } else {
        console.error('Failed to fetch files list:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  };

  // Called after component mounts
  useEffect(() => {
    fetchFiles();
  }, []);

  // Called by FileUpload after a file is successfully uploaded
  const handleFileUploaded = (newFile: FileData) => {
    // Option 1: Append new file to the existing array
    setFiles((prev) => [newFile, ...prev]);

    // Option 2 (alternative): Re-fetch all files to ensure the list is up to date
    // fetchFiles();
  };

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
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/*
        Pass our handleFileUploaded callback to FileUpload so it can
        notify us of the newly created file object.
      */}
      <FileUpload onFileUploaded={handleFileUploaded} />

      <Box mt={4}>
        <Typography variant="h5" gutterBottom>
          Your Files
        </Typography>
        <FileList
          files={files}
          onRename={handleRename}
          onDelete={handleDelete}
          onProofread={handleProofread}
          onViewVersions={handleViewVersions}
        />
      </Box>

      <VersionControlModal
        isOpen={showVersionModal}
        versions={versions}
        onClose={handleCloseModal}
        onRollbackVersion={handleRollbackVersion}
        onRollbackOriginal={handleRollbackOriginal}
      />
    </Container>
  );
};

export default Dashboard;
