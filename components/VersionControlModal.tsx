/**
 * @file components/VersionControlModal.tsx
 * @description
 * This component provides a modal interface for displaying the version history of a document.
 * It allows users to view previous versions and rollback changes if necessary.
 *
 * Key features:
 * - Displays a list of previous versions with details such as version number and timestamp.
 * - Allows the user to select a version to rollback (via "Rollback" in each row).
 * - Includes a "Rollback to Original" button in the footer to revert to the file's original text.
 * - Includes a close button to exit the modal.
 *
 * @dependencies
 * - React: For component creation and state management.
 * - Tailwind CSS: For styling the modal and its elements.
 *
 * @notes
 * - The component expects to receive an array of version objects.
 * - We now provide two rollback callbacks:
 *   1) onRollbackVersion(versionId) – to rollback to a specific version from the table.
 *   2) onRollbackOriginal() – to revert to the original text.
 * - Error handling includes basic validations to ensure versions are available.
 */

import React, { FC } from 'react';

/**
 * Defines a single version entry in the history.
 */
export interface Version {
  /**
   * The unique identifier for this version entry (log_id).
   */
  id: string;

  /**
   * The version number (1, 2, 3, etc.).
   */
  versionNumber: number;

  /**
   * A string representation of the timestamp when this version was created.
   */
  timestamp: string;

  /**
   * Optional description of the version or changes.
   */
  description?: string;
}

/**
 * Props for the VersionControlModal component.
 */
export interface VersionControlModalProps {
  /**
   * Whether the modal is visible.
   */
  isOpen: boolean;

  /**
   * An array of versions to display in the modal.
   */
  versions: Version[];

  /**
   * Callback to close the modal.
   */
  onClose: () => void;

  /**
   * Callback to rollback to a specific version (triggered by the "Rollback" button in each row).
   * @param versionId The unique ID of the version (usually the log_id in proofreading_logs).
   */
  onRollbackVersion: (versionId: string) => void;

  /**
   * Callback to rollback to the original text (triggered by the "Rollback to Original" button in the footer).
   */
  onRollbackOriginal: () => void;
}

/**
 * VersionControlModal Component
 * Displays a modal with a table of versions and two rollback options:
 * - Per-version rollback
 * - Rollback to original
 *
 * @param isOpen - Controls whether the modal is rendered.
 * @param versions - The list of version objects to display.
 * @param onClose - Closes the modal when called.
 * @param onRollbackVersion - Function called when the user clicks "Rollback" on a specific version.
 * @param onRollbackOriginal - Function called when the user clicks "Rollback to Original."
 */
const VersionControlModal: FC<VersionControlModalProps> = ({
  isOpen,
  versions,
  onClose,
  onRollbackVersion,
  onRollbackOriginal,
}) => {
  // If the modal is not open, don't render anything.
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
                    <td className="px-2 py-1 border-b">
                      {new Date(version.timestamp).toLocaleString()}
                    </td>
                    <td className="px-2 py-1 border-b">
                      {version.description ? version.description : 'N/A'}
                    </td>
                    <td className="px-2 py-1 border-b">
                      <button
                        onClick={() => onRollbackVersion(version.id)}
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

        {/* Modal footer with "Rollback to Original" and "Close" */}
        <div className="flex justify-end border-t px-4 py-2 space-x-2">
          <button
            onClick={() => onRollbackOriginal()}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
          >
            Rollback to Original
          </button>
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
