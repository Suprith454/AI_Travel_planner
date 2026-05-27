const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const auth = {
  signup: (data) => request("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
  login: (data) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
};

export const trips = {
  generate: (data, userId) =>
    request(`/trips/generate?user_id=${userId}`, { method: "POST", body: JSON.stringify(data) }),
  list: (userId) => request(`/trips/?user_id=${userId}`),
  get: (tripId) => request(`/trips/${tripId}`),
  delete: (tripId) => request(`/trips/${tripId}`, { method: "DELETE" }),
};

export const photos = {
  search: (query) => request(`/photos?query=${encodeURIComponent(query)}`),
};
