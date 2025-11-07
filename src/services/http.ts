import axios from 'axios';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

if (import.meta.env.DEV) {
  http.defaults.baseURL = '/api-proxy';
}

export default http;