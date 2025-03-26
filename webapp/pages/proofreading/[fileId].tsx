import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Container, Typography, Box, Button, Alert } from '@mui/material';
import JobStatus from '../../components/JobStatus';
import { highlightDifferences } from '../../services/diffHighlighter';
import DOMPurify from 'dompurify';

export interface ProofreadingData {
  originalText: string;
  correctedText: string;
  versionNumber?: number;
}

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
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editedText, setEditedText] = useState<string>('');
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

  const handleDownload = async () => {
    if (!fileId || typeof fileId !== 'string' || !data) return;
    setDownloadLoading(true);
    setDownloadError('');
    try {
      const plainCorrectedText = stripHtml(data.correctedText);
      const response = await fetch('/api/proofreading/merge-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId, correctedText: plainCorrectedText }),
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

  if (loading) {
    return (
      <Container sx={{ minHeight: '100vh', py: 4 }}>
        <Typography>Loading proofreading data...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ minHeight: '100vh', py: 4 }}>
        <Typography color="error">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ minHeight: '100vh', py: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Proofreading Interface
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Typography>File ID: {fileId}</Typography>
        {data?.versionNumber && (
          <Typography>Current Version: {data.versionNumber}</Typography>
        )}
      </Box>

      {fileId && typeof fileId === 'string' && <JobStatus fileId={fileId} />}

      <Link href="/dashboard" passHref>
        <Button variant="text" sx={{ mb: 2 }}>
          Back to Dashboard
        </Button>
      </Link>

      {/* Se in modalità di modifica, viene usato un textarea, altrimenti viene mostrato HTML sanificato */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        {/* Original Text Panel */}
        <Box sx={{ border: '1px solid #ccc', p: 2 }}>
          <Typography variant="h6">Original Text</Typography>
          <Box
            component="textarea"
            readOnly
            value={data?.originalText || ''}
            sx={{
              width: '100%',
              height: 400,
              mt: 1,
              resize: 'none',
              p: 1,
              borderColor: '#ccc',
            }}
          />
        </Box>
        {/* Corrected Text Panel */}
        <Box sx={{ border: '1px solid #ccc', p: 2 }}>
          <Typography variant="h6">Corrected Text</Typography>
          {editMode ? (
            <Box
              component="textarea"
              sx={{
                width: '100%',
                height: 400,
                mt: 1,
                resize: 'none',
                p: 1,
              }}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: 400,
                mt: 1,
                overflowY: 'auto',
                p: 1,
              }}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(data?.correctedText || '')
              }}
            />
          )}
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={toggleEditMode}>
              {editMode ? 'Save Changes' : 'Modifica'}
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => handleProofread(fileId as string)}
            >
              Re-proofread
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleDownload}
              disabled={downloadLoading}
            >
              {downloadLoading ? 'Downloading...' : 'Download DOCX'}
            </Button>
          </Box>
          {downloadError && (
            <Box mt={2}>
              <Alert severity="error">{downloadError}</Alert>
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default ProofreadingInterfacePage;
