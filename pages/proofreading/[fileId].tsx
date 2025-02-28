/**
 * @file pages/proofreading/[fileId].tsx
 * @description
 * This file implements the Proofreading Interface page as a proper Next.js dynamic page.
 * It captures the fileId from the URL and displays a two-column layout showing the original text
 * and the corrected text with inline highlights. This page replaces the previous API route that was
 * incorrectly placed in the `api/` folder.
 *
 * Key features:
 * - Dynamic routing using the fileId URL parameter.
 * - Side-by-side view for comparing original and corrected text.
 * - Navigation back to the Dashboard.
 *
 * @dependencies
 * - React: For state management and rendering.
 * - Next.js useRouter: To access dynamic route parameters.
 * - Next.js Link: For navigation between pages.
 *
 * @notes
 * - In a complete implementation, replace the simulated data fetching with an API call (e.g., /api/proofreading/details?fileId=...).
 * - Ensure that any references to the old API route are updated to point to this new page.
 * - Proper error handling is implemented for loading and data retrieval failures.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

// Define the interface for proofreading data
interface ProofreadingData {
  originalText: string;
  correctedText: string;
}

const ProofreadingInterfacePage: React.FC = () => {
  // Access the dynamic fileId parameter from the URL using Next.js router
  const router = useRouter();
  const { fileId } = router.query;

  // Local state to hold proofreading data, loading state, and any error messages
  const [data, setData] = useState<ProofreadingData>({ originalText: '', correctedText: '' });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // useEffect hook to simulate data fetching when fileId is available
  useEffect(() => {
    if (!fileId) return; // Wait until fileId is available
    const fetchProofreadingData = async () => {
      try {
        // Simulated data for demonstration purposes. Replace this with an actual API call if needed.
        setData({
          originalText: 'This is the origial text with some erors.',
          correctedText: 'This is the <mark>original</mark> text with some <mark>errors</mark>.',
        });
        setLoading(false);
      } catch (err: any) {
        setError('Failed to load proofreading data.');
        setLoading(false);
      }
    };

    fetchProofreadingData();
  }, [fileId]);

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl">Loading proofreading data...</p>
      </div>
    );
  }

  // Render error state if data fetching fails
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-red-500">{error}</p>
      </div>
    );
  }

  // Render the proofreading interface with a header, file ID display, and split-view layout
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header with page title and navigation back to the Dashboard */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Proofreading Interface</h1>
        <Link href="/dashboard" className="text-blue-500 hover:underline">
          Back to Dashboard
        </Link>
      </header>

      {/* Display the fileId for reference */}
      <div className="mb-4">
        <p className="text-gray-700">File ID: {fileId}</p>
      </div>

      {/* Split-view layout: original text on the left and corrected text on the right */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original text column */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Original Text</h2>
          <textarea
            readOnly
            className="w-full h-64 p-2 border rounded resize-none"
            value={data.originalText}
          />
        </div>
        {/* Corrected text column with inline highlights */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Corrected Text</h2>
          <div
            className="w-full h-64 p-2 border rounded overflow-auto whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: data.correctedText }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProofreadingInterfacePage;
