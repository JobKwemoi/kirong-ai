"use strict";

import { PassThrough } from "node:stream";
import { URL } from "node:url";

/*
============================================================
👑 KIRONG AI — VERCEL → NETLIFY BRIDGE
============================================================

Existing /api/*.js files use the Vercel-style:

    handler(req, res)

Netlify Functions use:

    handler(event, context)

This bridge lets us keep the existing Kirong AI backend
without rewriting the original engines.
============================================================
*/

function normalizeHeaders(headers = {}) {
  const result = {};

  for (const [key, value] of Object.entries(headers)) {
    result[String(key).toLowerCase()] = String(value ?? "");
  }

  return result;
}

function getQuery(event) {
  const query = {};

  const rawQuery =
    event.rawQuery ||
    event.queryStringParameters;

  if (typeof rawQuery === "string") {
    const params = new URLSearchParams(rawQuery);

    for (const [key, value] of params.entries()) {
      query[key] = value;
    }

    return query;
  }

  if (
    rawQuery &&
    typeof rawQuery === "object"
  ) {
    return {
      ...rawQuery
    };
  }

  try {
    const url = new URL(
      event.rawUrl ||
      `https://netlify.local${event.path || "/"}`
    );

    for (const [key, value] of url.searchParams.entries()) {
      query[key] = value;
    }
  } catch {}

  return query;
}

function parseBody(event, headers) {
  if (!event.body) {
    return undefined;
  }

  const contentType =
    headers["content-type"] || "";

  /*
  ----------------------------------------------------------
  MULTIPART
  ----------------------------------------------------------

  chat.js uses formidable, so multipart data must remain a
  readable request stream. Do NOT JSON.parse it.
  ----------------------------------------------------------
  */

  if (
    contentType
      .toLowerCase()
      .includes("multipart/form-data")
  ) {
    return undefined;
  }

  const raw = event.isBase64Encoded
    ? Buffer.from(
        event.body,
        "base64"
      ).toString("utf8")
    : String(event.body);

  if (
    contentType
      .toLowerCase()
      .includes("application/json")
  ) {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }

  if (
    contentType
      .toLowerCase()
      .includes(
        "application/x-www-form-urlencoded"
      )
  ) {
    const params =
      new URLSearchParams(raw);

    return Object.fromEntries(
      params.entries()
    );
  }

  return raw;
}

function createRequest(event) {
  const headers =
    normalizeHeaders(
      event.headers || {}
    );

  const contentType =
    headers["content-type"] || "";

  const isMultipart =
    contentType
      .toLowerCase()
      .includes("multipart/form-data");

  const bodyBuffer = event.body
    ? (
        event.isBase64Encoded
          ? Buffer.from(
              event.body,
              "base64"
            )
          : Buffer.from(
              String(event.body),
              "utf8"
            )
      )
    : Buffer.alloc(0);

  /*
  ----------------------------------------------------------
  PassThrough gives formidable a real Node readable stream.
  ----------------------------------------------------------
  */

  const req =
    new PassThrough();

  req.method =
    String(
      event.httpMethod ||
      "GET"
    ).toUpperCase();

  req.headers = headers;

  req.url =
    event.rawUrl ||
    event.path ||
    "/";

  req.query =
    getQuery(event);

  /*
  JSON endpoints expect req.body.
  Multipart endpoints expect the raw stream.
  */

  if (!isMultipart) {
    req.body =
      parseBody(
        event,
        headers
      );
  }

  /*
  Make the request look like a normal Node request.
  */

  if (!headers["content-length"]) {
    req.headers["content-length"] =
      String(bodyBuffer.length);
  }

  /*
  Push the body after the handler has a chance to attach
  listeners.
  */

  process.nextTick(() => {
    if (bodyBuffer.length) {
      req.end(bodyBuffer);
    } else {
      req.end();
    }
  });

  return req;
}

function createResponse() {
  let statusCode = 200;

  const headers = {};

  let body = "";

  let finished = false;

  let resolveResponse;

  const responsePromise =
    new Promise((resolve) => {
      resolveResponse =
        resolve;
    });

  function finish(value = "") {
    if (finished) {
      return;
    }

    finished = true;

    body =
      value === undefined ||
      value === null
        ? ""
        : String(value);

    resolveResponse({
      statusCode,
      headers,
      body
    });
  }

  const res = {
    statusCode: 200,

    headersSent: false,

    setHeader(name, value) {
      const key =
        String(name).toLowerCase();

      headers[key] =
        Array.isArray(value)
          ? value.map(String)
          : String(value);

      return res;
    },

    getHeader(name) {
      return headers[
        String(name).toLowerCase()
      ];
    },

    getHeaders() {
      return {
        ...headers
      };
    },

    removeHeader(name) {
      delete headers[
        String(name).toLowerCase()
      ];
    },

    writeHead(code, extraHeaders = {}) {
      statusCode =
        Number(code) || 200;

      res.statusCode =
        statusCode;

      Object.assign(
        headers,
        normalizeHeaders(
          extraHeaders
        )
      );

      return res;
    },

    status(code) {
      statusCode =
        Number(code) || 200;

      res.statusCode =
        statusCode;

      return res;
    },

    json(payload) {
      headers["content-type"] =
        "application/json; charset=utf-8";

      res.headersSent = true;

      finish(
        JSON.stringify(
          payload
        )
      );

      return res;
    },

    send(payload) {
      res.headersSent = true;

      if (
        payload &&
        typeof payload ===
          "object" &&
        !Buffer.isBuffer(payload)
      ) {
        return res.json(
          payload
        );
      }

      finish(payload);

      return res;
    },

    end(payload = "") {
      res.headersSent = true;

      finish(payload);

      return res;
    }
  };

  return {
    res,
    responsePromise
  };
}

export async function runVercelHandler(
  event,
  handler
) {
  const method =
    String(
      event.httpMethod ||
      "GET"
    ).toUpperCase();

  /*
  ----------------------------------------------------------
  CORS preflight
  ----------------------------------------------------------
  */

  if (method === "OPTIONS") {
    return {
      statusCode: 204,

      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, X-Kirong-User-Id",
        "Access-Control-Max-Age":
          "86400"
      },

      body: ""
    };
  }

  try {
    const req =
      createRequest(event);

    const {
      res,
      responsePromise
    } =
      createResponse();

    await handler(
      req,
      res
    );

    /*
    Some handlers may return after writing the response.
    */

    return await responsePromise;

  } catch (error) {
    console.error(
      "👑 KIRONG NETLIFY BRIDGE ERROR:",
      error
    );

    return {
      statusCode: 500,

      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Access-Control-Allow-Origin":
          "*"
      },

      body: JSON.stringify({
        ok: false,
        type: "error",

        error:
          "Kirong AI server error.",

        text:
          "Kirong AI server error.",

        code:
          "NETLIFY_BRIDGE_ERROR"
      })
    };
  }
}
