/**
 * @file pages/proofreading/[fileId].tsx
 * @description
 * This page provides the proofreading interface for a specific file.
 * It captures the fileId from the URL and displays a side-by-side view of the
 * original text and the corrected text with inline highlights.
 *
 * Key features:
 * - Dynamic routing using the fileId URL parameter.
 * - Two-column layout for side-by-side comparison of texts.
 * - A "Back to Dashboard" button for easy navigation.
 * - Simulated data fetching for demonstration purposes.
 *
 * @dependencies
 * - React: For state management and rendering.
 * - Next.js useRouter: For dynamic routing and accessing the fileId.
 * - Tailwind CSS: For responsive styling.
 *
 * @notes
 * - In a complete implementation, the data would be fetched from a backend API.
 * - Error handling and loading states are included for robustness.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface ProofreadingData {
  originalText: string;
  correctedText: string;
}

/**
 * ProofreadingInterfacePage Component
 * This component displays the proofreading interface for a given file.
 */
const ProofreadingInterfacePage: React.FC = () => {
  // Access the dynamic fileId from the URL using Next.js router.
  const router = useRouter();
  const { fileId } = router.query;

  // Local state for proofreading data (original and corrected text).
  const [data, setData] = useState<ProofreadingData>({
    originalText: '',
    correctedText: '',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Simulate fetching proofreading data for the given fileId.
  useEffect(() => {
    if (!fileId) return; // Wait until fileId is available.
    const fetchProofreadingData = async () => {
      try {
        // In a full implementation, replace the following with an API call, e.g.,
        // const response = await fetch(`/api/proofreading/details?fileId=${fileId}`);
        // const result = await response.json();
        // setData({ originalText: result.originalText, correctedText: result.correctedText });
        
        // Simulated data for demonstration purposes:
        setData({
          originalText: 'This is the origial text with some erors.',
          correctedText:
            'This is the <mark>original</mark> text with some <mark>errors</mark>.',
        });
        setLoading(false);
      } catch (err: any) {
        setError('Failed to load proofreading data.');
        setLoading(false);
      }
    };

    fetchProofreadingData();
  }, [fileId]);

  // Render a loading state, error message, or the proofreading interface.
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
      {/* Header with navigation */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Proofreading Interface</h1>
        <Link href="/dashboard">
          <a className="text-blue-500 hover:underline">Back to Dashboard</a>
        </Link>
      </header>

      {/* Display fileId for reference */}
      <div className="mb-4">
        <p className="text-gray-700">File ID: {fileId}</p>
      </div>

      {/* Two-column layout for original and corrected texts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original text field */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Original Text</h2>
          <textarea
            readOnly
            className="w-full h-64 p-2 border rounded resize-none"
            value={data.originalText}
          />
        </div>

        {/* Corrected text field with inline highlights */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Corrected Text</h2>
          <div
            className="w-full h-64 p-2 border rounded overflow-auto whitespace-pre-wrap"
            // Rendering HTML from the corrected text.
            dangerouslySetInnerHTML={{ __html: data.correctedText }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProofreadingInterfacePage;
