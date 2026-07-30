import { createServer } from "node:net";
import { randomBytes } from "node:crypto";
import type { ExplainRequest } from "@code-explainer/contracts";
import { validateRequest } from "@code-explainer/explainer-core";

const PIPE_NAME = "code-explainer-v1";
const MAX_PAYLOAD_BYTES = 128 * 1024;

// Build a Windows named-pipe path without relying on string-literal escaping
// that bundlers may mangle.  Buffer ensures the literal \\.\pipe\ prefix survives.
const PIPE_PREFIX = Buffer.from([92, 92, 46, 92, 112, 105, 112, 101, 92]).toString();
// = \\.\pipe\

export interface SelectionHandler {
  (request: ExplainRequest): void;
}

export class SelectionServer {
  private server = createServer();
  private token: string;
  private handler: SelectionHandler | null = null;

  constructor() {
    this.token = randomBytes(16).toString("hex");
  }

  get pipePath(): string {
    return PIPE_PREFIX + PIPE_NAME + "-" + this.token.substring(0, 8);
  }

  get sessionToken(): string {
    return this.token;
  }

  start(): void {
    this.server.listen(this.pipePath);
  }

  onRequest(handler: SelectionHandler): void {
    this.handler = handler;
    this.server.on("connection", (socket) => {
      let buffer = "";

      socket.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf-8");
        if (buffer.length > MAX_PAYLOAD_BYTES) {
          socket.destroy();
          return;
        }
      });

      socket.on("end", () => {
        try {
          console.log("[SelectionServer] Received payload");
          const payload = JSON.parse(buffer);

          console.log("[SelectionServer] Token check — received:", payload.token?.substring(0,8), "expected:", this.token.substring(0,8));
          if (payload.token !== this.token) {
            console.log("[SelectionServer] Token MISMATCH, destroying");
            socket.destroy();
            return;
          }
          console.log("[SelectionServer] Token OK");

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
          socket.destroy();
        }
      });

      socket.on("error", () => {});
    });
  }

  stop(): void {
    this.server.close();
  }
}