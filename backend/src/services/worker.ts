import { io as IOServer } from "socket.io";
import { fetchPrices } from "./coingecko";
import { cache } from "./cache";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();
const POLL = Number(process.env.POLL_INTERVAL_MS || 10000);

export function startWorker(io: IOServer) {
  setInterval(async () => {
    try {
      const alerts = await prisma.alert.findMany({ where: { enabled: true } });
      const coins = Array.from(new Set(alerts.map(a => a.coinId)));
      if (coins.length === 0) return;

      const prices = await fetchPrices(coins, "usd");
      for (const coin of coins) {
        const pObj = prices[coin];
        if (!pObj) continue;
        const price = pObj["usd"];
        await cache.set(`price:${coin}`, { price, ts: Date.now() }, 15);

        // simple evaluation: for PRICE_ABOVE or PRICE_BELOW only
        const coinAlerts = alerts.filter(a => a.coinId === coin);
        for (const a of coinAlerts) {
          if (!a.enabled) continue;
          if (a.type === "PRICE_ABOVE" && price > a.threshold) {
            await prisma.alertHistory.create({ data: { alertId: a.id, price }});
            io.to(`coin:${coin}`).emit("alert", { alertId: a.id, coin, price });
          }
          if (a.type === "PRICE_BELOW" && price < a.threshold) {
            await prisma.alertHistory.create({ data: { alertId: a.id, price }});
            io.to(`coin:${coin}`).emit("alert", { alertId: a.id, coin, price });
          }
        }

        // broadcast price update to room
        io.to(`coin:${coin}`).emit("price:update", { coin, price, ts: Date.now() });
      }
    } catch (err) {
      console.error("worker error", err);
    }
  }, POLL);
}
