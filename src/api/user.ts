import api from "./index";
import Cookies from "js-cookie";

export async function init(initData: string) {
  try {
    const response = await api.post(
      "/init",
      {},
      { headers: { "X-Init-Data": initData } }
    );

    if (response.status === 200) {
      Cookies.set("init-data", initData);
      return response.data;
    }
    return false;
  } catch {
    return false;
  }
}

export async function referrals(
  offset: number,
  limit: number
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.get(
      "/users/referrals" +
      "?offset=" + offset +
      "&limit=" + limit,
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

export async function leaderboard(
  offset: number,
  limit: number
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.get(
      "/top-volume" +
      "?offset=" + offset +
      "&limit=" + limit,
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

export async function rank() {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.get(
      "/top-volume/rank",
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