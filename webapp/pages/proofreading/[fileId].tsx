/**
 * @file pages/proofreading/[fileId].tsx
 * @description
 * This dynamic page allows the user to view and interact with the proofreading interface for a specific file.
 * It displays the original text and the corrected text (with inline highlights), along with version information.
 * 
 * Enhancements in this update:
 * - Added an "Edit Corrected Text" button that toggles between read-only and edit mode.
 * - Added a new "Download Complex DOCX" button which calls the external merge endpoint (/api/proofreading/merge-docx)
 *   to download a DOCX that preserves complex formatting.
 * - The "Download Complex DOCX" button uses proper loading states and displays error messages if the merge fails.
 * 
 * Key features:
 * - Fetch proofreading details (original text, corrected text, version number) from the backend.
 * - Toggle edit mode to allow the user to modify the plain text.
 * - Trigger download of both basic and complex DOCX versions.
 * 
 * @dependencies
 * - React: For state management and rendering.
 * - Next.js Router: For dynamic routing.
 * - Material UI: For UI components.
 * 
 * @notes
 * - The helper function `stripHtml` is used to remove any HTML tags from the corrected text before sending to the merge endpoint.
 * - Error handling is implemented to alert the user in case the external merge service fails.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Container, Typography, Box, Button, Alert } from '@mui/material';
import { highlightDifferences } from '../../services/diffHighlighter';

interface ProofreadingData {
  originalText: string;
  correctedText: string;
  versionNumber?: number;
}

// Helper function to strip HTML tags (specifically <mark> tags) from a string
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

  // State for complex DOCX download loading and errors
  const [downloadComplexLoading, setDownloadComplexLoading] = useState<boolean>(false);
  const [downloadComplexError, setDownloadComplexError] = useState<string>('');

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
        // Initialize editedText with plain text version (stripping HTML)
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
      // When saving changes, reapply diff highlighting to get highlighted corrected text.
      const newHighlighted = highlightDifferences(data.originalText, editedText);
      setData({ ...data, correctedText: newHighlighted });
    }
    setEditMode((prev) => !prev);
  };

  // Handler to trigger basic DOCX download using the existing endpoint.
  const handleDownload = () => {
    if (!fileId || typeof fileId !== 'string') return;
    window.open(`/api/proofreading/download?fileId=${fileId}`, '_blank');
  };

  // Handler to trigger complex DOCX download using the external merge service.
  const handleDownloadComplexDocx = async () => {
    if (!fileId || typeof fileId !== 'string' || !data) return;
    setDownloadComplexLoading(true);
    setDownloadComplexError('');
    try {
      // Use the helper function stripHtml to get plain corrected text.
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
      // The response is a binary stream (Buffer) so we convert it to a blob.
      const blob = await response.blob();
      // Create a URL for the blob and trigger a download.
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      // The filename is determined by the Content-Disposition header from the response.
      // If not available, fallback to a default name.
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'proofread-complex.docx';
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
      setDownloadComplexError(err.message || 'Error downloading complex DOCX.');
    } finally {
      setDownloadComplexLoading(false);
    }
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
            // Editable plain text (no <mark> tags)
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
            // Read-only with inline highlights
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
              {editMode ? 'Save Changes' : 'Edit Corrected Text'}
            </Button>
            <Button
              onClick={handleDownload}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#388e3c',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Download DOCX
            </Button>
            <Button
              onClick={handleDownloadComplexDocx}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: downloadComplexLoading ? '#ccc' : '#5e35b1',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: downloadComplexLoading ? 'not-allowed' : 'pointer',
              }}
              disabled={downloadComplexLoading}
            >
              {downloadComplexLoading ? 'Downloading...' : 'Download Complex DOCX'}
            </Button>
          </div>
          {downloadComplexError && (
            <Box mt={2}>
              <Alert severity="error">{downloadComplexError}</Alert>
            </Box>
          )}
        </div>
      </div>
    </Container>
  );
};

export default ProofreadingInterfacePage;
