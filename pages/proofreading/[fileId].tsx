/**
 * @file pages/proofreading/[fileId].tsx
 * @description
 * Dynamic page for proofreading a specific file. Displays:
 * - Original text (read-only)
 * - Corrected text (with <mark> highlights)
 * - The file's current version number
 *
 * Key changes:
 * - Removed the nested <a> inside <Link>. We now style <Link> directly.
 * - Everything else remains the same.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface ProofreadingData {
  originalText: string;
  correctedText: string;
  versionNumber?: number; // optional
}

const ProofreadingInterfacePage: React.FC = () => {
  const router = useRouter();
  const { fileId } = router.query;

  const [data, setData] = useState<ProofreadingData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

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
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Error fetching proofreading data.');
        setLoading(false);
      }
    };

    fetchProofreadingData();
  }, [fileId]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', padding: '2rem' }}>
        <p>Loading proofreading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', padding: '2rem' }}>
        <p style={{ color: 'red' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Proofreading Interface</h1>
      <div style={{ marginBottom: '1rem' }}>
        <p>File ID: {fileId}</p>
        {data?.versionNumber && <p>Current Version: {data.versionNumber}</p>}
      </div>

      {/* Instead of <a> inside <Link>, we just style the Link itself */}
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
        {/* Original Text */}
        <div style={{ border: '1px solid #ccc', padding: '1rem' }}>
          <h2>Original Text</h2>
          <textarea
            readOnly
            style={{ width: '100%', height: '400px', marginTop: '0.5rem' }}
            value={data?.originalText || ''}
          />
        </div>

        {/* Corrected Text */}
        <div style={{ border: '1px solid #ccc', padding: '1rem' }}>
          <h2>Corrected Text</h2>
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
        </div>
      </div>
    </div>
  );
};

export default ProofreadingInterfacePage;
