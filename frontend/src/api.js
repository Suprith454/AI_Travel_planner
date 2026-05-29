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
  patch: (tripId, body) => request(`/trips/${tripId}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (tripId) => request(`/trips/${tripId}`, { method: "DELETE" }),
  share: (tripId) => request(`/trips/${tripId}/share`, { method: "POST" }),
  shareViaEmail: (tripId, recipientEmail, userId) =>
    request(`/trips/share-email?user_id=${userId}`, { method: "POST", body: JSON.stringify({ recipient_email: recipientEmail, trip_id: tripId }) }),
  duplicate: (tripId) => request(`/trips/${tripId}/duplicate`, { method: "POST" }),
};

export const chat = {
  plan: (message, userId, history = []) => request("/chat/plan", { method: "POST", body: JSON.stringify({ message, user_id: userId, history }) }),
  ask: (tripId, question, history) => request("/chat/ask", { method: "POST", body: JSON.stringify({ trip_id: tripId, question, history }) }),
};

export const weather = {
  get: (lat, lng, date) => request(`/weather?lat=${lat}&lng=${lng}${date ? `&date=${date}` : ""}`),
};

export const nearby = {
  search: (lat, lng, radius = 500, category = "") =>
    request(`/nearby?lat=${lat}&lng=${lng}&radius=${radius}${category ? `&category=${category}` : ""}`),
};

export const tools = {
  budgetAnalyze: (destination, days, travelers = 1, budget = null, tier = "mid") => {
    let url = `/budget/analyze?destination=${encodeURIComponent(destination)}&days=${days}&travelers=${travelers}&tier=${tier}`;
    if (budget) url += `&budget=${budget}`;
    return request(url);
  },
  multiTier: (destination, days, travelers = 1) =>
    request(`/budget/multi-tier?destination=${encodeURIComponent(destination)}&days=${days}&travelers=${travelers}`),
  getaways: (location, budget = null, days = 2) => {
    let url = `/getaways/nearby?location=${encodeURIComponent(location)}&days=${days}`;
    if (budget) url += `&budget=${budget}`;
    return request(url);
  },
  packingList: (destination, days, climate = "hot", international = false, religious_sites = false) =>
    request(`/packing-list?destination=${encodeURIComponent(destination)}&days=${days}&climate=${climate}&international=${international}&religious_sites=${religious_sites}`),
  emergency: (country = "india") =>
    request(`/emergency?country=${encodeURIComponent(country)}`),
  hiddenGems: (destination) =>
    request(`/hidden-gems?destination=${encodeURIComponent(destination)}`),
};
