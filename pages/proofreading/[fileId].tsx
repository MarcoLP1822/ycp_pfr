/**
 * @file pages/proofreading/[fileId].tsx
 * @description
 * This page renders a dynamic split-view proofreading interface for a specific file.
 * - Left side: Shows the plain original text.
 * - Right side: Shows the corrected text with inline highlights (<mark> tags).
 *
 * Enhancements:
 * - Uses a mocha-light background for a modern aesthetic.
 * - Implements smooth transitions and ample white space for better readability.
 * - Provides clear navigation back to the dashboard.
 *
 * @dependencies
 * - React for component state and effects.
 * - Next.js router for dynamic routing.
 * - Link from Next.js for navigation.
 *
 * @notes
 * - Ensure that the API endpoint /api/proofreading/details returns both originalText and correctedText.
 * - This page is designed to be responsive and should work across different devices.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface ProofreadingData {
  /**
   * The original plain text extracted from the file.
   */
  originalText: string;
  /**
   * The corrected text with inline highlights (<mark> tags).
   */
  correctedText: string;
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
      <div className="min-h-screen flex items-center justify-center bg-mocha-light">
        <p className="text-2xl text-mocha-dark">Loading proofreading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mocha-light">
        <p className="text-2xl text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mocha-light p-6">
      {/* Header with a link back to Dashboard */}
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-mocha-dark">Proofreading Interface</h1>
        <Link href="/dashboard">
          <a className="text-mocha-dark hover:underline transition-colors duration-300">
            Back to Dashboard
          </a>
        </Link>
      </header>

      {/* Display file ID for reference */}
      <div className="mb-4">
        <p className="text-base text-mocha-dark">File ID: {fileId}</p>
      </div>

      {/* Split-view layout for original and corrected texts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Original Text Panel */}
        <div className="bg-white p-4 rounded shadow transition-all duration-300">
          <h2 className="text-xl font-semibold mb-3 text-mocha-dark">Original Text</h2>
          <textarea
            readOnly
            className="w-full h-72 p-3 border border-mocha-light rounded resize-none transition-all duration-300"
            value={data?.originalText || ''}
          />
        </div>
        {/* Corrected Text Panel */}
        <div className="bg-white p-4 rounded shadow transition-all duration-300">
          <h2 className="text-xl font-semibold mb-3 text-mocha-dark">Corrected Text</h2>
          <div
            className="w-full h-72 p-3 border border-mocha-light rounded overflow-auto whitespace-pre-wrap transition-all duration-300"
            dangerouslySetInnerHTML={{ __html: data?.correctedText || '' }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProofreadingInterfacePage;
