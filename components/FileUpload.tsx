/**
 * @file components/FileUpload.tsx
 * @description
 * Handles uploading files. After a successful upload, it calls `onFileUploaded(newFile)`,
 * letting the parent know about the new file so it can be displayed immediately.
 *
 * @dependencies
 * - React
 * - Material UI
 * - @supabase/auth-helpers-react
 *
 * @notes
 * - Ensure the /api/files/upload endpoint returns the newly inserted file object
 *   so we can pass it to the parent.
 */

import React, { useState, ChangeEvent } from 'react';
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
} from '@mui/material';

// This interface must match your FileData structure from FileList
interface FileData {
  file_id: string;
  file_name: string;
  file_type: string;
  upload_timestamp: string;
  proofreading_status: string;
  version_number: number;
  file_url: string;
}

interface FileUploadProps {
  onFileUploaded?: (newFile: FileData) => void;
}

const allowedExtensions = ['doc', 'docx', 'odt', 'odf', 'txt'];

const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded }) => {
  const supabase = useSupabaseClient();
  const session = useSession();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('');
    setUploadSuccess('');
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
        setErrorMessage(
          'Invalid file type. Please upload a doc, docx, odt/odf, or txt file.'
        );
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a file before uploading.');
      return;
    }
    if (!session?.user?.id) {
      setErrorMessage('You must be logged in to upload a file.');
      return;
    }

    setUploading(true);
    setErrorMessage('');
    setUploadSuccess('');

    try {
      const fileName = `${Date.now()}-${selectedFile.name}`;
      const bucketName = 'uploads';

      // 1) Upload the file to Supabase storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, selectedFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        setErrorMessage(`Upload to bucket failed: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      const fileExtension = (
        selectedFile.name.split('.').pop() || ''
      ).toLowerCase();
      const fileUrl = data?.path || fileName;

      // 2) Insert a row in the `files` table
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
        setErrorMessage(
          `Database insertion failed: ${errorBody.error || 'Unknown error'}`
        );
        setUploading(false);
        return;
      }

      // 3) Parse the newly inserted file object from the response
      const newFile: FileData = await response.json();
      setUploadSuccess('File uploaded and database updated successfully.');
      setSelectedFile(null);

      // 4) Notify the parent so the new file can appear immediately in the list
      if (onFileUploaded) {
        onFileUploaded(newFile);
      }
    } catch (err: any) {
      console.error('Unexpected upload error:', err);
      setErrorMessage(`An unexpected error occurred: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Upload Document
        </Typography>

        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}
        {uploadSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {uploadSuccess}
          </Alert>
        )}

        <Box display="flex" alignItems="center" gap={2}>
          {/* Hidden file input */}
          <input
            type="file"
            accept=".doc,.docx,.odt,.odf,.txt"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="file-input"
          />
          <label htmlFor="file-input">
            <Button variant="contained" component="span">
              Choose File
            </Button>
          </label>

          <Typography variant="body2">
            {selectedFile ? selectedFile.name : 'No file selected'}
          </Typography>
        </Box>

        <Button
          onClick={handleUpload}
          disabled={uploading}
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FileUpload;
