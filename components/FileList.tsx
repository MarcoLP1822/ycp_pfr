/**
 * @file components/FileList.tsx
 * @description
 * This component displays a list of uploaded files in a minimalist style.
 * It maps over an array of file objects and renders each file using the FileItem component,
 * ensuring smooth transitions and clear action buttons styled with the mocha color palette.
 *
 * Key features:
 * - Minimalist and clean presentation of file items.
 * - Consistent spacing and responsive design.
 * - Displays a friendly message when no files are available.
 *
 * @dependencies
 * - React: For component creation and rendering.
 * - FileItem: Represents individual file items with actions.
 *
 * @notes
 * - Assumes that file objects adhere to the FileData interface.
 * - All action callbacks (rename, delete, proofread, view versions) are passed as props.
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
  onViewVersions: (fileId: string) => void;
}

const FileList: React.FC<FileListProps> = ({ files, onRename, onDelete, onProofread, onViewVersions }) => {
  return (
    <div className="space-y-4">
      {files.length === 0 ? (
        <p className="text-mocha-dark text-center">No files uploaded yet.</p>
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
