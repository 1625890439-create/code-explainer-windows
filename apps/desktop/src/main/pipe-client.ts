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
    console.error("No code received on stdin.");
    process.exit(1);
  }
  sendRequest(code);
});

function parseFlag(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function sendRequest(code: string): Promise<void> {
  const language = parseFlag("--language");

  // Read the pipe token from the project root (same dir as .env)
  // pipe-client.js lives in apps/desktop/out/main → ../../../.. = project root
  const projectRoot = join(__dirname, "..", "..", "..", "..");
  const tokenPath = join(projectRoot, ".pipe-token");

  let token: string;
  try {
    token = readFileSync(tokenPath, "utf-8").trim();
  } catch {
    console.error("Pipe token not found. Is the desktop app running?");
    process.exit(1);
  }

  const PIPE_PATH = PIPE_PREFIX + "code-explainer-v1-" + token.substring(0, 8);

  const payload = {
    token,
    requestId: randomUUID(),
    code,
    language,
    mode: "overview",
    source: "hotkey",
    createdAt: new Date().toISOString(),
  };

  const socket = connect(PIPE_PATH);

  socket.on("connect", () => {
    socket.write(JSON.stringify(payload));
    socket.end();
  });

  socket.on("data", (data: Buffer) => {
    process.stdout.write(data.toString("utf-8"));
  });

  socket.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "ENOENT") {
      console.error("Desktop app is not running.");
    } else {
      console.error(`Pipe error: ${err.message}`);
    }
    process.exit(1);
  });

  socket.setTimeout(5000, () => {
    console.error("Connection timed out.");
    process.exit(1);
  });
}