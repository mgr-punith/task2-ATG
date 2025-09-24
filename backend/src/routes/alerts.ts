import { Router } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const router = Router();

// create simple alert: body { email, coinId, type, threshold }
router.post("/", async (req, res) => {
  const { email, coinId, type, threshold } = req.body;
  if (!email || !coinId || !type)
    return res.status(400).json({ error: "missing" });

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) user = await prisma.user.create({ data: { email } });

  const alert = await prisma.alert.create({
    data: {
      userId: user.id,
      coinId,
      vsCurrency: "USD", // required
      type,
      threshold,
      enabled: true,
    },
  });

  res.json(alert);
});

// list by email
router.get("/user/:email", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { email: req.params.email },
    include: { alerts: true },
  });
  res.json(user ?? {});
});

export default router;
