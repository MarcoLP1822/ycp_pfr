/**
 * @file components/FileUpload.tsx
 * @description
 * This component handles uploading files to Supabase Storage and creates a corresponding record in the
 * `files` table by calling the `/api/files/upload` endpoint.
 * Accessibility enhancements include ARIA roles for error and success messages, and descriptive aria-labels for interactive elements.
 *
 * Key features:
 * - Validates file extension before uploading (doc, docx, odt, odf, txt).
 * - Uses the mocha color palette for a modern, sleek, and minimalist UI.
 * - Provides clear calls-to-action and smooth transition effects on buttons and inputs.
 * - Displays error and success messages styled with mocha colors.
 *
 * @dependencies
 * - React: For component creation.
 * - @supabase/auth-helpers-react: For session and supabase client.
 * - Tailwind CSS: For styling.
 *
 * @notes
 * - Ensure that your Tailwind configuration includes the mocha color palette.
 * - Verify file validation messages and upload button responsiveness on various devices.
 */

import React, { useState, ChangeEvent } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';

// Define the allowed file extensions
const allowedExtensions = ['doc', 'docx', 'odt', 'odf', 'txt'];

const FileUpload: React.FC = () => {
  const supabase = useSupabaseClient();
  const session = useSession();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<string>('');

  /**
   * Handles file selection and validates the file extension.
   * @param e - The file input change event.
   */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    setUploadSuccess('');
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        setErrorMessage('Invalid file type. Please upload a doc, docx, odt/odf, or txt file.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  /**
   * Uploads the selected file to Supabase Storage, then calls `/api/files/upload`
   * to insert a row in the `files` table.
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a file before uploading.');
      return;
    }
    // Ensure user is logged in
    if (!session?.user?.id) {
      setErrorMessage('You must be logged in to upload a file.');
      return;
    }

    setUploading(true);
    setErrorMessage('');
    setUploadSuccess('');

    try {
      // Generate a unique file name and upload to the 'uploads' bucket.
      const fileName = `${Date.now()}-${selectedFile.name}`;
      const bucketName = 'uploads';

      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, selectedFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setErrorMessage(`Upload to bucket failed: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      // Determine the file extension and URL/path from storage.
      const fileExtension = (selectedFile.name.split('.').pop() || '').toLowerCase();
      const fileUrl = data?.path || fileName;

      // Prepare file metadata for the API call.
      const bodyData = {
        user_id: session.user.id,
        file_name: selectedFile.name,
        file_type: fileExtension,
        file_url: fileUrl,
      };

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        console.error('Error inserting file metadata:', errorBody);
        setErrorMessage(`Database insertion failed: ${errorBody.error || 'Unknown error'}`);
        setUploading(false);
        return;
      }

      // Successfully updated the database.
      setUploadSuccess('File uploaded and database updated successfully.');
      setSelectedFile(null);
    } catch (uploadError: any) {
      console.error('Unexpected upload error:', uploadError);
      setErrorMessage(`An unexpected error occurred: ${uploadError.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 border border-mocha rounded shadow-sm bg-white">
      <h2 className="text-2xl font-semibold mb-4 text-mocha-dark">Upload Document</h2>
      {errorMessage && (
        <p role="alert" className="text-mocha-dark mb-2 bg-mocha-light p-2 rounded">{errorMessage}</p>
      )}
      {uploadSuccess && (
        <p role="status" className="text-mocha mb-2 bg-mocha-light p-2 rounded">{uploadSuccess}</p>
      )}
      <input
        type="file"
        accept=".doc,.docx,.odt,.odf,.txt"
        onChange={handleFileChange}
        className="mb-4 w-full border border-mocha rounded p-2 focus:outline-none focus:ring-2 focus:ring-mocha-light transition-colors"
        aria-label="File Upload Input"
      />
      <button
        onClick={handleUpload}
        disabled={uploading}
        className="w-full bg-mocha text-white py-3 px-4 rounded transition-colors duration-300 hover:bg-mocha-light focus:outline-none focus:ring-2 focus:ring-mocha-light"
        aria-label="Upload file"
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
};

export default FileUpload;
