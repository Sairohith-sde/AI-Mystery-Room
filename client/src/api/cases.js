import api from './client';

export async function createCase(payload, config = {}) {
  const response = await api.post('/api/cases', payload, config);
  return response.data.case;
}

export async function fetchCase(id) {
  const response = await api.get(`/api/cases/${id}`);
  return response.data.case;
}

export async function discoverClue(caseId, clueId) {
  const response = await api.post(`/api/cases/${caseId}/clues/${clueId}/discover`);
  return response.data;
}

export async function requestHint(caseId) {
  const response = await api.post(`/api/cases/${caseId}/hints`);
  return response.data;
}

export async function accuseCase(caseId, suspectId) {
  const response = await api.post(`/api/cases/${caseId}/accuse`, { suspectId });
  return response.data;
}

export async function fetchResult(caseId) {
  const response = await api.get(`/api/cases/${caseId}/result`);
  return response.data.result;
}