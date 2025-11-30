import api2 from "./index2";
import Cookies from "js-cookie";

export async function bet(
    amount: number,
    auto_cashout?: number
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api2.post(
      "/crash/bet",
      {
        amount: amount ?? 0,
        auto_cashout: auto_cashout ?? 0,
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

export async function cashout() {
  try {
    const initData = Cookies.get("init-data");
    const response = await api2.post(
      "/crash/cashout",
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