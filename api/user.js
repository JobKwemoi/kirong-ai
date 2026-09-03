// ============================================================
// 👑 KIRONG AI — USER / PLAN BRIDGE V1
// Exposes plan + usage info to the frontend (plan badge, limits)
// ============================================================

"use strict";

import { getOrCreateUser } from "../users.js";
import { getUsageSnapshot, getUserPlan } from "../plans.js";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Kirong-User-Id");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}

function getUserId(req) {
  const fromQuery = req.query?.userId;
  const fromHeader = req.headers["x-kirong-user-id"];
  return String(fromQuery || fromHeader || "anonymous").trim().slice(0, 100);
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  try {
    const userId = getUserId(req);
    const user = await getOrCreateUser(userId);
    const plan = getUserPlan(user);
    const usage = getUsageSnapshot(user);

    return res.status(200).json({
      ok: true,
      userId: user.userId,
      plan: plan.id,
      planLabel: plan.label,
      usage,
      subscription: user.subscription || null
    });
  } catch (error) {
    console.error("KIRONG USER ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Could not load account info.",
      code: "USER_SERVER_ERROR"
    });
  }
}

