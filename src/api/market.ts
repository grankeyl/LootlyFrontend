import api from "./index";
import Cookies from "js-cookie";

export async function items(
  sort: string,
  limit: number,
  offset: number
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.get(
      `/market-items` +
      `?sort=${sort}` +
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

export async function buy(
  id: string
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.post(
      `/market/purchase`,
      { item_id: id },
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

export async function item(
  id: string
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.get(
      `/market/item/${id}`,
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