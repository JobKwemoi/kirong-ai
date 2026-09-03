// ============================================================
// 👑 KIRONG AI — PROJECTS STORAGE V1
// Vercel Blob backed project records (private, per-user)
// ============================================================

"use strict";

import { put, get, list, del } from "@vercel/blob";

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const PROJECT_PREFIX = "kirong-ai/projects/";
const MAX_TITLE_LENGTH = 120;
const MAX_CONTENT_LENGTH = 50000;
const MAX_TYPE_LENGTH = 40;

const ALLOWED_TYPES = ["website", "cv", "business", "code", "note"];

function requireToken() {
  if (!TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is missing.");
  }
}

function safeId(id) {
  return String(id || "anonymous")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 100);
}

function newProjectId() {
  return "proj_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

function projectPath(userId, projectId) {
  return `${PROJECT_PREFIX}${safeId(userId)}/${safeId(projectId)}.json`;
}

function userProjectPrefix(userId) {
  return `${PROJECT_PREFIX}${safeId(userId)}/`;
}

function normalizeType(type) {
  const t = String(type || "note").trim().slice(0, MAX_TYPE_LENGTH);
  return ALLOWED_TYPES.includes(t) ? t : "note";
}

// ============================================================
// 📥 READ A SINGLE PROJECT BLOB
// ============================================================

async function readProject(path) {
  try {
    const result = await get(path, {
      token: TOKEN,
      access: "private",
      useCache: false
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return null;
    }

    const text = await new Response(result.stream).text();

    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();

    // Missing blob = normal condition (project doesn't exist)
    if (
      error?.name === "BlobNotFoundError" ||
      message.includes("not found") ||
      message.includes("does not exist") ||
      message.includes("404")
    ) {
      return null;
    }

    throw error;
  }
}

// ============================================================
// 📋 LIST ALL PROJECTS FOR A USER
// ============================================================

async function listProjectsForUser(userId) {
  requireToken();

  const prefix = userProjectPrefix(userId);

  const result = await list({
    token: TOKEN,
    access: "private",
    prefix
  });

  const blobs = result?.blobs || [];

  const projects = [];

  for (const b of blobs) {
    const project = await readProject(b.pathname);
    if (project) projects.push(project);
  }

  projects.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

  return projects;
}

// ============================================================
// 💾 SAVE / DELETE
// ============================================================

async function saveProject(project) {
  requireToken();

  const path = projectPath(project.userId, project.id);

  await put(
    path,
    JSON.stringify(project, null, 2),
    {
      token: TOKEN,
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true
    }
  );

  return project;
}

async function deleteProject(userId, projectId) {
  requireToken();
  await del(projectPath(userId, projectId), { token: TOKEN });
}

// ============================================================
// 🌐 CORS
// ============================================================

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Kirong-User-Id");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
}

function getUserId(req) {
  const fromQuery = req.query?.userId;
  const fromHeader = req.headers["x-kirong-user-id"];
  const fromBody = req.body?.userId;

  return safeId(fromQuery || fromHeader || fromBody || "anonymous");
}

// ============================================================
// 🚀 MAIN HANDLER
// ============================================================

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    const userId = getUserId(req);

    // ----------------------------------------------------------
    // GET — list all projects, or fetch one by ?id=
    // ----------------------------------------------------------

    if (req.method === "GET") {
      const projectId = req.query?.id;

      if (projectId) {
        const project = await readProject(projectPath(userId, projectId));

        if (!project) {
          return res.status(404).json({ ok: false, error: "Project not found." });
        }

        return res.status(200).json({ ok: true, project });
      }

      const projects = await listProjectsForUser(userId);
      return res.status(200).json({ ok: true, projects });
    }

    // ----------------------------------------------------------
    // POST — create a new project
    // ----------------------------------------------------------

    if (req.method === "POST") {
      const body = req.body || {};

      const title = String(body.title || "Untitled Project").trim().slice(0, MAX_TITLE_LENGTH);

      if (!title) {
        return res.status(400).json({ ok: false, error: "Title is required." });
      }

      const project = {
        id: newProjectId(),
        userId,
        title,
        type: normalizeType(body.type),
        content: String(body.content || "").slice(0, MAX_CONTENT_LENGTH),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await saveProject(project);

      return res.status(200).json({ ok: true, project });
    }

    // ----------------------------------------------------------
    // PUT — update an existing project
    // ----------------------------------------------------------

    if (req.method === "PUT") {
      const body = req.body || {};
      const projectId = body.id;

      if (!projectId) {
        return res.status(400).json({ ok: false, error: "Project id is required." });
      }

      const existing = await readProject(projectPath(userId, projectId));

      if (!existing) {
        return res.status(404).json({ ok: false, error: "Project not found." });
      }

      if (typeof body.title === "string") {
        const trimmed = body.title.trim().slice(0, MAX_TITLE_LENGTH);
        if (trimmed) existing.title = trimmed;
      }

      if (typeof body.content === "string") {
        existing.content = body.content.slice(0, MAX_CONTENT_LENGTH);
      }

      if (typeof body.type === "string") {
        existing.type = normalizeType(body.type);
      }

      existing.updatedAt = new Date().toISOString();

      await saveProject(existing);

      return res.status(200).json({ ok: true, project: existing });
    }

    // ----------------------------------------------------------
    // DELETE — remove a project
    // ----------------------------------------------------------

    if (req.method === "DELETE") {
      const projectId = req.query?.id || req.body?.id;

      if (!projectId) {
        return res.status(400).json({ ok: false, error: "Project id is required." });
      }

      await deleteProject(userId, projectId);

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed." });
  } catch (error) {
    console.error("KIRONG PROJECTS ERROR:", error);

    return res.status(500).json({
      ok: false,
      error: "Projects storage is temporarily unavailable.",
      code: "PROJECTS_SERVER_ERROR"
    });
  }
}
