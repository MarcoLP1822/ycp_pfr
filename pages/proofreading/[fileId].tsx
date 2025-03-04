/**
 * @file pages/proofreading/[fileId].tsx
 * @description
 * Dynamic page for proofreading a specific file. Displays:
 * - Original text (read-only)
 * - Corrected text that is read-only by default (with inline <mark> highlights)
 *   and becomes an editable plain-text textarea when you click "Edit Corrected Text".
 *   On saving, the plain text is re-processed to restore inline highlighting.
 * - The file's current version number.
 *
 * Key changes:
 * - Added an "Edit Corrected Text" button that toggles edit mode.
 * - Added a "Download DOCX" button that allows users to download the proofread document.
 * - When edit mode is enabled, the textarea shows plain text (HTML tags stripped).
 * - When saving changes, diffHighlighter is re-applied to produce highlighted text.
 *
 * @notes
 * - This file uses inline styling. You can later convert styles to Material UI's sx prop or styled components.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Container, Typography, Box, Button } from '@mui/material';
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

  // Handler to trigger DOCX download
  const handleDownload = () => {
    if (!fileId || typeof fileId !== 'string') return;
    window.open(`/api/proofreading/download?fileId=${fileId}`, '_blank');
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
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
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
          </div>
        </div>
      </div>
    </Container>
  );
};

export default ProofreadingInterfacePage;
