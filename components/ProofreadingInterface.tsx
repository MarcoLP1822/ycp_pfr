/**
 * @file components/ProofreadingInterface.tsx
 * @description
 * This component displays a two-column interface for proofreading:
 * - Left: Original text (plain)
 * - Right: Corrected text with <mark> highlights
 *
 * @dependencies
 * - React for rendering
 * - CorrectionControls (optional) for accept-all, etc.
 *
 * @notes
 * - This is an optional component that you can integrate into your pages.
 * - The key idea is that 'originalText' is raw, 'correctedText' has <mark>.
 */

import React, { FC, MouseEvent } from 'react';
import CorrectionControls from './CorrectionControls';

export interface ProofreadingInterfaceProps {
  /**
   * Plain original text
   */
  originalText: string;

  /**
   * Highlighted corrected text, containing <mark> tags
   */
  correctedText: string;

  /**
   * Callback for accepting an individual correction (optional)
   */
  onAcceptIndividual?: (correctionIdentifier: string) => void;

  /**
   * Callback for accepting all corrections in bulk
   */
  onAcceptAll?: () => void;
}

const ProofreadingInterface: FC<ProofreadingInterfaceProps> = ({
  originalText,
  correctedText,
  onAcceptIndividual,
  onAcceptAll,
}) => {
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
    <div className="p-6 bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Proofreading Interface</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original Text Column */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Original Text</h2>
          <textarea
            readOnly
            className="w-full h-64 p-2 border rounded resize-none"
            value={originalText}
          />
        </div>

        {/* Corrected Text Column */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Corrected Text</h2>
          <div
            className="w-full h-64 p-2 border rounded overflow-auto whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: correctedText }}
            onClick={handleCorrectionClick}
          />
        </div>
      </div>

      {/* Optional Correction Controls */}
      {onAcceptAll && (
        <div className="mt-4">
          <CorrectionControls onAcceptAll={onAcceptAll} />
        </div>
      )}
    </div>
  );
};

export default ProofreadingInterface;
