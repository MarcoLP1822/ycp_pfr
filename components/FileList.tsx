/**
 * @file components/FileList.tsx
 * @description
 * This component is responsible for displaying a list of uploaded files.
 * It receives an array of file objects and renders each file using the FileItem component.
 * It also handles the scenario when no files are available.
 *
 * Key features:
 * - Maps over a list of files and renders each one.
 * - Displays a message if there are no files.
 *
 * @dependencies
 * - React: For component creation and rendering.
 * - FileItem: The component representing an individual file item.
 *
 * @notes
 * - Assumes that file objects conform to the FileData interface.
 * - Action handlers for renaming, deleting, proofreading, and viewing version history are passed in as props.
 */

import React from 'react';
import FileItem from './FileItem';

// Define the interface for a file's data structure.
export interface FileData {
  file_id: string;
  file_name: string;
  file_type: string;
  upload_timestamp: string;
  proofreading_status: string;
  version_number: number;
  file_url: string;
}

// Define the props for the FileList component.
interface FileListProps {
  files: FileData[];
  onRename: (fileId: string, newName: string) => void;
  onDelete: (fileId: string) => void;
  onProofread: (fileId: string) => void;
  onViewVersions: (fileId: string) => void; // New prop for version history
}

/**
 * FileList Component
 * @param files - Array of file objects to be displayed.
 * @param onRename - Callback for renaming a file.
 * @param onDelete - Callback for deleting a file.
 * @param onProofread - Callback to initiate proofreading for a file.
 * @param onViewVersions - Callback to view the version history for a file.
 */
const FileList: React.FC<FileListProps> = ({ files, onRename, onDelete, onProofread, onViewVersions }) => {
  return (
    <div className="space-y-4">
      {files.length === 0 ? (
        <p className="text-gray-600">No files uploaded yet.</p>
      ) : (
        files.map((file) => (
          <FileItem
            key={file.file_id}
            file={file}
            onRename={onRename}
            onDelete={onDelete}
            onProofread={onProofread}
            onViewVersions={onViewVersions}
          />
        ))
      )}
    </div>
  );
};

export default FileList;
