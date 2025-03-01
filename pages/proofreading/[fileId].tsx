/**
 * @file pages/proofreading/[fileId].tsx
 * @description
 * This page displays a split-view for a specific file's proofreading results.
 * - Left side: The plain text from the file's DB record (e.g., current_text).
 * - Right side: The highlighted text from the last proofreading log (with <mark> tags).
 *
 * Key features:
 * - Dynamic route based on fileId
 * - Fetches the file's plain text from /api/files/<some endpoint> or directly from /api/proofreading/details
 * - Fetches the highlighted text from the logs
 *
 * @notes
 * - The user sees the final “clean” text on the left, and the diff-based highlight on the right.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface ProofreadingData {
  originalText: string;   // or 'currentText' if you prefer
  correctedText: string;  // contains <mark> tags
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
        // Example: calling /api/proofreading/details?fileId=...
        // That endpoint should return { originalText, correctedText } where correctedText has <mark> tags
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl">Loading proofreading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header with a link back to Dashboard */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Proofreading Interface</h1>
        <Link href="/dashboard" className="text-blue-500 hover:underline">
          Back to Dashboard
        </Link>
      </header>

      {/* Display file ID */}
      <div className="mb-4">
        <p className="text-gray-700">File ID: {fileId}</p>
      </div>

      {/* Split view layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original text (plain) */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Original Text</h2>
          <textarea
            readOnly
            className="w-full h-64 p-2 border rounded resize-none"
            value={data?.originalText || ''}
          />
        </div>

        {/* Corrected text (with <mark> tags) */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Corrected Text</h2>
          <div
            className="w-full h-64 p-2 border rounded overflow-auto whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: data?.correctedText || '' }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProofreadingInterfacePage;
