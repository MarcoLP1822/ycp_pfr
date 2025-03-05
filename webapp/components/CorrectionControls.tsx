/**
 * @file components/CorrectionControls.tsx
 * @description
 * This component provides control buttons for managing proofreading corrections.
 * It includes a button for accepting all corrections in bulk.
 *
 * Key features:
 * - "Accept All Corrections" button that triggers a callback when clicked.
 *
 * @dependencies
 * - React: For component creation.
 *
 * @notes
 * - Additional controls (e.g., for rejecting corrections) can be added in future iterations.
 */

import React, { FC } from 'react';

export interface CorrectionControlsProps {
  onAcceptAll: () => void;
}

const CorrectionControls: FC<CorrectionControlsProps> = ({ onAcceptAll }) => {
  return (
    <div className="flex justify-end space-x-4">
      <button
        onClick={onAcceptAll}
        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors"
      >
        Accept All Corrections
      </button>
    </div>
  );
};

export default CorrectionControls;