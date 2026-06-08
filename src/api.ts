import axios from 'axios';

// Yeh env file se IP uthayega, aur backup k tor par direct IP bhi set hai
const API_URL = import.meta.env.VITE_API_URL || 'http://192.168.100.28:5000/api';

const API = axios.create({
  baseURL: API_URL,
});

// Yeh function check karega k agar user logged in hai, tou token bhej de
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;