/**
 * @file components/FileItem.tsx
 * @description
 * Represents an individual file item in the list using Material UI.
 * We now have a new button “View Current” that calls onViewCurrent.
 *
 * Key features:
 * - Inline rename with a TextField
 * - Delete confirmation dialog
 * - Proofread triggers re-proofreading
 * - Version History opens the modal
 * - NEW: “View Current” to open the existing version at /proofreading/[fileId]
 *
 * @dependencies
 * - React
 * - Material UI
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
  onViewCurrent: (fileId: string) => void; // NEW
}

const FileItem: React.FC<FileItemProps> = ({
  file,
  onRename,
  onDelete,
  onProofread,
  onViewVersions,
  onViewCurrent,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(file.file_name);

  // State to control the delete confirmation dialog
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Called to finalize the rename
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleRename();
                }
              }}
              autoFocus
              size="small"
              label="File name"
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
            Rename
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={handleDeleteClick}
          >
            Delete
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => onProofread(file.file_id)}
          >
            Proofread
          </Button>
          <Button
            size="small"
            variant="contained"
            color="info"
            onClick={() => onViewCurrent(file.file_id)}
          >
            View Current
          </Button>
          <Button
            size="small"
            variant="contained"
            color="secondary"
            onClick={() => onViewVersions(file.file_id)}
          >
            Version History
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
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-delete-dialog-description">
            Are you sure you want to delete <strong>{file.file_name}</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button onClick={handleConfirmDelete} autoFocus color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FileItem;
