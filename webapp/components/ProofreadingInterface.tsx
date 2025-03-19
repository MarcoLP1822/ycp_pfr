import React, { FC, MouseEvent } from 'react';
import { Paper, Typography, Box } from '@mui/material';

export interface ProofreadingInterfaceProps {
  originalText: string;
  correctedText: string;
  onAcceptIndividual?: (correctionIdentifier: string) => void;
  onAcceptAll?: () => void;
}

const ProofreadingInterface: FC<ProofreadingInterfaceProps> = ({
  originalText,
  correctedText,
  onAcceptIndividual,
  onAcceptAll,
}) => {
  const handleCorrectionClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!onAcceptIndividual) return;
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'mark') {
      const correctionId =
        target.getAttribute('data-correction-id') || target.textContent || '';
      if (correctionId) {
        onAcceptIndividual(correctionId);
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
      {/* Original Text */}
      <Paper sx={{ p: 2, flex: 1, overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Original Text
        </Typography>
        <Box
          component="textarea"
          readOnly
          value={originalText}
          sx={{
            width: '100%',
            height: 300,
            resize: 'none',
            border: '1px solid #ccc',
            p: 1,
          }}
        />
      </Paper>

      {/* Corrected Text */}
      <Paper
        sx={{ p: 2, flex: 1, overflow: 'auto' }}
        onClick={handleCorrectionClick}
      >
        <Typography variant="h6" gutterBottom>
          Corrected Text
        </Typography>
        <Box
          sx={{
            width: '100%',
            height: 300,
            overflowY: 'auto',
            border: '1px solid #ccc',
            p: 1,
          }}
          dangerouslySetInnerHTML={{ __html: correctedText }}
        />
      </Paper>
    </Box>
  );
};

export default ProofreadingInterface;
