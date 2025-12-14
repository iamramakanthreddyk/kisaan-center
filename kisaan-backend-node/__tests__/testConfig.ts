// Centralized test config for API base URL
export const API_BASE = (
	process.env.API_BASE ||
	process.env.API_BASE_URL ||
	process.env.VITE_API_BASE_URL ||
	process.env.BACKEND_URL ||
	'http://localhost:3000/api'
);
