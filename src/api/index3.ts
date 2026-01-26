import axios from "axios";
import type { AxiosInstance } from "axios";

const api3: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_APP_API2_URL,
});

export default api3;