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

export async function paymentQr(
  amount_nano: number,
  min_amount_nano: number,
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.post(
      `/payment/qr`,
      {
        amount_nano: Number(amount_nano),
        min_amount_nano: Number(min_amount_nano),
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

export async function generateQrCode(
  data: string
) {
  try {
    const link = `https://api.qrserver.com/v1/create-qr-code/?size=210x210&data=${data}`
    return link;
  } catch {
    return false;
  }
}

export async function withdrawRef(
  type: string,
) {
  try {
    const initData = Cookies.get("init-data");
    const response = await api.post(
      `/rs_withdraw`,
      { type: type },
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