const API_BASE = 'http://localhost:8080/api';

export const api = {
  async submitJob(fastaSequence: string, fastaFilename: string) {
    const response = await fetch(`${API_BASE}/jobs/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fastaSequence, fastaFilename }),
    });
    if (!response.ok) throw new Error('Error submitting job');
    return response.json();
  },

  async getJobStatus(jobId: string) {
    const response = await fetch(`${API_BASE}/jobs/${jobId}/status`);
    if (!response.ok) throw new Error('Error getting job status');
    return response.json();
  },

  async getJobOutputs(jobId: string) {
    const response = await fetch(`${API_BASE}/jobs/${jobId}/outputs`);
    if (!response.ok) throw new Error('Error getting job outputs');
    return response.json();
  },
  
  async getJobHistory() {
    const response = await fetch(`${API_BASE}/jobs/history`);
    if (!response.ok) throw new Error('Error fetching history');
    return response.json();
  }
};
