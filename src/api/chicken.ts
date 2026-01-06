import api from "./index";
import Cookies from "js-cookie";

export async function init() {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.get(
      "/chicken/init",
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

export async function start(
  idempotencyKey: string,
  mode: string,
  amount: number
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.post(
      "/chicken/start",
      {
        mode: mode,
        amount: amount,
      },
      { 
        headers: { 
          "X-init-data": initData,
          "Idempotency-Key": idempotencyKey
        } 
      }
    );
    if (response.status === 200) {
      return response.data;
    }
    return false;
  } catch {
    return false;
  }
}

export async function step(
  idempotencyKey: string
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.post(
      "/chicken/step",
      { },
      { 
        headers: { 
          "X-init-data": initData,
          "Idempotency-Key": idempotencyKey
        } 
      }
    );
    if (response.status === 200) {
      return response.data;
    }
    return false;
  } catch {
    return false;
  }
}

export async function cashout(
  idempotencyKey: string
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.post(
      "/chicken/cashout",
      { },
      { 
        headers: { 
          "X-init-data": initData,
          "Idempotency-Key": idempotencyKey
        } 
      }
    );
    if (response.status === 200) {
      return response.data;
    }
    return false;
  } catch {
    return false;
  }
}