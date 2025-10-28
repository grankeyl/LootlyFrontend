import api from "./index";
import Cookies from "js-cookie";

export async function connect(
  address: string
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.post(
      `/wallet/connect`,
      { address: address },
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

export async function disconnect(
  address: string
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.post(
      `/wallet/disconnect`,
      { address: address },
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

export async function deposit() {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.get(
      `/deposit`,
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