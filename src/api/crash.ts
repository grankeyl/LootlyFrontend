import api2 from "./index2";
import Cookies from "js-cookie";

export async function bet(
    user_id: number,
    amount: number,
    auto_cashout?: number
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api2.post(
      "/crash/bet",
      {
        user_id: user_id ?? 0,
        amount: amount ?? 0,
        auto_cashout: auto_cashout ?? 0,
      },
      { headers: { "X-init-Data": initData } }
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
    user_id: number
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api2.post(
      "/crash/cashout",
      { user_id: user_id ?? 0 },
      { headers: { "X-init-Data": initData } }
    );
    if (response.status === 200) {
      return response.data;
    }
    return false;
  } catch {
    return false;
  }
}