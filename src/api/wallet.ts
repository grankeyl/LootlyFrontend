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

export async function deposit(
  min_amount_nano: number
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.post(
      `/deposit`,
      {
        min_amount_nano: min_amount_nano,
        ttl_seconds: 0
      },
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