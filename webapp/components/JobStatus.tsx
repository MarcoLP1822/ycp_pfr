import React, { FC, useEffect, useState } from 'react';
import { Paper, Button, LinearProgress, Typography } from '@mui/material';

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

  useEffect(() => {
    fetchJobStatus();
    const intervalId = setInterval(() => {
      fetchJobStatus();
    }, 5000);
    return () => clearInterval(intervalId);
  }, [fileId]);

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
      fetchJobStatus();
    } catch (err: any) {
      setError(err.message || 'Cancellation error.');
    }
  };

  if (loading) {
    return <Typography>Loading job status...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (!jobStatus) {
    return <Typography>No job status available.</Typography>;
  }

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6">Job Status</Typography>
      <Typography>
        Status: <strong>{jobStatus.proofreading_status}</strong>
      </Typography>
      <Typography>
        Version: <strong>{jobStatus.version_number}</strong>
      </Typography>
      {jobStatus.proofreading_status === 'in-progress' && (
        <LinearProgress sx={{ my: 1 }} />
      )}
      {jobStatus.proofreading_status !== 'complete' &&
        jobStatus.proofreading_status !== 'failed' &&
        jobStatus.proofreading_status !== 'canceled' && (
          <Button variant="outlined" color="error" onClick={handleCancelJob} sx={{ mt: 1 }}>
            Cancel Job
          </Button>
        )}
    </Paper>
  );
};

export default JobStatus;
