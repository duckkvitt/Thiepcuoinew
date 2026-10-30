const API_URL = import.meta.env.VITE_API_URL || '/api';
const slug = 'hoang-long-bao-ngoc';

async function request(path, options) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Không thể kết nối máy chủ.');
    error.status = response.status;
    throw error;
  }
  return data;
}

async function adminRequest(path, { token, ...options } = {}) {
  const response = await fetch(`${API_URL}/admin${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Không thể kết nối máy chủ.');
    error.status = response.status;
    throw error;
  }
  return data;
}

async function adminUpload(token, file) {
  const response = await fetch(`${API_URL}/admin/uploads`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': file.type
    },
    body: file
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'Không thể tải ảnh lên máy chủ.');
    error.status = response.status;
    throw error;
  }
  return data;
}

export const invitationApi = {
  getInvitation: () => request(`/invitations/${slug}`),
  getWishes: () => request(`/invitations/${slug}/wishes`),
  createWish: (payload) => request(`/invitations/${slug}/wishes`, { method: 'POST', body: JSON.stringify(payload) }),
  createRsvp: (payload) => request(`/invitations/${slug}/rsvps`, { method: 'POST', body: JSON.stringify(payload) })
};

export const adminApi = {
  login: (username, password) => adminRequest('/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  getInvitation: (token) => adminRequest(`/invitations/${slug}`, { token }),
  updateInvitation: (token, payload) => adminRequest(`/invitations/${slug}`, { token, method: 'PUT', body: JSON.stringify(payload) }),
  getSubmissions: (token) => adminRequest(`/invitations/${slug}/submissions`, { token }),
  uploadImage: (token, file) => adminUpload(token, file),
  updateWish: (token, id, isVisible) => adminRequest(`/invitations/${slug}/wishes/${id}`, {
    token, method: 'PATCH', body: JSON.stringify({ isVisible })
  }),
  deleteWish: (token, id) => adminRequest(`/invitations/${slug}/wishes/${id}`, { token, method: 'DELETE' })
};
