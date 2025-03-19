import React, { useState } from 'react';
import {
  Paper,
  Box,
  Button,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions as DialogActionsMui,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
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
      {/* Paper invece di Card */}
      <Paper elevation={3} sx={{ mb: 2, p: 2 }}>
        {/* Sezione contenuto */}
        <Box sx={{ mb: 2 }}>
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
        </Box>

        {/* Sezione azioni */}
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <IconButton color="error" onClick={handleDeleteClick}>
            <DeleteIcon />
          </IconButton>

          <IconButton onClick={() => setIsEditing(true)}>
            <EditIcon />
          </IconButton>

          <Button
            size="small"
            variant="contained"
            color="error"
            onClick={() => onProofread(file.file_id)}
          >
            {isProofreading ? 'ANNULLA' : 'AVVIA CORREZIONE'}
          </Button>

          <Button
            size="small"
            variant="contained"
            color="info"
            onClick={() => onViewCurrent(file.file_id)}
          >
            VERSIONE CORRENTE
          </Button>

          <Button
            size="small"
            variant="outlined"
            onClick={() => onViewVersions(file.file_id)}
          >
            VERSION HISTORY
          </Button>
        </Box>
      </Paper>

      {/* Dialog di conferma eliminazione */}
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
        <DialogActionsMui>
          <Button onClick={handleCancelDelete}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            autoFocus
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActionsMui>
      </Dialog>
    </>
  );
};

export default FileItem;
