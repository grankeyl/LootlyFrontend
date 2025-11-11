import axios from "axios";
import type { AxiosInstance } from "axios";

const api2: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_APP_API_URL.replace('/api/v1', '/api/v0'),
});

export default api2;