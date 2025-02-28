/**
 * @file components/FileUpload.tsx
 * @description
 * This component handles uploading files to Supabase Storage and also
 * creates a corresponding record in the `files` table by calling
 * the `/api/files/upload` endpoint.
 *
 * Key features:
 * - Validates file extension before uploading (doc, docx, odt, odf, txt).
 * - Uploads the file to the 'uploads' bucket in Supabase Storage.
 * - Calls `/api/files/upload` to insert a row in the `files` table.
 * - Shows progress and error messages to the user.
 *
 * @dependencies
 * - React: For component creation.
 * - @supabase/auth-helpers-react: For session and supabase client.
 * - Tailwind CSS: For styling.
 *
 * @notes
 * - Make sure you have the bucket named 'uploads' in your Supabase project.
 * - Ensure that the `/api/files/upload` route is correctly implemented
 *   (it should insert a row in the `files` table).
 * - If you want to see your files in `GET /api/files/list`, you must
 *   insert them into the database, not just upload to storage.
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
   * Handle file selection and validate the file extension.
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
   * Upload the selected file to Supabase Storage, then call `/api/files/upload`
   * to insert a row in the `files` table.
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a file before uploading.');
      return;
    }
    // Ensure user is logged in if we need a user_id
    if (!session?.user?.id) {
      setErrorMessage('You must be logged in to upload a file.');
      return;
    }

    setUploading(true);
    setErrorMessage('');
    setUploadSuccess('');

    try {
      // 1. Upload to Supabase Storage
      const fileName = `${Date.now()}-${selectedFile.name}`;
      const bucketName = 'uploads'; // Make sure your bucket is named "uploads"

      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, selectedFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setErrorMessage(`Upload to bucket failed: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      // 2. Insert a row in the `files` table via `/api/files/upload`
      const fileExtension = (selectedFile.name.split('.').pop() || '').toLowerCase();
      const fileUrl = data?.path || fileName; // The path in your bucket

      // Prepare the POST request body
      const bodyData = {
        user_id: session.user.id,     // from the user's session
        file_name: selectedFile.name, // original filename
        file_type: fileExtension,     // doc, docx, odt, odf, txt
        file_url: fileUrl,            // the path returned by Supabase
      };

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        console.error('Error inserting file metadata:', errorBody);
        setErrorMessage(
          `Database insertion failed: ${errorBody.error || 'Unknown error'}`
        );
        setUploading(false);
        return;
      }

      // Successfully inserted row in DB
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
    <div className="p-4 border rounded shadow-sm bg-white">
      <h2 className="text-xl font-semibold mb-4">Upload Document</h2>
      {errorMessage && <p className="text-red-500 mb-2">{errorMessage}</p>}
      {uploadSuccess && <p className="text-green-500 mb-2">{uploadSuccess}</p>}
      <input
        type="file"
        accept=".doc,.docx,.odt,.odf,.txt"
        onChange={handleFileChange}
        className="mb-4"
      />
      <button
        onClick={handleUpload}
        disabled={uploading}
        className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
};

export default FileUpload;
