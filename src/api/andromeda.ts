import axios from "axios";
import type { AxiosInstance } from "axios";

const andromeda: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_APP_API_ANDROMEDA_URL,
});

export default andromeda;