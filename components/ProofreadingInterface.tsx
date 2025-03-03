/**
 * @file components/ProofreadingInterface.tsx
 * @description
 * This component renders a split-view interface for proofreading:
 * - Left side displays the original plain text.
 * - Right side displays the corrected text with inline highlights (<mark> tags).
 *
 * Enhancements in this update:
 * - Confirmed responsive grid layout for different devices.
 * - Added micro-interaction effects (active scale transformation) on the corrected text container.
 *
 * Key features:
 * - Split-view layout for clear differentiation.
 * - Optional callback support for accepting individual corrections or all corrections.
 *
 * @dependencies
 * - React for component rendering and event handling.
 * - CorrectionControls for bulk correction acceptance.
 *
 * @notes
 * - Ensure that the Tailwind configuration includes the mocha color palette.
 */

import React, { FC, MouseEvent } from 'react';
import CorrectionControls from './CorrectionControls';

export interface ProofreadingInterfaceProps {
  /**
   * The plain original text.
   */
  originalText: string;
  /**
   * The corrected text with inline <mark> highlights.
   */
  correctedText: string;
  /**
   * Callback when an individual correction is accepted.
   */
  onAcceptIndividual?: (correctionIdentifier: string) => void;
  /**
   * Callback to accept all corrections in bulk.
   */
  onAcceptAll?: () => void;
}

const ProofreadingInterface: FC<ProofreadingInterfaceProps> = ({
  originalText,
  correctedText,
  onAcceptIndividual,
  onAcceptAll,
}) => {
  /**
   * Handles click events on the corrected text.
   * If a <mark> element is clicked, its correction identifier is passed to the onAcceptIndividual callback.
   */
  const handleCorrectionClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!onAcceptIndividual) return;
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'mark') {
      const correctionId = target.getAttribute('data-correction-id') || target.textContent || '';
      if (correctionId) {
        onAcceptIndividual(correctionId);
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-mocha-light min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-mocha-dark">Proofreading Interface</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Original Text Column */}
        <div className="bg-white p-4 rounded shadow transition-all duration-300">
          <h2 className="text-xl font-semibold mb-3 text-mocha-dark">Original Text</h2>
          <textarea
            readOnly
            className="w-full h-72 p-3 border border-mocha-light rounded resize-none transition-all duration-300"
            value={originalText}
          />
        </div>
        {/* Corrected Text Column with micro-interaction */}
        <div
          className="bg-white p-4 rounded shadow transition-all duration-300 transform hover:scale-105 active:scale-95 overflow-auto whitespace-pre-wrap border border-mocha-light"
          onClick={handleCorrectionClick}
        >
          <h2 className="text-xl font-semibold mb-3 text-mocha-dark">Corrected Text</h2>
          <div
            className="w-full h-72 p-3 transition-all duration-300"
            dangerouslySetInnerHTML={{ __html: correctedText }}
          />
        </div>
      </div>
      {onAcceptAll && (
        <div className="mt-6">
          <CorrectionControls onAcceptAll={onAcceptAll} />
        </div>
      )}
    </div>
  );
};

export default ProofreadingInterface;
