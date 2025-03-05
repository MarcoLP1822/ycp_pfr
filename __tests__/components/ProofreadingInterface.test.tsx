/**
 * @file __tests__/components/ProofreadingInterface.test.tsx
 * @description
 * This file contains tests for the ProofreadingInterface component.
 * It verifies that the original and corrected texts are rendered correctly,
 * and that user interactions like clicking inline corrections and the "Accept All Corrections" button work as expected.
 * 
 * Key features:
 * - Checks rendering of original text and highlighted corrections.
 * - Simulates clicking on inline corrections to trigger the onAcceptIndividual callback.
 * - Verifies that the "Accept All Corrections" button is rendered and triggers onAcceptAll when clicked.
 * 
 * @dependencies
 * - React Testing Library for rendering components and simulating user events.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProofreadingInterface, { ProofreadingInterfaceProps } from '../../webapp/components/ProofreadingInterface';

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

  test('renders Accept All Corrections button and calls onAcceptAll when clicked', () => {
    const onAcceptAllMock = jest.fn();
    render(
      <ProofreadingInterface
        originalText={dummyOriginalText}
        correctedText={dummyCorrectedText}
        onAcceptAll={onAcceptAllMock}
      />
    );
    
    // Verify that the "Accept All Corrections" button is rendered.
    const button = screen.getByRole('button', { name: /accept all corrections/i });
    expect(button).toBeInTheDocument();
    
    // Simulate a click on the button and ensure the callback is invoked.
    fireEvent.click(button);
    expect(onAcceptAllMock).toHaveBeenCalled();
  });
});
