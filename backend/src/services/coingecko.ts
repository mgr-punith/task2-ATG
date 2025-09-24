import axios from "axios";
const BASE = "https://api.coingecko.com/api/v3";

export async function fetchPrices(coins: string[], vs = "usd") {
  if (!coins.length) return {};
  const ids = coins.join(",");
  const res = await axios.get(`${BASE}/simple/price`, {
    params: { ids, vs_currencies: vs }
  });
  return res.data;
}
