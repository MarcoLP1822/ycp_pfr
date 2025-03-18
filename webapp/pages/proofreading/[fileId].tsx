/**
 * @file pages/proofreading/[fileId].tsx
 * @description
 * Questa pagina dinamica permette all'utente di visualizzare e interagire con l'interfaccia
 * di proofreading per un file specifico. Mostra il testo originale e quello corretto (con le revisioni evidenziate)
 * e permette di scaricare il file DOCX corretto.
 *
 * Modifiche apportate:
 * - Aggiunta del componente JobStatus per il monitoraggio in tempo reale dello stato del job.
 *
 * @dependencies
 * - React per la gestione dello stato e del rendering.
 * - Next.js Router per la gestione delle rotte dinamiche.
 * - Material UI per i componenti UI.
 * - CorrectionControls per l'accettazione delle correzioni.
 * - JobStatus per il monitoraggio dello stato dei job.
 *
 * @notes
 * - La funzione stripHtml rimuove eventuali tag HTML dal testo corretto prima di inviarlo al microservizio.
 * - La gestione del download utilizza un blob per forzare il salvataggio del file DOCX.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Container, Typography, Box, Button, Alert } from '@mui/material';
import { highlightDifferences } from '../../services/diffHighlighter';
import JobStatus from '../../components/JobStatus';

export interface ProofreadingData {
  originalText: string;
  correctedText: string;
  versionNumber?: number;
}

// Helper function to strip HTML tags from a string.
const stripHtml = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

const ProofreadingInterfacePage: React.FC = () => {
  const router = useRouter();
  const { fileId } = router.query;

  const [data, setData] = useState<ProofreadingData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  // editMode: false means read-only, true means editing plain text.
  const [editMode, setEditMode] = useState<boolean>(false);
  // editedText holds the plain text version for editing.
  const [editedText, setEditedText] = useState<string>('');
  // State per la gestione del download
  const [downloadLoading, setDownloadLoading] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string>('');

  useEffect(() => {
    if (!fileId) return;
    const fetchProofreadingData = async () => {
      try {
        const response = await fetch(`/api/proofreading/details?fileId=${fileId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch proofreading details.');
        }
        const result = await response.json();
        setData(result);
        setEditedText(stripHtml(result.correctedText));
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Error fetching proofreading data.');
        setLoading(false);
      }
    };
    fetchProofreadingData();
  }, [fileId]);

  const toggleEditMode = () => {
    if (editMode && data) {
      const newHighlighted = highlightDifferences(data.originalText, editedText);
      setData({ ...data, correctedText: newHighlighted });
    }
    setEditMode((prev) => !prev);
  };

  // Handler per scaricare il file DOCX tramite il microservizio.
  const handleDownload = async () => {
    if (!fileId || typeof fileId !== 'string' || !data) return;
    setDownloadLoading(true);
    setDownloadError('');
    try {
      const plainCorrectedText = stripHtml(data.correctedText);
      const response = await fetch('/api/proofreading/merge-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId, correctedText: plainCorrectedText })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to merge DOCX.');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'proofread.docx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setDownloadError(err.message || 'Error downloading DOCX.');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Handler per avviare il processo di proofreading (ri-esegue il processo AI).
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

  // Handler per visualizzare la cronologia delle versioni.
  const handleViewVersions = async (fileId: string) => {
    // Implementazione esistente...
  };

  if (loading) {
    return (
      <Container style={{ minHeight: '100vh', padding: '2rem' }}>
        <Typography>Loading proofreading data...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container style={{ minHeight: '100vh', padding: '2rem' }}>
        <Typography style={{ color: 'red' }}>{error}</Typography>
      </Container>
    );
  }

  return (
    <Container style={{ minHeight: '100vh', padding: '2rem' }}>
      <Typography variant="h4" style={{ marginBottom: '1rem' }}>
        Proofreading Interface
      </Typography>
      <Box style={{ marginBottom: '1rem' }}>
        <Typography>File ID: {fileId}</Typography>
        {data?.versionNumber && <Typography>Current Version: {data.versionNumber}</Typography>}
      </Box>
      {/* New JobStatus component to monitor the live status of the job */}
      {fileId && typeof fileId === 'string' && <JobStatus fileId={fileId} />}
      <Link
        href="/dashboard"
        style={{
          marginBottom: '2rem',
          display: 'inline-block',
          textDecoration: 'underline',
          color: '#333',
        }}
      >
        Back to Dashboard
      </Link>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginTop: '1rem',
        }}
      >
        {/* Original Text Panel */}
        <div style={{ border: '1px solid #ccc', padding: '1rem' }}>
          <Typography variant="h6">Original Text</Typography>
          <textarea
            readOnly
            style={{ width: '100%', height: '400px', marginTop: '0.5rem' }}
            value={data?.originalText || ''}
          />
        </div>
        {/* Corrected Text Panel */}
        <div style={{ border: '1px solid #ccc', padding: '1rem' }}>
          <Typography variant="h6">Corrected Text</Typography>
          {editMode ? (
            <textarea
              style={{
                width: '100%',
                height: '400px',
                marginTop: '0.5rem',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
              }}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '400px',
                marginTop: '0.5rem',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
              }}
              dangerouslySetInnerHTML={{ __html: data?.correctedText || '' }}
            />
          )}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <Button
              onClick={toggleEditMode}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {editMode ? 'Save Changes' : 'Modifica'}
            </Button>
            <Button
              onClick={handleProofread.bind(null, fileId as string)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#388e3c',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Re-proofread
            </Button>
            <Button
              onClick={handleDownload}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: downloadLoading ? '#ccc' : '#5e35b1',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: downloadLoading ? 'not-allowed' : 'pointer',
              }}
              disabled={downloadLoading}
            >
              {downloadLoading ? 'Downloading...' : 'Download DOCX'}
            </Button>
          </div>
          {downloadError && (
            <Box mt={2}>
              <Alert severity="error">{downloadError}</Alert>
            </Box>
          )}
        </div>
      </div>
    </Container>
  );
};

export default ProofreadingInterfacePage;
