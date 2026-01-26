import api3 from "./index3";
import Cookies from "js-cookie";

export async function items() {
  try {
    const initData = Cookies.get("init-data");
    const response = await api3.get(
      `/roulette/rewards`,
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

export async function config() {
  try {
    const initData = Cookies.get("init-data");
    const response = await api3.get(
      `/roulette/config`,
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

export async function rewards(id: string) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api3.get(
      `/roulette/rewards/${id}`,
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

export async function play(reward_id: string, chance_percent: number) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api3.post(
      `/roulette/play`,
      { reward_id, chance_percent },
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

export async function calculate(reward_id: string, chance_percent: number) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api3.post(
      `/roulette/calculate`,
      { reward_id, chance_percent },
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