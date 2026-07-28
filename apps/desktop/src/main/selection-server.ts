import { createServer } from "node:net";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import type { ExplainRequest } from "@code-explainer/contracts";
import { validateRequest } from "@code-explainer/explainer-core";

const PIPE_NAME = "code-explainer-v1";
const MAX_PAYLOAD_BYTES = 128 * 1024; // 128 KB buffer for encoded JSON

export interface SelectionHandler {
  (request: ExplainRequest): void;
}

/**
 * Windows named-pipe server that receives selected code from the AHK launcher
 * (or any local pipe client). It validates, strips oversized payloads, and
 * hands off valid ExplainRequest objects to the provided handler.
 *
 * Security: every session generates a random token. The launcher reads it from
 * a local config file and passes it as the first JSON field. Requests with a
 * missing or mismatched token are silently rejected.
 */
export class SelectionServer {
  private server = createServer();
  private token: string;
  private handler: SelectionHandler | null = null;

  constructor() {
    this.token = randomBytes(16).toString("hex");
  }

  /** The full pipe path for this session. */
  get pipePath(): string {
    return `\\\\.\\pipe\\${PIPE_NAME}-${this.token.substring(0, 8)}`;
  }

  /** Start listening. The caller must pass a handler before the first request arrives. */
  start(): void {
    this.server.listen(this.pipePath);
  }

  /** Register the callback that receives validated requests. */
  onRequest(handler: SelectionHandler): void {
    this.handler = handler;
    this.server.on("connection", (socket) => {
      let buffer = "";

      socket.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf-8");
        // Enforce a hard size cap to prevent memory exhaustion
        if (buffer.length > MAX_PAYLOAD_BYTES) {
          socket.destroy();
          return;
        }
      });

      socket.on("end", () => {
        try {
          const payload = JSON.parse(buffer);

          // Token gate — reject silently if token missing or mismatched
          if (payload.token !== this.token) {
            socket.destroy();
            return;
          }

          const request: ExplainRequest = {
            requestId: payload.requestId,
            code: payload.code,
            language: payload.language,
            mode: payload.mode ?? "overview",
            source: payload.source ?? "hotkey",
            createdAt: payload.createdAt ?? new Date().toISOString(),
          };

          const error = validateRequest(request);
          if (error) {
            socket.write(JSON.stringify(error) + "\n", () => socket.end());
            return;
          }

          if (this.handler) {
            this.handler(request);
          }
          socket.write(JSON.stringify({ requestId: request.requestId, status: "accepted" }) + "\n", () => socket.end());
        } catch {
          // Malformed JSON — destroy silently
          socket.destroy();
        }
      });

      socket.on("error", () => {
        // Pipe errors are expected (client disconnect, timeout) — no-op
      });
    });
  }

  /** Stop listening and close all connections. */
  stop(): void {
    this.server.close();
  }

  /** The session token. Exposed so the main process can write it to disk. */
  get sessionToken(): string {
    return this.token;
  }
}