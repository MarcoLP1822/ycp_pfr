/**
 * @file __tests__/components/ProofreadingInterface.test.tsx
 * @description
 * This test file contains unit tests for the ProofreadingInterface component.
 * It verifies that the component renders the original text and the corrected text with inline highlights,
 * and checks that the onAcceptIndividual callback is triggered when a <mark> element is clicked.
 *
 * Key features:
 * - Renders the component with dummy text values.
 * - Simulates click events on highlighted corrections.
 * - Verifies that the onAcceptIndividual callback receives the correct correction identifier.
 *
 * @dependencies
 * - React Testing Library: Used for rendering components and simulating user events.
 * - Jest: Used for making assertions.
 *
 * @notes
 * - This test ensures that the ProofreadingInterface component meets its UI and interaction specifications.
 * - Additional tests can be added to cover more edge cases as needed.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProofreadingInterface, { ProofreadingInterfaceProps } from '../../components/ProofreadingInterface';

describe('ProofreadingInterface Component', () => {
  const dummyOriginalText = "This is the original text.";
  const dummyCorrectedText = "This is the <mark data-correction-id='correction-1'>corrected</mark> text.";

  test('renders original and corrected texts correctly', () => {
    render(
      <ProofreadingInterface
        originalText={dummyOriginalText}
        correctedText={dummyCorrectedText}
      />
    );
    
    // Verify that the original text is rendered inside a textarea.
    const originalTextArea = screen.getByDisplayValue(dummyOriginalText);
    expect(originalTextArea).toBeInTheDocument();

    // Verify that the corrected text is rendered and contains a <mark> element.
    const markElement = screen.getByText('corrected');
    expect(markElement).toBeInTheDocument();
    expect(markElement.tagName).toBe('MARK');
  });

  test('calls onAcceptIndividual callback when a mark is clicked', () => {
    const onAcceptIndividualMock = jest.fn();
    render(
      <ProofreadingInterface
        originalText={dummyOriginalText}
        correctedText={dummyCorrectedText}
        onAcceptIndividual={onAcceptIndividualMock}
      />
    );
    
    // Find the <mark> element and simulate a click event.
    const markElement = screen.getByText('corrected');
    fireEvent.click(markElement);
    
    // The callback should be called with the correction identifier 'correction-1'
    expect(onAcceptIndividualMock).toHaveBeenCalledWith('correction-1');
  });
});
