import { Server } from "socket.io";
import http from "http";
import express from "express";
import Redis from "ioredis";
import { prisma } from "./prisma";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const redis = new Redis();

let currentUserId: string;

//alerting the user
async function getOrCreateUser() {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: `guest-${Date.now()}@example.com`,
      },
    });
    console.log("Created new user:", user.email);
  }
  return user.id;
}

getOrCreateUser().then((id) => {
  currentUserId = id;
  console.log("Using user ID:", currentUserId);
});

io.on("connection", async (socket) => {
  console.log("socket connected", socket.id);

  // Send cached prices to the new client immediately
  const cachedPrices = await redis.get("prices");
  if (cachedPrices) {
    socket.emit("price_update", JSON.parse(cachedPrices));
  }

  socket.on("set_alert", async (data) => {
    console.log("Received new alert request:", data);
    try {
      if (!currentUserId) {
        console.error("User ID not available yet. Alert not saved.");
        return;
      }
      await prisma.alert.create({
        data: {
          userId: currentUserId,
          coinId: data.coin,
          threshold: parseFloat(data.threshold),
          type: data.type,
          enabled: true,
          vsCurrency: "usd",
        },
      });
      console.log("Alert saved successfully!");
    } catch (error) {
      console.error("Failed to save alert:", error);
    }
  });
});

// Fetch prices from CoinGecko API
async function fetchPricesFromApi() {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,dogecoin&vs_currencies=usd"
  );
  return res.json();
}

setInterval(async () => {
  try {
    let data;
    // Check for cached data first
    const cachedData = await redis.get("prices");
    if (cachedData) {
      data = JSON.parse(cachedData);
    } else {
      // If no cache, fetch from API
      data = await fetchPricesFromApi();
      console.log("Prices fetched from API:", data);
      await redis.set("prices", JSON.stringify(data), "EX", 30);
    }

    io.emit("price_update", data);
    const alerts = await prisma.alert.findMany({ where: { enabled: true } });
    console.log(`Checking ${alerts.length} alerts...`);

    for (const alert of alerts) {
      const coinId = alert.coinId.toLowerCase().trim();
      const price = data[coinId]?.usd;

      if (!price) {
        console.warn(`No price found for coinId: ${coinId}`);
        continue;
      }

      console.log(
        `Alert[${alert.id}] ${coinId} | type=${alert.type} | threshold=${alert.threshold} | current=${price}`
      );

      let triggered = false;
      if (alert.type === "PRICE_ABOVE" && price > alert.threshold) {
        triggered = true;
      }
      if (alert.type === "PRICE_BELOW" && price < alert.threshold) {
        triggered = true;
      }

      if (triggered) {
        const message = `${coinId} ${
          alert.type === "PRICE_ABOVE" ? "rose above" : "fell below"
        } ${alert.threshold}`;
        console.log("Triggered:", message);
        io.emit("alert_triggered", {
          coin: coinId,
          price,
          message,
        });
        await prisma.alertHistory.create({
          data: { alertId: alert.id, price },
        });
        await prisma.alert.update({
          where: { id: alert.id },
          data: { enabled: false },
        });
      }
    }
  } catch (err) {
    console.error("Error in price check loop:", err);
  }
}, 30000);

server.listen(4000, () =>
  console.log("Server running on http://localhost:4000")
);

