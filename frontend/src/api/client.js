const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('medishield_token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res) {
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Server returned an invalid response.');
  }
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export async function register(name, email, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse(res);
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
}

export async function uploadPolicy(file) {
  const formData = new FormData();
  formData.append('policy', file);

  const res = await fetch(`${API_BASE}/policies/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return handleResponse(res);
}

export async function analyzeBill(file) {
  const formData = new FormData();
  formData.append('bill', file);

  const res = await fetch(`${API_BASE}/audit/analyze`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return handleResponse(res);
}

export async function runDemoAudit() {
  const res = await fetch(`${API_BASE}/audit/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({}),
  });
  return handleResponse(res);
}

export async function saveDisputeLetter(sessionId, generatedAppealLetter) {
  const res = await fetch(`${API_BASE}/audit/sessions/${sessionId}/letter`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ generatedAppealLetter }),
  });
  return handleResponse(res);
}

export async function fetchSessions() {
  const res = await fetch(`${API_BASE}/audit/sessions`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function fetchSession(id) {
  const res = await fetch(`${API_BASE}/audit/sessions/${id}`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return handleResponse(res);
}
