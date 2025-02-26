/**
 * @file components/VersionControlModal.tsx
 * @description
 * This component provides a modal interface for displaying the version history of a document.
 * It allows users to view previous versions and rollback changes if necessary.
 *
 * Key features:
 * - Displays a list of previous versions with details such as version number and timestamp.
 * - Allows the user to select a version to rollback.
 * - Includes a close button to exit the modal.
 *
 * @dependencies
 * - React: For component creation and state management.
 * - Tailwind CSS: For styling the modal and its elements.
 *
 * @notes
 * - The component expects to receive an array of version objects.
 * - It provides callbacks for closing the modal and performing rollback actions.
 * - Error handling includes basic validations to ensure versions are available.
 */

import React, { FC } from 'react';

// Define the interface for a single version entry.
export interface Version {
  id: string;
  versionNumber: number;
  timestamp: string;
  description?: string; // Optional description of changes in this version.
}

// Define the props for the VersionControlModal component.
export interface VersionControlModalProps {
  isOpen: boolean; // Determines if the modal is visible.
  versions: Version[]; // Array of document versions.
  onClose: () => void; // Callback to close the modal.
  onRollback: (versionId: string) => void; // Callback to trigger rollback to a selected version.
}

/**
 * VersionControlModal Component
 * @param isOpen - Boolean flag to control modal visibility.
 * @param versions - Array of document versions to display.
 * @param onClose - Function to call when the modal should be closed.
 * @param onRollback - Function to call with the selected version id to perform a rollback.
 */
const VersionControlModal: FC<VersionControlModalProps> = ({
  isOpen,
  versions,
  onClose,
  onRollback,
}) => {
  // If the modal is not open, do not render anything.
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      {/* Modal container */}
      <div className="bg-white rounded-lg shadow-lg w-11/12 md:w-1/2 lg:w-1/3">
        {/* Modal header */}
        <div className="flex justify-between items-center border-b px-4 py-2">
          <h2 className="text-xl font-bold">Version History</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800"
            aria-label="Close Modal"
          >
            &times;
          </button>
        </div>

        {/* Modal content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {versions.length === 0 ? (
            <p className="text-gray-500">No versions available.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="px-2 py-1 border-b">Version</th>
                  <th className="px-2 py-1 border-b">Timestamp</th>
                  <th className="px-2 py-1 border-b">Description</th>
                  <th className="px-2 py-1 border-b">Action</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((version) => (
                  <tr key={version.id} className="hover:bg-gray-100">
                    <td className="px-2 py-1 border-b">{version.versionNumber}</td>
                    <td className="px-2 py-1 border-b">{new Date(version.timestamp).toLocaleString()}</td>
                    <td className="px-2 py-1 border-b">
                      {version.description ? version.description : 'N/A'}
                    </td>
                    <td className="px-2 py-1 border-b">
                      <button
                        onClick={() => onRollback(version.id)}
                        className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                      >
                        Rollback
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal footer */}
        <div className="flex justify-end border-t px-4 py-2">
          <button
            onClick={onClose}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionControlModal;
