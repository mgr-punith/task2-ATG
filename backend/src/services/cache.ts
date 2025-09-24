import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();
const r = new Redis(process.env.REDIS_URL);

export const cache = {
  get: async (k: string) => {
    const v = await r.get(k);
    return v ? JSON.parse(v) : null;
  },
  set: async (k: string, val: any, ttl = 15) => {
    await r.set(k, JSON.stringify(val), "EX", ttl);
  }
};
