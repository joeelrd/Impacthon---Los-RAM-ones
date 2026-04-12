const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export const api = {
  async register(data: { name: string; email: string; password: string }) {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Error en el registro');
    }
    return response.json();
  },

  async login(data: { email: string; password: string }) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Credenciales incorrectas');
    }
    return response.json();
  },

  async submitJob(fastaSequence: string, fastaFilename: string, userId?: number) {
    const response = await fetch(`${API_BASE}/jobs/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fastaSequence, fastaFilename, userId }),
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
  
  async getJobHistory(userId?: number) {
    const url = userId ? `${API_BASE}/jobs/history?userId=${userId}` : `${API_BASE}/jobs/history`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Error fetching history');
    return response.json();
  },

  async getProteins() {
    const response = await fetch(`${API_BASE}/jobs/proteins`);
    if (!response.ok) throw new Error('Error fetching proteins');
    return response.json();
  },

  async getProteinDetails(proteinId: string) {
    const response = await fetch(`${API_BASE}/jobs/proteins/${proteinId}`);
    if (!response.ok) throw new Error('Error fetching protein details');
    return response.json();
  },

  async getJobAccounting(jobId: string) {
    const response = await fetch(`${API_BASE}/jobs/${jobId}/accounting`);
    if (!response.ok) throw new Error('Error fetching accounting details');
    return response.json();
  },

  async getGlobalStats() {
    const response = await fetch(`${API_BASE}/jobs/proteins/stats`);
    if (!response.ok) throw new Error('Error fetching global stats');
    return response.json();
  },

  async getProteinSamples() {
    const response = await fetch(`${API_BASE}/jobs/proteins/samples`);
    if (!response.ok) throw new Error('Error fetching protein samples');
    return response.json();
  },

  async askGemini(message: string, context: Record<string, any>) {
    const response = await fetch(`${API_BASE}/chat/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context }),
    });
    if (!response.ok) throw new Error('Error en consulta de chat');
    return response.json();
  },

  // --- Saved Proteins ---

  async getSavedProteinCount(userId: number) {
    const response = await fetch(`${API_BASE}/saved-proteins/count?userId=${userId}`);
    if (!response.ok) throw new Error('Error fetching saved protein count');
    return response.json(); // { count, limit, isPremium }
  },

  async getSavedProteins(userId: number) {
    const response = await fetch(`${API_BASE}/saved-proteins?userId=${userId}`);
    if (!response.ok) throw new Error('Error fetching saved proteins');
    return response.json();
  },

  async saveProtein(data: {
    userId: number;
    proteinName: string;
    pdbData: string;
    fastaSequence?: string;
    jobId?: string;
  }) {
    const response = await fetch(`${API_BASE}/saved-proteins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (response.status === 429) {
      const err = await response.json();
      throw Object.assign(new Error(err.message || 'Límite alcanzado'), { limitReached: true, ...err });
    }
    if (!response.ok) throw new Error('Error al guardar proteína');
    return response.json();
  },

  async deleteSavedProtein(id: number, userId: number) {
    const response = await fetch(`${API_BASE}/saved-proteins/${id}?userId=${userId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Error al eliminar proteína');
    return response.json();
  },
};

