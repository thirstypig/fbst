import { Router } from "express";
import { prisma } from "../../db/prisma.js";

const router = Router();

// GET /api/periods - list all periods with an isActive flag
router.get("/", async (req, res) => {
  try {
    const periods = await prisma.period.findMany({
      orderBy: { startDate: "asc" },
    });

    const data = periods.map((p) => ({
      id: p.id,
      name: p.name,
      startDate: p.startDate,
      endDate: p.endDate,
      status: p.status,
      isActive: p.status === "active",
    }));

    res.json({ data });
  } catch (e) {
    console.error("Error fetching periods:", e);
    res.status(500).json({ error: "Failed to fetch periods" });
  }
});

export const periodsRouter = router;
export default periodsRouter;
