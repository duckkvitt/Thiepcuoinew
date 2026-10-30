const API_URL = import.meta.env.VITE_API_URL || '/api';
const slug = 'hoang-long-bao-ngoc';

async function request(path, options) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Không thể kết nối máy chủ.');
  return data;
}

export const invitationApi = {
  getInvitation: () => request(`/invitations/${slug}`),
  getWishes: () => request(`/invitations/${slug}/wishes`),
  createWish: (payload) => request(`/invitations/${slug}/wishes`, { method: 'POST', body: JSON.stringify(payload) }),
  createRsvp: (payload) => request(`/invitations/${slug}/rsvps`, { method: 'POST', body: JSON.stringify(payload) })
};
