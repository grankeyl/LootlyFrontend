import api from "./index";
import Cookies from "js-cookie";

export async function cases() {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.get(
      "/cases",
      { headers: { "X-Init-Data": initData } }
    );
    if (response.status === 200) {
      return response.data;
    }
    return false;
  } catch {
    return false;
  }
}

export async function tasksCase(
  id: number
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.get(
      `/task-case/${id}`,
      { headers: { "X-Init-Data": initData } }
    );
    if (response.status === 200) {
      return response.data;
    }
    return false;
  } catch {
    return false;
  }
}

export async function rewards(
  id: number
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.get(
      `/cases/${id}/rewards`,
      { headers: { "X-Init-Data": initData } }
    );
    if (response.status === 200) {
      return response.data;
    }
    return false;
  } catch {
    return false;
  }
}

export async function open(
  id: string
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.post(
      `/cases/${id}/open`,
      { },
      { headers: { "X-init-data": initData } }
    );
    if (response.status === 200) {
      return response.data;
    }
    return false;
  } catch {
    return false;
  }
}

export async function quick_sell(
  id: string
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.post(
      `/inventory/${id}/sell`,
      { },
      { headers: { "X-init-data": initData } }
    );
    if (response.status === 200) {
      return response.data;
    }
    return false;
  } catch {
    return false;
  }
}

export async function inventory(
  status: string,
  limit: number,
  offset: number
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.get(
      `/inventory` +
      `?status=${status}` +
      `&limit=${limit}` +
      `&offset=${offset}`,
      { headers: { "X-init-data": initData } }
    );
    if (response.status === 200) {
      return response.data;
    }
    return false;
  } catch {
    return false;
  }
}