/**
 * @file components/FileItem.tsx
 * @description
 * This component represents an individual file item in the file list.
 * It displays file information (name, type, and proofreading status) and provides
 * action buttons for renaming, deleting, initiating proofreading, and viewing version history.
 * Accessibility enhancements include descriptive aria-labels on interactive elements.
 *
 * Key features:
 * - Toggle between display and edit mode for renaming with input auto-saving.
 * - Smooth hover effects and transition animations using the mocha color palette.
 * - Clear action buttons for all file operations.
 *
 * @dependencies
 * - React: For component creation and state management.
 * - FileData type from FileList for proper TypeScript type validation.
 *
 * @notes
 * - Ensures a modern, minimalist design while incorporating accessibility improvements.
 * - Uses Tailwind CSS classes for styling and transitions.
 */

import React, { useState } from 'react';
import { FileData } from './FileList';

interface FileItemProps {
  file: FileData;
  onRename: (fileId: string, newName: string) => void;
  onDelete: (fileId: string) => void;
  onProofread: (fileId: string) => void;
  onViewVersions: (fileId: string) => void;
}

const FileItem: React.FC<FileItemProps> = ({ file, onRename, onDelete, onProofread, onViewVersions }) => {
  // Local state to manage editing mode for renaming.
  const [isEditing, setIsEditing] = useState<boolean>(false);
  // Local state to hold the new file name during renaming.
  const [newName, setNewName] = useState<string>(file.file_name);

  /**
   * Handles the rename action.
   * Validates that the new name is non-empty and has changed, then calls the onRename callback.
   */
  const handleRename = () => {
    if (newName.trim() && newName !== file.file_name) {
      onRename(file.file_id, newName);
    }
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between bg-white p-4 rounded shadow-sm hover:shadow-lg transition-shadow duration-300">
      <div className="flex flex-col">
        {isEditing ? (
          // Input field for renaming with auto-save on blur.
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-mocha-light"
            autoFocus
            aria-label="File name input"
          />
        ) : (
          // Display the file name when not editing.
          <span className="font-semibold text-mocha-dark">{file.file_name}</span>
        )}
        <span className="text-sm text-gray-500">{file.file_type.toUpperCase()}</span>
        <span className="text-xs text-gray-400">Status: {file.proofreading_status}</span>
      </div>
      <div className="flex space-x-2">
        {/* Rename Button */}
        <button
          onClick={() => setIsEditing(true)}
          className="bg-mocha text-white px-2 py-1 rounded hover:bg-mocha-light transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-mocha-light"
          aria-label={`Rename file ${file.file_name}`}
        >
          Rename
        </button>
        {/* Delete Button */}
        <button
          onClick={() => onDelete(file.file_id)}
          className="bg-mocha-dark text-white px-2 py-1 rounded hover:bg-mocha transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-mocha-light"
          aria-label={`Delete file ${file.file_name}`}
        >
          Delete
        </button>
        {/* Proofread Button */}
        <button
          onClick={() => onProofread(file.file_id)}
          className="bg-mocha text-white px-2 py-1 rounded hover:bg-mocha-light transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-mocha-light"
          aria-label={`Proofread file ${file.file_name}`}
        >
          Proofread
        </button>
        {/* Version History Button */}
        <button
          onClick={() => onViewVersions(file.file_id)}
          className="bg-mocha-light text-white px-2 py-1 rounded hover:bg-mocha transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-mocha-light"
          aria-label={`View version history for file ${file.file_name}`}
        >
          Version History
        </button>
      </div>
    </div>
  );
};

export default FileItem;
