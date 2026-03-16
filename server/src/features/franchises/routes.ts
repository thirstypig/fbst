import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.js";
import { requireAuth, requireFranchiseCommissioner } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { validateBody } from "../../middleware/validate.js";

const router = Router();

/**
 * GET /api/franchises
 * List franchises the user has access to (via FranchiseMembership).
 */
router.get("/franchises", requireAuth, asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const memberships = await prisma.franchiseMembership.findMany({
    where: { userId },
    include: {
      franchise: {
        select: {
          id: true,
          name: true,
          isPublic: true,
          publicSlug: true,
        },
      },
    },
  });

  const franchises = memberships.map((m) => ({
    ...m.franchise,
    role: m.role,
  }));

  return res.json({ franchises });
}));

/**
 * GET /api/franchises/:id
 * Franchise detail + list of seasons (League rows).
 */
router.get("/franchises/:id", requireAuth, asyncHandler(async (req, res) => {
  const franchiseId = Number(req.params.id);
  if (!Number.isFinite(franchiseId)) {
    return res.status(400).json({ error: "Invalid franchise ID" });
  }

  const franchise = await prisma.franchise.findUnique({
    where: { id: franchiseId },
    select: {
      id: true,
      name: true,
      isPublic: true,
      publicSlug: true,
      tradeReviewPolicy: true,
      vetoThreshold: true,
      createdAt: true,
      updatedAt: true,
      leagues: {
        select: { id: true, name: true, season: true, draftMode: true },
        orderBy: { season: "desc" },
      },
    },
  });

  if (!franchise) {
    return res.status(404).json({ error: "Franchise not found" });
  }

  // Check access: must be member or admin
  if (!req.user!.isAdmin) {
    const membership = await prisma.franchiseMembership.findUnique({
      where: { franchiseId_userId: { franchiseId, userId: req.user!.id } },
    });
    if (!membership) {
      return res.status(403).json({ error: "Not a member of this franchise" });
    }
  }

  return res.json({ franchise });
}));

const updateFranchiseSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isPublic: z.boolean().optional(),
  tradeReviewPolicy: z.enum(["COMMISSIONER", "LEAGUE_VOTE"]).optional(),
  vetoThreshold: z.number().int().min(1).max(20).optional(),
});

/**
 * PATCH /api/franchises/:id
 * Update org-level settings. Requires franchise commissioner or admin.
 */
router.patch("/franchises/:id", requireAuth, requireFranchiseCommissioner("id"), validateBody(updateFranchiseSchema), asyncHandler(async (req, res) => {
  const franchiseId = Number(req.params.id);
  const { name, isPublic, tradeReviewPolicy, vetoThreshold } = req.body;

  const data: {
    name?: string;
    isPublic?: boolean;
    tradeReviewPolicy?: string;
    vetoThreshold?: number;
  } = {};
  if (name !== undefined) data.name = name;
  if (isPublic !== undefined) data.isPublic = isPublic;
  if (tradeReviewPolicy !== undefined) data.tradeReviewPolicy = tradeReviewPolicy;
  if (vetoThreshold !== undefined) data.vetoThreshold = vetoThreshold;

  const franchise = await prisma.franchise.update({
    where: { id: franchiseId },
    data,
    select: {
      id: true,
      name: true,
      isPublic: true,
      publicSlug: true,
      tradeReviewPolicy: true,
      vetoThreshold: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return res.json({ franchise });
}));

export const franchiseRouter = router;
