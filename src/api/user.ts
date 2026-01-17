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
    return response.data;
  } catch (e: any) {
    if (e?.response?.data) {
      return e.response.data;
    }
    return {
      "code": 503,
      "message": "maintenance",
      "ok": false
    };
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

export async function item(
  id: string
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.get(
      `/inventory/item/${id}`,
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

export async function itemWithdraw(
  id: string
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.get(
      `/inventory/withdraw/${id}`,
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

export async function onboarding() {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.post(
      `/onboarding`,
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

export async function onbalance() {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.post(
      `/onbalance`,
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

export async function langue(
  language: string
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.post(
      `/langue`,
      { language: language },
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