/**
 * @file __tests__/components/VersionControlModal.test.ts
 * @description
 * Questo file contiene test per il componente VersionControlModal.
 * Verifica che:
 * - Il modal venga renderizzato correttamente quando la proprietà `isOpen` è true.
 * - I dettagli delle versioni vengano visualizzati.
 * - Il pulsante di chiusura richiami la callback onClose.
 * - I pulsanti di rollback richiamino le callback corrispondenti.
 *
 * Key features:
 * - Usa React Testing Library per renderizzare il componente.
 * - Simula interazioni utente con i pulsanti.
 *
 * @dependencies
 * - React Testing Library per rendering, querying e simulazione degli eventi.
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
    
    // Verifica che il titolo della modale venga renderizzato
    const title = screen.getByText(/version history/i);
    expect(title).toBeInTheDocument();

    // Verifica che i numeri delle versioni vengano visualizzati
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
    
    // Trova il pulsante "Close" e cliccalo
    const closeButton = screen.getByRole('button', { name: /^Close$/i });
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
    
    // Recupera tutti i pulsanti "Rollback" (quelli nelle righe della tabella)
    const rollbackButtons = screen.getAllByRole('button', { name: /^Rollback$/i });
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
    
    // Trova il pulsante "Rollback to Original" e cliccalo.
    const rollbackOriginalButton = screen.getByRole('button', { name: /^Rollback to Original$/i });
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
    
    // Verifica che la modale non sia renderizzata quando isOpen è false.
    expect(container.firstChild).toBeNull();
  });
});
