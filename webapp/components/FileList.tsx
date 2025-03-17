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

export interface FileListProps {
  files: FileData[];
  onRename: (fileId: string, newName: string) => void;
  onDelete: (fileId: string) => void;
  onProofread: (fileId: string) => void;
  onViewVersions: (fileId: string) => void;
  onViewCurrent: (fileId: string) => void;
  proofreadingFileId?: string | null;
}

const FileList: React.FC<FileListProps> = ({
  files,
  onRename,
  onDelete,
  onProofread,
  onViewVersions,
  onViewCurrent,
  proofreadingFileId = null,
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
          onViewCurrent={onViewCurrent}
          isProofreading={file.file_id === proofreadingFileId}
        />
      ))}
    </div>
  );
};

export default FileList;
