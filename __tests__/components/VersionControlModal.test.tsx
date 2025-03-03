/**
 * @file __tests__/components/VersionControlModal.test.tsx
 * @description
 * This file contains tests for the VersionControlModal component.
 * It ensures that:
 * - The modal renders correctly when the `isOpen` prop is true.
 * - Version details are displayed.
 * - The close button triggers the onClose callback.
 * - The rollback buttons trigger their respective callbacks.
 * 
 * Key features:
 * - Verifies the presence of version numbers and modal title.
 * - Simulates user clicks on action buttons and checks callback invocations.
 * - Confirms that the modal does not render when `isOpen` is false.
 * 
 * @dependencies
 * - React Testing Library for rendering, querying, and simulating user events.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VersionControlModal, { Version } from '../../components/VersionControlModal';

describe('VersionControlModal Component', () => {
  const mockVersions: Version[] = [
    { id: 'v1', versionNumber: 1, timestamp: new Date().toISOString(), description: 'Initial version' },
    { id: 'v2', versionNumber: 2, timestamp: new Date().toISOString(), description: 'Second version' },
  ];

  const onCloseMock = jest.fn();
  const onRollbackVersionMock = jest.fn();
  const onRollbackOriginalMock = jest.fn();

  test('renders modal when open with version details', () => {
    render(
      <VersionControlModal
        isOpen={true}
        versions={mockVersions}
        onClose={onCloseMock}
        onRollbackVersion={onRollbackVersionMock}
        onRollbackOriginal={onRollbackOriginalMock}
      />
    );
    
    // Check that the modal title is rendered.
    const title = screen.getByText(/version history/i);
    expect(title).toBeInTheDocument();

    // Check that the version numbers are rendered.
    const version1 = screen.getByText('1');
    expect(version1).toBeInTheDocument();

    const version2 = screen.getByText('2');
    expect(version2).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    render(
      <VersionControlModal
        isOpen={true}
        versions={mockVersions}
        onClose={onCloseMock}
        onRollbackVersion={onRollbackVersionMock}
        onRollbackOriginal={onRollbackOriginalMock}
      />
    );
    
    // Find the close button by its aria-label and click it.
    const closeButton = screen.getByRole('button', { name: /close version history modal/i });
    fireEvent.click(closeButton);
    expect(onCloseMock).toHaveBeenCalled();
  });

  test('calls onRollbackVersion when Rollback button is clicked for a version', () => {
    render(
      <VersionControlModal
        isOpen={true}
        versions={mockVersions}
        onClose={onCloseMock}
        onRollbackVersion={onRollbackVersionMock}
        onRollbackOriginal={onRollbackOriginalMock}
      />
    );
    
    // Retrieve all rollback buttons and click the first one.
    const rollbackButtons = screen.getAllByRole('button', { name: /rollback to version/i });
    fireEvent.click(rollbackButtons[0]);
    expect(onRollbackVersionMock).toHaveBeenCalledWith(mockVersions[0].id);
  });

  test('calls onRollbackOriginal when Rollback to Original button is clicked', () => {
    render(
      <VersionControlModal
        isOpen={true}
        versions={mockVersions}
        onClose={onCloseMock}
        onRollbackVersion={onRollbackVersionMock}
        onRollbackOriginal={onRollbackOriginalMock}
      />
    );
    
    // Find the "Rollback to Original" button and click it.
    const rollbackOriginalButton = screen.getByRole('button', { name: /rollback to original text/i });
    fireEvent.click(rollbackOriginalButton);
    expect(onRollbackOriginalMock).toHaveBeenCalled();
  });

  test('does not render modal when isOpen is false', () => {
    const { container } = render(
      <VersionControlModal
        isOpen={false}
        versions={mockVersions}
        onClose={onCloseMock}
        onRollbackVersion={onRollbackVersionMock}
        onRollbackOriginal={onRollbackOriginalMock}
      />
    );
    
    // Ensure the modal is not rendered when isOpen is false.
    expect(container.firstChild).toBeNull();
  });
});
