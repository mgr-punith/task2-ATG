import { Router } from "express";
import { cache } from "../services/cache";
const router = Router();

router.get("/:coin", async (req, res) => {
  const coin = req.params.coin;
  const data = await cache.get(`price:${coin}`);
  res.json(data ?? { error: "no-data" });
});

export default router;
