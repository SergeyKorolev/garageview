import axios from "axios";

const client = axios.create({
  baseURL: "/api/v1",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Include CSRF token from Rails meta tag
client.interceptors.request.use((config) => {
  const token = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute("content");
  if (token) {
    config.headers["X-CSRF-Token"] = token;
  }
  return config;
});

export default client;
