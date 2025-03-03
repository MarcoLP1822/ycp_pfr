/**
 * @file __tests__/components/FileUpload.test.tsx
 * @description
 * This file contains tests for the FileUpload component.
 * In addition to verifying that the upload heading is rendered,
 * an extra test has been added to check for the correct aria-label on the file input.
 * 
 * Key features:
 * - Confirms that the heading "Upload Document" appears.
 * - Verifies the file input's accessibility attribute.
 * 
 * @dependencies
 * - React Testing Library for rendering and querying elements.
 */

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import FileUpload from '../../components/FileUpload';

describe('FileUpload Component', () => {
  test('renders the upload heading', () => {
    render(<FileUpload />);
    // Verify that the heading "Upload Document" is present in the document.
    const headingElement = screen.getByText(/upload document/i);
    expect(headingElement).toBeInTheDocument();
  });

  test('renders file upload input with correct aria-label', () => {
    render(<FileUpload />);
    // Check that the file input element is accessible by its aria-label.
    const inputElement = screen.getByLabelText('File Upload Input');
    expect(inputElement).toBeInTheDocument();
  });
});
