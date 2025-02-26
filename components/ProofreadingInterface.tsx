/**
 * @file components/ProofreadingInterface.tsx
 * @description
 * This component displays the proofreading interface with a two-column layout.
 * The left column shows the original text, and the right column shows the
 * corrected text with inline corrections highlighted using <mark> tags.
 * It also handles user interactions for accepting individual corrections
 * via clicking on highlighted corrections, and it integrates the CorrectionControls component
 * for bulk acceptance of all corrections.
 *
 * Key features:
 * - Two-column responsive layout using Tailwind CSS.
 * - Interactive inline corrections: clicking on a highlighted correction calls a callback.
 * - Integration with CorrectionControls for bulk correction acceptance.
 *
 * @dependencies
 * - React: For component creation and state management.
 * - CorrectionControls: For providing bulk correction control buttons.
 *
 * @notes
 * - The corrected text is rendered using dangerouslySetInnerHTML.
 * - Event delegation is used to capture clicks on <mark> elements.
 * - Assumes that the <mark> elements may have an optional data attribute 'data-correction-id'
 *   (if available) or will use the text content as an identifier.
 */

import React, { FC, MouseEvent } from 'react';
import CorrectionControls from './CorrectionControls';

export interface ProofreadingInterfaceProps {
  originalText: string;
  correctedText: string; // HTML string containing inline <mark> tags
  onAcceptIndividual: (correctionIdentifier: string) => void;
  onAcceptAll: () => void;
}

const ProofreadingInterface: FC<ProofreadingInterfaceProps> = ({
  originalText,
  correctedText,
  onAcceptIndividual,
  onAcceptAll,
}) => {
  /**
   * Handle click events on the corrected text container.
   * If a <mark> element is clicked, extract its identifier (from a data attribute if available,
   * otherwise its text content) and trigger the onAcceptIndividual callback.
   *
   * @param e - MouseEvent from the click on the corrected text container.
   */
  const handleCorrectionClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'mark') {
      // Use a data attribute if available, otherwise fallback to text content.
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
            // Render the HTML that includes <mark> tags and attach click handler for inline corrections
            dangerouslySetInnerHTML={{ __html: correctedText }}
            onClick={handleCorrectionClick}
          />
        </div>
      </div>
      {/* Correction Controls for bulk acceptance */}
      <div className="mt-4">
        <CorrectionControls onAcceptAll={onAcceptAll} />
      </div>
    </div>
  );
};

export default ProofreadingInterface;
