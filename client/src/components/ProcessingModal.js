import React from 'react';
import { 
  Modal, 
  Box, 
  Typography, 
  CircularProgress,
  Button
} from '@mui/material';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  textAlign: 'center'
};

const ProcessingModal = ({ isOpen, onClose, requestId }) => {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      aria-labelledby="processing-modal-title"
      aria-describedby="processing-modal-description"
    >
      <Box sx={modalStyle}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography id="processing-modal-title" variant="h6" component="h2" gutterBottom>
          Processing Your Audio
        </Typography>
        <Typography id="processing-modal-description" sx={{ mt: 2, mb: 3 }}>
          Your audio is being analyzed. This may take up to 1-2 minutes depending on the length of your recording.
        </Typography>
        <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
          Request ID: {requestId}
        </Typography>
        <Button 
          variant="outlined" 
          onClick={onClose} 
          sx={{ mt: 2 }}
        >
          Cancel
        </Button>
      </Box>
    </Modal>
  );
};

export default ProcessingModal;
