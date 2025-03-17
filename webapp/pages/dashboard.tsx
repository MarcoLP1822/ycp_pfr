import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Typography,
  Box,
  LinearProgress,
  Alert
} from '@mui/material';
import FileUpload from '../components/FileUpload';
import FileList, { FileData } from '../components/FileList';
import VersionControlModal, { Version } from '../components/VersionControlModal';

const Dashboard: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionModalFileId, setVersionModalFileId] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  // Stato per gestire il file in proofreading e l'AbortController
  const [proofreadingFileId, setProofreadingFileId] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  // Stato per mostrare eventuali errori durante il processo
  const [proofreadingError, setProofreadingError] = useState<string>('');
  const router = useRouter();

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

  useEffect(() => {
    fetchFiles();
  }, []);

  // Quando viene caricato un nuovo file, lo aggiungiamo alla lista
  const handleFileUploaded = (newFile: FileData) => {
    setFiles((prev) => [newFile, ...prev]);
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

  // Gestione del processo di proofreading con invio sequenziale
  const handleProofread = async (fileId: string) => {
    setProofreadingError('');
    // Se il file è già in proofreading, annulla la richiesta
    if (proofreadingFileId === fileId && abortController) {
      abortController.abort();
      setProofreadingFileId(null);
      setAbortController(null);
      return;
    }
    // Altrimenti, avvia il processo e salva il controller
    const controller = new AbortController();
    setProofreadingFileId(fileId);
    setAbortController(controller);
    try {
      const response = await fetch('/api/proofreading/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Proofreading process failed.');
      }
      // Una volta completato il processo, reindirizza alla pagina di proofreading
      router.push(`/proofreading/${fileId}`);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Proofreading process was cancelled.');
      } else {
        console.error('Error triggering proofreading process:', error);
        setProofreadingError(error.message);
      }
    } finally {
      setProofreadingFileId(null);
      setAbortController(null);
    }
  };

  const handleViewCurrentVersion = (fileId: string) => {
    router.push(`/proofreading/${fileId}`);
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

      <FileUpload onFileUploaded={handleFileUploaded} />

      {/* Se un file è in proofreading, mostriamo un indicatore di progresso */}
      {proofreadingFileId && (
        <Box sx={{ my: 2 }}>
          <Alert severity="info">Elaborazione in corso per il file {proofreadingFileId}... attendere.</Alert>
          <LinearProgress />
        </Box>
      )}
      {proofreadingError && (
        <Box sx={{ my: 2 }}>
          <Alert severity="error">{proofreadingError}</Alert>
        </Box>
      )}

      <Box mt={4}>
        <Typography variant="h5" gutterBottom>
          Your Files
        </Typography>
        <FileList
          files={files}
          onRename={handleRename}
          onDelete={handleDelete}
          onProofread={handleProofread}
          onViewCurrent={handleViewCurrentVersion}
          onViewVersions={handleViewVersions}
          proofreadingFileId={proofreadingFileId}
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
