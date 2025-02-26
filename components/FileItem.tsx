/**
 * @file components/FileItem.tsx
 * @description
 * This component represents an individual file item in the file list.
 * It displays file information (such as name, type, and proofreading status) and provides
 * action buttons for renaming, deleting, and initiating the proofreading process.
 *
 * Key features:
 * - Toggle between display and edit mode for renaming.
 * - Immediate triggers for file deletion and proofreading.
 *
 * @dependencies
 * - React: For component creation and state management.
 *
 * @notes
 * - Uses local state to manage the renaming process.
 * - Validates input to ensure that the new name is not empty or unchanged.
 */

import React, { useState } from 'react';
import { FileData } from './FileList';

// Define the props for the FileItem component.
interface FileItemProps {
  file: FileData;
  onRename: (fileId: string, newName: string) => void;
  onDelete: (fileId: string) => void;
  onProofread: (fileId: string) => void;
}

/**
 * FileItem Component
 * @param file - The file data object.
 * @param onRename - Callback function to rename the file.
 * @param onDelete - Callback function to delete the file.
 * @param onProofread - Callback function to initiate proofreading.
 */
const FileItem: React.FC<FileItemProps> = ({ file, onRename, onDelete, onProofread }) => {
  // Local state to manage whether the file name is in edit mode.
  const [isEditing, setIsEditing] = useState<boolean>(false);
  // Local state to hold the new file name during renaming.
  const [newName, setNewName] = useState<string>(file.file_name);

  /**
   * Handles the rename action.
   * Validates the new name and calls the onRename callback.
   */
  const handleRename = () => {
    // Only trigger rename if the new name is different and not empty.
    if (newName.trim() && newName !== file.file_name) {
      onRename(file.file_id, newName);
    }
    // Exit editing mode.
    setIsEditing(false);
  };

  return (
    <div className="flex items-center justify-between bg-white p-4 rounded shadow-sm">
      <div className="flex flex-col">
        {isEditing ? (
          // Input field for renaming; auto-saves on blur.
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            className="border rounded px-2 py-1"
            autoFocus
          />
        ) : (
          // Display the file name when not editing.
          <span className="font-semibold">{file.file_name}</span>
        )}
        <span className="text-sm text-gray-500">{file.file_type.toUpperCase()}</span>
        <span className="text-xs text-gray-400">Status: {file.proofreading_status}</span>
      </div>
      <div className="flex space-x-2">
        {/* Button to toggle renaming mode */}
        <button
          onClick={() => setIsEditing(true)}
          className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 transition-colors"
        >
          Rename
        </button>
        {/* Button to delete the file */}
        <button
          onClick={() => onDelete(file.file_id)}
          className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
        >
          Delete
        </button>
        {/* Button to start the proofreading process */}
        <button
          onClick={() => onProofread(file.file_id)}
          className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
        >
          Proofread
        </button>
      </div>
    </div>
  );
};

export default FileItem;
