/**
 * @file pages/proofreading/[fileId].tsx
 * @description
 * This dynamic page implements the Proofreading Interface using a split view.
 * It fetches the proofreading details (original text and diff-based corrected text with <mark> tags)
 * from the `/api/proofreading/details` endpoint based on the fileId provided in the URL.
 * The page displays the original text on the left and the highlighted corrected text on the right.
 *
 * Key features:
 * - Dynamic routing using the fileId URL parameter.
 * - Fetches proofreading data from the backend on mount.
 * - Displays a split view for comparing the original and corrected texts.
 * - Provides navigation back to the Dashboard.
 *
 * @dependencies
 * - React: For state management and rendering.
 * - Next.js useRouter: To access dynamic route parameters.
 * - Next.js Link: For navigation between pages.
 *
 * @notes
 * - Ensure that the `/api/proofreading/details` endpoint returns the diff-based text in the "correctedText" field.
 * - Handles loading and error states for improved user experience.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

// Define the interface for the proofreading data retrieved from the backend.
interface ProofreadingData {
  originalText: string;
  correctedText: string; // Contains <mark> tags for highlighted differences
}

const ProofreadingInterfacePage: React.FC = () => {
  const router = useRouter();
  const { fileId } = router.query;

  // Local state for proofreading data, loading status, and error messages.
  const [data, setData] = useState<ProofreadingData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  /**
   * useEffect hook to fetch proofreading details once fileId is available.
   * Calls the /api/proofreading/details endpoint and updates state.
   */
  useEffect(() => {
    if (!fileId) return;
    const fetchProofreadingData = async () => {
      try {
        const response = await fetch(`/api/proofreading/details?fileId=${fileId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch proofreading details.');
        }
        const result: ProofreadingData = await response.json();
        setData(result);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Error fetching proofreading data.');
        setLoading(false);
      }
    };

    fetchProofreadingData();
  }, [fileId]);

  // Render loading state.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl">Loading proofreading data...</p>
      </div>
    );
  }

  // Render error state.
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-red-500">{error}</p>
      </div>
    );
  }

  // Render the proofreading interface with a split view.
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header with title and link back to Dashboard */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Proofreading Interface</h1>
        <Link href="/dashboard" className="text-blue-500 hover:underline">
          Back to Dashboard
        </Link>
      </header>

      {/* File ID display */}
      <div className="mb-4">
        <p className="text-gray-700">File ID: {fileId}</p>
      </div>

      {/* Split-view layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original text */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Original Text</h2>
          <textarea
            readOnly
            className="w-full h-64 p-2 border rounded resize-none"
            value={data?.originalText || ''}
          />
        </div>

        {/* Corrected text with diff-based highlighting */}
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
