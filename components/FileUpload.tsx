/**
 * @file components/FileUpload.tsx
 * @description
 * This component handles file uploads for the Web Proofreading App.
 * It allows users to select and upload documents (doc, docx, odt/odf, txt)
 * to the Supabase Storage bucket. The component validates file types,
 * provides visual feedback during the upload process, and displays messages
 * for success or failure.
 *
 * Key features:
 * - File type validation based on extension.
 * - Integration with Supabase Storage API to upload files.
 * - User feedback during and after the upload process.
 *
 * @dependencies
 * - React: For component creation and state management.
 * - Supabase Client: For interacting with Supabase Storage.
 *
 * @notes
 * - Ensure that the Supabase Storage bucket (named 'uploads') is properly configured.
 * - Allowed file extensions: .doc, .docx, .odt/.odf, .txt.
 */

import React, { useState, ChangeEvent } from 'react';
import supabaseClient from '../services/supabaseClient';

// Define allowed file extensions for validation
const allowedExtensions = ['doc', 'docx', 'odt', 'odf', 'txt'];

const FileUpload: React.FC = () => {
  // State to store the selected file
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // State for error messages
  const [errorMessage, setErrorMessage] = useState<string>('');
  // State for tracking upload progress
  const [uploading, setUploading] = useState<boolean>(false);
  // State for success message display
  const [uploadSuccess, setUploadSuccess] = useState<string>('');

  /**
   * Handles the change event when a file is selected.
   * Validates the file extension and updates the state accordingly.
   *
   * @param e - The change event from the file input.
   */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    setUploadSuccess('');
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      // Extract file extension and validate
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
   * Handles the file upload to Supabase Storage.
   * Generates a unique file name, uploads the file, and displays appropriate feedback.
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a file before uploading.');
      return;
    }
    setUploading(true);
    setErrorMessage('');
    setUploadSuccess('');

    try {
      // Generate a unique file name using the current timestamp
      const fileName = `${Date.now()}-${selectedFile.name}`;
      const bucketName = 'uploads'; // Ensure this bucket exists in Supabase

      // Upload the file to the specified bucket using Supabase Storage API
      const { data, error } = await supabaseClient.storage
        .from(bucketName)
        .upload(fileName, selectedFile);

      setUploading(false);

      if (error) {
        setErrorMessage(`Upload failed: ${error.message}`);
        return;
      }

      setUploadSuccess('File uploaded successfully.');
      setSelectedFile(null);
      // Optionally, trigger additional actions such as saving file metadata to the database.
    } catch (uploadError: any) {
      setUploading(false);
      setErrorMessage(`An unexpected error occurred: ${uploadError.message}`);
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
