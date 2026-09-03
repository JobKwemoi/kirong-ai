// ============================================================
// 👑 KIRONG AI — USER STORAGE V15
// Vercel Blob + User Profiles + Usage
// ============================================================

"use strict";

import {
  put,
  get
} from "@vercel/blob";

import {
  createDefaultUser,
  resetDailyUsageIfNeeded,
  normalizePlan
} from "./plans.js";

// ============================================================
// 🔐 ENVIRONMENT
// ============================================================

const TOKEN =
  process.env.BLOB_READ_WRITE_TOKEN;

// ============================================================
// 📁 USER STORAGE PREFIX
// ============================================================

const USER_PREFIX =
  "kirong-ai/users/";

// ============================================================
// 🔐 SAFE USER ID
// ============================================================

function safeId(id) {
  return String(id || "anonymous")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 100);
}

// ============================================================
// 📁 USER BLOB PATH
// ============================================================

function userPath(userId) {
  return `${USER_PREFIX}${safeId(userId)}.json`;
}

// ============================================================
// 🔐 REQUIRE BLOB TOKEN
// ============================================================

function requireToken() {
  if (!TOKEN) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is missing."
    );
  }
}

// ============================================================
// 📥 GET USER
// ============================================================

export async function getUser(userId) {
  requireToken();

  const id =
    safeId(userId);

  try {
    const result =
      await get(
        userPath(id),
        {
          token: TOKEN,
          access: "private",
          useCache: false
        }
      );

    if (
      !result ||
      result.statusCode !== 200 ||
      !result.stream
    ) {
      return null;
    }

    const text =
      await new Response(
        result.stream
      ).text();

    let user;

    try {
      user =
        JSON.parse(text);
    } catch {
      return null;
    }

    if (
      !user ||
      typeof user !== "object"
    ) {
      return null;
    }

    // --------------------------------------------------------
    // NORMALIZE ID
    // --------------------------------------------------------

    user.userId =
      safeId(
        user.userId || id
      );

    if (!user.id) {
      user.id =
        user.userId;
    }

    // --------------------------------------------------------
    // NORMALIZE USAGE + PLAN
    // --------------------------------------------------------

    resetDailyUsageIfNeeded(
      user
    );

    normalizePlan(
      user
    );

    return user;
  }

  catch (error) {
    const message =
      String(
        error?.message || ""
      ).toLowerCase();

    // --------------------------------------------------------
    // USER DOES NOT EXIST
    // --------------------------------------------------------

    if (
      error?.name ===
        "BlobNotFoundError" ||
      message.includes("not found") ||
      message.includes("does not exist") ||
      message.includes("404")
    ) {
      return null;
    }

    // --------------------------------------------------------
    // REAL STORAGE ERROR
    // --------------------------------------------------------

    throw error;
  }
}

// ============================================================
// 💾 SAVE USER
// ============================================================

export async function saveUser(user) {
  requireToken();

  if (
    !user ||
    typeof user !== "object"
  ) {
    throw new Error(
      "Invalid user object."
    );
  }

  if (!user.userId) {
    throw new Error(
      "Cannot save user without userId."
    );
  }

  // ----------------------------------------------------------
  // NORMALIZE ID
  // ----------------------------------------------------------

  user.userId =
    safeId(
      user.userId
    );

  if (!user.id) {
    user.id =
      user.userId;
  }

  // ----------------------------------------------------------
  // NORMALIZE USER STATE
  // ----------------------------------------------------------

  resetDailyUsageIfNeeded(
    user
  );

  normalizePlan(
    user
  );

  // ----------------------------------------------------------
  // TIMESTAMPS
  // ----------------------------------------------------------

  if (!user.createdAt) {
    user.createdAt =
      new Date().toISOString();
  }

  user.updatedAt =
    new Date().toISOString();

  // ----------------------------------------------------------
  // SAVE TO VERCEL BLOB
  // ----------------------------------------------------------

  const blob =
    await put(
      userPath(
        user.userId
      ),

      JSON.stringify(
        user,
        null,
        2
      ),

      {
        token: TOKEN,

        access: "private",

        contentType:
          "application/json",

        addRandomSuffix:
          false,

        allowOverwrite:
          true
      }
    );

  return {
    ...user,

    storageUrl:
      blob?.url || null
  };
}

// ============================================================
// 👤 GET OR CREATE USER
// ============================================================

export async function getOrCreateUser(
  userId
) {
  const id =
    safeId(userId);

  // ----------------------------------------------------------
  // TRY EXISTING USER
  // ----------------------------------------------------------

  let user =
    await getUser(id);

  if (user) {
    resetDailyUsageIfNeeded(
      user
    );

    normalizePlan(
      user
    );

    return user;
  }

  // ----------------------------------------------------------
  // CREATE NEW USER
  // ----------------------------------------------------------

  user =
    createDefaultUser(id);

  // ----------------------------------------------------------
  // SAVE NEW USER
  // ----------------------------------------------------------

  return await saveUser(
    user
  );
}

// ============================================================
// 🔄 UPDATE USER
// ============================================================

export async function updateUser(
  userId,
  updates = {}
) {
  const user =
    await getOrCreateUser(
      userId
    );

  if (
    !updates ||
    typeof updates !== "object"
  ) {
    throw new Error(
      "Invalid user updates."
    );
  }

  // ----------------------------------------------------------
  // PROTECTED FIELDS
  // ----------------------------------------------------------

  const {
    userId: ignoredUserId,
    id: ignoredId,
    createdAt: ignoredCreatedAt,
    usage: ignoredUsage,
    plan: ignoredPlan,
    subscription: ignoredSubscription,
    proTrialUntil: ignoredTrial,
    ...safeUpdates
  } = updates;

  // ----------------------------------------------------------
  // APPLY SAFE UPDATES
  // ----------------------------------------------------------

  Object.assign(
    user,
    safeUpdates
  );

  user.userId =
    safeId(userId);

  if (!user.id) {
    user.id =
      user.userId;
  }

  return await saveUser(
    user
  );
}

// ============================================================
// 📊 GET USER USAGE
// ============================================================

export async function getUserUsage(
  userId
) {
  const user =
    await getOrCreateUser(
      userId
    );

  return {
    userId:
      user.userId,

    plan:
      user.plan,

    usage:
      user.usage,

    subscription:
      user.subscription ||
      null,

    proTrialUntil:
      user.proTrialUntil ||
      null
  };
}

// ============================================================
// 👑 PRO USER CHECK
// ============================================================

export async function isProUser(
  userId
) {
  const user =
    await getOrCreateUser(
      userId
    );

  return (
    normalizePlan(user) ===
    "pro"
  );
}

// ============================================================
// 📦 USER STORAGE PATH
// ============================================================

export function getUserStoragePath(
  userId
) {
  return userPath(
    safeId(userId)
  );
}

// ============================================================
// 👑 END USERS ENGINE
// ============================================================
