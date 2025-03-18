/**
 * @file components/JobStatus.tsx
 * @description
 * This component polls the backend for the current status of a proofreading job
 * based on the provided fileId. It displays the job status, version number, and
 * a visual indicator (progress bar) when the job is in progress. Additionally, it
 * allows the user to cancel the job via a cancel button.
 *
 * Key features:
 * - Polls the endpoint `/api/proofreading/status?fileId=...` every 5 seconds.
 * - Displays the proofreading status and current version number.
 * - Shows a LinearProgress indicator when the job is "in-progress".
 * - Provides a "Cancel Job" button that triggers a cancellation request.
 *
 * @dependencies
 * - React: for component state and effects.
 * - Material UI: for UI components (LinearProgress, Button, Typography, Box).
 *
 * @notes
 * - Make sure that the backend endpoint `/api/proofreading/status` is operational.
 * - The polling interval is set to 5000ms (5 seconds) but can be adjusted if needed.
 */

import React, { FC, useEffect, useState } from 'react';
import { Box, Button, LinearProgress, Typography } from '@mui/material';

export interface JobStatusProps {
  fileId: string;
}

export interface JobStatusData {
  proofreading_status: string;
  cancellation_requested: boolean;
  version_number: number;
}

const JobStatus: FC<JobStatusProps> = ({ fileId }) => {
  const [jobStatus, setJobStatus] = useState<JobStatusData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Function to fetch job status from the backend.
  const fetchJobStatus = async () => {
    try {
      const response = await fetch(`/api/proofreading/status?fileId=${fileId}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch job status.');
      }
      const data: JobStatusData = await response.json();
      setJobStatus(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Polling the job status every 5 seconds.
  useEffect(() => {
    fetchJobStatus();
    const intervalId = setInterval(() => {
      fetchJobStatus();
    }, 5000);
    return () => clearInterval(intervalId);
  }, [fileId]);

  // Handler for canceling the job.
  const handleCancelJob = async () => {
    try {
      const response = await fetch('/api/proofreading/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: fileId }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Cancellation failed.');
      }
      // After cancellation, update the job status
      fetchJobStatus();
    } catch (err: any) {
      setError(err.message || 'Cancellation error.');
    }
  };

  return (
    <Box sx={{ my: 2, p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
      <Typography variant="h6">Job Status</Typography>
      {loading ? (
        <Typography variant="body1">Loading job status...</Typography>
      ) : error ? (
        <Typography variant="body1" color="error">
          {error}
        </Typography>
      ) : jobStatus ? (
        <Box>
          <Typography variant="body1">
            Status: <strong>{jobStatus.proofreading_status}</strong>
          </Typography>
          <Typography variant="body1">
            Version: <strong>{jobStatus.version_number}</strong>
          </Typography>
          {jobStatus.proofreading_status === 'in-progress' && (
            <Box sx={{ my: 1 }}>
              <LinearProgress />
            </Box>
          )}
          {jobStatus.proofreading_status !== 'complete' &&
            jobStatus.proofreading_status !== 'failed' &&
            jobStatus.proofreading_status !== 'canceled' && (
              <Button
                variant="outlined"
                color="error"
                onClick={handleCancelJob}
                sx={{ mt: 1 }}
              >
                Cancel Job
              </Button>
            )}
        </Box>
      ) : (
        <Typography variant="body1">No job status available.</Typography>
      )}
    </Box>
  );
};

export default JobStatus;
