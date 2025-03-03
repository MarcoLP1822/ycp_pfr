/**
 * @file components/VersionControlModal.tsx
 * @description
 * This component provides a modernized modal interface for displaying the version history of a document.
 * It allows users to view previous versions and rollback changes if necessary.
 *
 * Key features:
 * - Displays a list of previous versions with details such as version number and timestamp.
 * - Allows the user to select a version to rollback via the "Rollback" button.
 * - Provides a "Rollback to Original" button to revert to the file's original text.
 * - Implements smooth transitions and focus management for improved accessibility.
 *
 * @dependencies
 * - React: For component creation, state management, and hooks.
 * - Tailwind CSS: For styling the modal and its elements.
 *
 * @notes
 * - Uses the mocha color palette for a sleek, minimalist aesthetic.
 * - Adds focus management and ESC key handling to enhance accessibility.
 * - Ensure that the parent component properly manages the isOpen state.
 */

import React, { FC, useEffect, useRef } from 'react';

export interface Version {
  /**
   * The unique identifier for this version entry (e.g., log_id).
   */
  id: string;
  /**
   * The sequential version number (1, 2, 3, etc.).
   */
  versionNumber: number;
  /**
   * A string representation of the timestamp when this version was created.
   */
  timestamp: string;
  /**
   * Optional description providing details about the version.
   */
  description?: string;
}

export interface VersionControlModalProps {
  /**
   * Controls whether the modal is rendered.
   */
  isOpen: boolean;
  /**
   * An array of version objects to display in the modal.
   */
  versions: Version[];
  /**
   * Callback function to close the modal.
   */
  onClose: () => void;
  /**
   * Callback function to rollback to a specific version.
   * @param versionId - The unique ID of the version.
   */
  onRollbackVersion: (versionId: string) => void;
  /**
   * Callback function to rollback to the original text.
   */
  onRollbackOriginal: () => void;
}

const VersionControlModal: FC<VersionControlModalProps> = ({
  isOpen,
  versions,
  onClose,
  onRollbackVersion,
  onRollbackOriginal,
}) => {
  // Ref for the modal container to set focus when opened
  const modalRef = useRef<HTMLDivElement>(null);

  // Effect to manage focus and keyboard accessibility when modal is open
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus(); // Set focus on the modal container
    }

    // Handler for keydown events to close modal on ESC key press
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    // Cleanup event listener on unmount or when modal is closed
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // If the modal is not open, do not render it
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
    >
      {/* Modal container with focus management */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-mocha-light text-mocha-dark rounded-lg shadow-lg w-11/12 md:w-1/2 lg:w-1/3 transform transition-all ease-in-out duration-300 outline-none"
      >
        {/* Modal header */}
        <div className="flex justify-between items-center border-b border-mocha p-4">
          <h2 className="text-xl font-bold">Version History</h2>
          <button
            onClick={onClose}
            className="text-mocha-dark hover:text-mocha transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-mocha"
            aria-label="Close Modal"
          >
            &times;
          </button>
        </div>

        {/* Modal content */}
        <div className="p-4 max-h-96 overflow-y-auto">
          {versions.length === 0 ? (
            <p className="text-mocha">No versions available.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="px-2 py-1 border-b border-mocha">Version</th>
                  <th className="px-2 py-1 border-b border-mocha">Timestamp</th>
                  <th className="px-2 py-1 border-b border-mocha">Description</th>
                  <th className="px-2 py-1 border-b border-mocha">Action</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((version) => (
                  <tr key={version.id} className="hover:bg-mocha transition-colors duration-300">
                    <td className="px-2 py-1 border-b border-mocha">{version.versionNumber}</td>
                    <td className="px-2 py-1 border-b border-mocha">
                      {new Date(version.timestamp).toLocaleString()}
                    </td>
                    <td className="px-2 py-1 border-b border-mocha">
                      {version.description ? version.description : 'N/A'}
                    </td>
                    <td className="px-2 py-1 border-b border-mocha">
                      <button
                        onClick={() => onRollbackVersion(version.id)}
                        className="bg-mocha text-white px-2 py-1 rounded hover:bg-mocha-dark transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-mocha"
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
        <div className="flex justify-end border-t border-mocha p-4 space-x-2">
          <button
            onClick={onRollbackOriginal}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-300"
          >
            Rollback to Original
          </button>
          <button
            onClick={onClose}
            className="bg-mocha-dark text-white px-4 py-2 rounded hover:bg-mocha transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-mocha"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionControlModal;
