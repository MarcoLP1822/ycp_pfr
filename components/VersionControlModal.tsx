/**
 * @file components/VersionControlModal.tsx
 * @description
 * Provides a MUI Dialog to display version history. This is the official Material
 * Design approach for modals in MUI. The user can scroll the DialogContent if needed.
 *
 * Key features:
 * - <Dialog> with <DialogTitle>, <DialogContent>, <DialogActions>
 * - Scrolling inside the dialog if content is too large
 * - "Rollback" and "Close" actions
 *
 * @dependencies
 * - React
 * - Material UI: Dialog, DialogTitle, DialogContent, DialogActions, Button, etc.
 */

import React, { FC } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
} from '@mui/material';

export interface Version {
  id: string;
  versionNumber: number;
  timestamp: string;
  description?: string;
}

export interface VersionControlModalProps {
  isOpen: boolean;
  versions: Version[];
  onClose: () => void;
  onRollbackVersion: (versionId: string) => void;
  onRollbackOriginal: () => void;
}

const VersionControlModal: FC<VersionControlModalProps> = ({
  isOpen,
  versions,
  onClose,
  onRollbackVersion,
  onRollbackOriginal,
}) => {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      aria-labelledby="version-history-title"
      fullWidth
      maxWidth="md"
    >
      <DialogTitle id="version-history-title">Version History</DialogTitle>

      <DialogContent dividers sx={{ maxHeight: '60vh' }}>
        {versions.length === 0 ? (
          <Typography>No versions available.</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Version</TableCell>
                <TableCell>Timestamp</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {versions.map((version) => (
                <TableRow key={version.id}>
                  <TableCell>{version.versionNumber}</TableCell>
                  <TableCell>
                    {new Date(version.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {version.description ? version.description : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      onClick={() => onRollbackVersion(version.id)}
                    >
                      Rollback
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>

      <DialogActions>
        <Button color="error" variant="contained" onClick={onRollbackOriginal}>
          Rollback to Original
        </Button>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VersionControlModal;
