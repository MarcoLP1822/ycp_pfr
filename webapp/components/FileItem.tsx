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

export interface FileItemProps {
  file: FileData;
  onRename: (fileId: string, newName: string) => void;
  onDelete: (fileId: string) => void;
  onProofread: (fileId: string) => void;
  onViewVersions: (fileId: string) => void;
  onViewCurrent: (fileId: string) => void;
  isProofreading?: boolean;
}

const FileItem: React.FC<FileItemProps> = ({
  file,
  onRename,
  onDelete,
  onProofread,
  onViewVersions,
  onViewCurrent,
  isProofreading = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(file.file_name);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleRename = () => {
    if (newName.trim() && newName !== file.file_name) {
      onRename(file.file_id, newName);
    }
    setIsEditing(false);
  };

  const handleDeleteClick = () => {
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    onDelete(file.file_id);
    setConfirmDeleteOpen(false);
  };

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
            color="error"
            onClick={handleDeleteClick}
          >
            Elimina
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setIsEditing(true)}
          >
            Rinomina
          </Button>
          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={() => onProofread(file.file_id)}
          >
            {isProofreading ? 'ANNULLA' : 'Avvia correzione'}
          </Button>
          <Button
            size="small"
            variant="contained"
            color="info"
            onClick={() => onViewCurrent(file.file_id)}
          >
            Vedi Versione Corrente
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => onViewVersions(file.file_id)}
          >
            Version History
          </Button>
        </CardActions>
      </Card>

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
            Are you sure you want to delete <strong>{file.file_name}</strong>? This action cannot be undone.
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
