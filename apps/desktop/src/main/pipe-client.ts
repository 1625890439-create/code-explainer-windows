import { connect } from "node:net";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Small named-pipe client called by the AutoHotkey launcher.
 *
 * Reads selected code from stdin (piped from AHK), connects to the named pipe,
 * sends the JSON payload, and prints the server's response to stdout.
 *
 * Usage: echo "<selected-code>" | node pipe-client.js [--language <lang>]
 */

// \\.\pipe\ built from bytes to survive bundler re-processing
const PIPE_PREFIX = Buffer.from([92, 92, 46, 92, 112, 105, 112, 101, 92]).toString();

// Read selected code from stdin
const chunks: Buffer[] = [];
process.stdin.on("data", (chunk: Buffer) => chunks.push(chunk));
process.stdin.on("end", () => {
  const code = Buffer.concat(chunks).toString("utf-8").trim();
  if (!code) {
    process.exit(1);
  }
  sendRequest(code);
});

function parseFlag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function sendRequest(code: string): void {
  const language = parseFlag("--language");

  // pipe-client is standalone — use a fixed path to the project root
  const projectRoot = "C:/Users/admin/Desktop/Hermes/code-explainer-windows";
  const tokenPath = join(projectRoot, ".pipe-token");

  let token: string;
  try {
    token = readFileSync(tokenPath, "utf-8").trim();
  } catch {
    process.stderr.write("Pipe token file not found at: " + tokenPath + "\n");
    process.exit(1);
  }

  const PIPE_PATH = PIPE_PREFIX + "code-explainer-v1-" + token.substring(0, 8);

  const payload = JSON.stringify({
    token,
    requestId: randomUUID(),
    code,
    language,
    mode: "overview",
    source: "hotkey",
    createdAt: new Date().toISOString(),
  });

  const socket = connect(PIPE_PATH);

  let waitingForResponse = true;

  socket.on("connect", () => {
    socket.write(payload);
  });

  socket.on("data", (data: Buffer) => {
    // Got response — exit cleanly
    waitingForResponse = false;
    socket.end();
    process.exit(0);
  });

  socket.on("end", () => {
    // Server closed the pipe after accepting — that's success
    if (waitingForResponse) {
      waitingForResponse = false;
      process.exit(0);
    }
  });

  socket.on("error", (err: NodeJS.ErrnoException) => {
    process.stderr.write("Pipe error: " + (err.code || err.message) + "\n");
    process.exit(1);
  });

  socket.setTimeout(5000, () => {
    process.stderr.write("Timeout\n");
    process.exit(1);
  });
}