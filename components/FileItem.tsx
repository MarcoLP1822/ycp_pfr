/**
 * @file components/FileItem.tsx
 * @description
 * Represents an individual file item in the list using Material UI. 
 * Now pressing Enter in the rename text field will confirm the rename.
 *
 * Key features:
 * - Uses MUI Card, CardContent, CardActions for layout
 * - Inline rename with a TextField
 * - Press Enter to confirm rename
 * - Delete confirmation dialog
 * - Proofread and Version History buttons
 *
 * @dependencies
 * - React: For state management
 * - Material UI: Card, CardContent, CardActions, Button, Typography, TextField, Dialog, etc.
 * - onDelete callback triggers the actual file deletion in the parent
 *
 * @notes
 * - We detect Enter in the text field with onKeyDown. If e.key === 'Enter', we call handleRename().
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { FileData } from './FileList';

interface FileItemProps {
  file: FileData;
  onRename: (fileId: string, newName: string) => void;
  onDelete: (fileId: string) => void;
  onProofread: (fileId: string) => void;
  onViewVersions: (fileId: string) => void;
}

const FileItem: React.FC<FileItemProps> = ({
  file,
  onRename,
  onDelete,
  onProofread,
  onViewVersions,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(file.file_name);

  // State to control the delete confirmation dialog
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  /**
   * Handles the rename action when user finishes editing.
   * If there's a valid, changed name, calls onRename callback.
   */
  const handleRename = () => {
    if (newName.trim() && newName !== file.file_name) {
      onRename(file.file_id, newName);
    }
    setIsEditing(false);
  };

  // Called when the user clicks the "Delete" button
  const handleDeleteClick = () => {
    setConfirmDeleteOpen(true);
  };

  // Called when the user confirms deletion in the dialog
  const handleConfirmDelete = () => {
    onDelete(file.file_id);
    setConfirmDeleteOpen(false);
  };

  // Called when the user cancels deletion in the dialog
  const handleCancelDelete = () => {
    setConfirmDeleteOpen(false);
  };

  return (
    <>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          {isEditing ? (
            <TextField
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              autoFocus
              size="small"
              label="File name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault(); // prevent form submission or any default
                  handleRename();
                }
              }}
            />
          ) : (
            <Typography variant="subtitle1" fontWeight="bold">
              {file.file_name}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {file.file_type.toUpperCase()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Status: {file.proofreading_status}
          </Typography>
        </CardContent>
        <CardActions>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setIsEditing(true)}
          >
            RINOMINA
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={handleDeleteClick}
          >
            ELIMINA
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => onProofread(file.file_id)}
          >
            PROOFREAD
          </Button>
          <Button
            size="small"
            variant="contained"
            color="secondary"
            onClick={() => onViewVersions(file.file_id)}
          >
            VERSION HISTORY
          </Button>
        </CardActions>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={handleCancelDelete}
        aria-labelledby="confirm-delete-dialog-title"
        aria-describedby="confirm-delete-dialog-description"
      >
        <DialogTitle id="confirm-delete-dialog-title">
          Conferma eliminazione
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-delete-dialog-description">
            Sei sicuro di voler eliminare <strong>{file.file_name}</strong>?
            Questa azione è irreversibile.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Annulla</Button>
          <Button onClick={handleConfirmDelete} autoFocus color="error" variant="contained">
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FileItem;
