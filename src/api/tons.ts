import andromeda from "./andromeda";

type Currency = "TON";

export async function rates(currency: Currency) {
  try {
    const apiKey = import.meta.env.VITE_APP_API_ANDROMEDA_KEY;

    if (!apiKey) {
      return false;
    }

    const response = await andromeda.get("/rates", {
      params: { currency },
      headers: {
        "X-Api-Key": apiKey,
      },
    });

    if (response.status === 200) {
      return response.data;
    }

    return false;
  } catch (e) {
    console.error("Andromeda /rates error:", e);
    return false;
  }
}