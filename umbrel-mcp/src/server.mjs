import crypto from "node:crypto";
import { readFile } from "node:fs/promises";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import * as z from "zod/v4";

import { config } from "./config.mjs";
import {
  createBackup,
  deployRelease,
  getLogs,
  getStatus,
  listBackups,
  restartApplication,
  rollbackBackup,
  verifyApplication,
} from "./invio.mjs";
import { redact } from "./process.mjs";

function result(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

function failure(error) {
  const message = redact(error instanceof Error ? error.message : String(error));
  return {
    isError: true,
    content: [{ type: "text", text: message }],
    structuredContent: { ok: false, error: message },
  };
}

function guarded(handler) {
  return async (args) => {
    try {
      return result({ ok: true, ...(await handler(args)) });
    } catch (error) {
      console.error(redact(error?.stack || error));
      return failure(error);
    }
  };
}

function createServer() {
  const server = new McpServer({
    name: "invio-umbrel",
    version: "0.1.0",
    websiteUrl: "https://github.com/DEV-ITSD/Invio",
  });

  server.registerTool(
    "invio_status",
    {
      title: "Invio status",
      description: "Inspect the installed Invio images, containers, disk space, and recent backups on this Umbrel. This tool never changes the server.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    guarded(async () => ({ status: await getStatus() })),
  );

  server.registerTool(
    "invio_verify",
    {
      title: "Verify Invio",
      description: "Wait briefly for Invio's required containers to be stable and report the installed images. This tool never changes the server.",
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    guarded(async () => ({ verification: await verifyApplication() })),
  );

  server.registerTool(
    "invio_logs",
    {
      title: "Read Invio logs",
      description: "Read a bounded, redacted tail of one Invio service log. Never returns Docker environment variables or known authentication tokens.",
      inputSchema: {
        service: z.enum(["backend", "frontend", "app_proxy", "tor_server"]),
        tail: z.number().int().min(20).max(500).default(100),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    guarded(async ({ service, tail }) => ({ logResult: await getLogs(service, tail) })),
  );

  server.registerTool(
    "invio_list_backups",
    {
      title: "List Invio backups",
      description: "List metadata for existing MCP-created Invio backups. This tool never changes the server.",
      inputSchema: { limit: z.number().int().min(1).max(50).default(10) },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    guarded(async ({ limit }) => ({ backups: await listBackups(limit) })),
  );

  server.registerTool(
    "invio_backup",
    {
      title: "Back up Invio",
      description: "Create a consistent SQLite database snapshot plus a copy of Invio's data and Compose configuration. Does not stop Invio.",
      inputSchema: { reason: z.string().max(200).default("manual ChatGPT backup") },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    guarded(async ({ reason }) => ({ backup: await createBackup(reason) })),
  );

  server.registerTool(
    "invio_deploy",
    {
      title: "Deploy an Invio release",
      description: "Deploy a versioned release from DEV-ITSD's fixed backend/frontend GHCR repositories. Pulls and pins image digests, creates a backup, updates Compose, verifies containers, and automatically rolls back on failure. Never accepts arbitrary image repositories or shell commands.",
      inputSchema: {
        release_tag: z.string().regex(/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z][0-9A-Za-z.-]{0,48})?$/).describe("Exact release tag, for example v2.1.1-swiss.2"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    guarded(async ({ release_tag }) => ({ deployment: await deployRelease(release_tag) })),
  );

  server.registerTool(
    "invio_restart",
    {
      title: "Restart Invio",
      description: "Restart only the Invio Umbrel application through Umbrel's compatibility app script, then verify its required containers.",
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    guarded(async () => ({ restart: await restartApplication() })),
  );

  server.registerTool(
    "invio_rollback",
    {
      title: "Roll back Invio",
      description: "Restore Invio's Compose configuration and, by default, its complete data directory from one named MCP backup. The replaced data directory is preserved beside the app for manual recovery.",
      inputSchema: {
        backup_id: z.string().regex(/^\d{8}T\d{6}Z-[a-f0-9]{8}$/),
        restore_data: z.boolean().default(true),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    },
    guarded(async ({ backup_id, restore_data }) => ({ rollback: await rollbackBackup(backup_id, restore_data) })),
  );

  return server;
}

const sharedSecret = (await readFile(config.sharedSecretFile, "utf8")).trim();
if (sharedSecret.length < 32) throw new Error("MCP shared secret is missing or too short.");

const app = createMcpExpressApp({ host: config.listenHost });

app.get("/healthz", (_request, response) => {
  response.json({ ok: true, service: "invio-umbrel-mcp" });
});

app.use("/mcp", (request, response, next) => {
  const received = request.get("x-invio-mcp-key") || "";
  const expected = Buffer.from(sharedSecret);
  const actual = Buffer.from(received);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
});

app.post("/mcp", async (request, response) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  response.on("close", () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(request, response, request.body);
  } catch (error) {
    console.error(redact(error?.stack || error));
    if (!response.headersSent) {
      response.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

for (const method of ["get", "delete"]) {
  app[method]("/mcp", (_request, response) => {
    response.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed" },
      id: null,
    });
  });
}

const httpServer = app.listen(config.listenPort, config.listenHost, (error) => {
  if (error) throw error;
  console.log(`Invio Umbrel MCP listening on ${config.listenHost}:${config.listenPort}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down.`);
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
