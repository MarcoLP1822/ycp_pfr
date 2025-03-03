/**
 * @file components/FileList.tsx
 * @description
 * This component displays a list of uploaded files using Material UI. It maps
 * over an array of file objects and renders each file with FileItem.
 *
 * @dependencies
 * - React
 * - FileItem: MUI-based file item
 */

import React from 'react';
import FileItem from './FileItem';

export interface FileData {
  file_id: string;
  file_name: string;
  file_type: string;
  upload_timestamp: string;
  proofreading_status: string;
  version_number: number;
  file_url: string;
}

interface FileListProps {
  files: FileData[];
  onRename: (fileId: string, newName: string) => void;
  onDelete: (fileId: string) => void;
  onProofread: (fileId: string) => void;
  onViewVersions: (fileId: string) => void;
}

const FileList: React.FC<FileListProps> = ({
  files,
  onRename,
  onDelete,
  onProofread,
  onViewVersions,
}) => {
  if (files.length === 0) {
    return <p>No files uploaded yet.</p>;
  }

  return (
    <div>
      {files.map((file) => (
        <FileItem
          key={file.file_id}
          file={file}
          onRename={onRename}
          onDelete={onDelete}
          onProofread={onProofread}
          onViewVersions={onViewVersions}
        />
      ))}
    </div>
  );
};

export default FileList;
