import { randomUUID } from "node:crypto";
import type { ExplainRequest } from "@code-explainer/contracts";

const args = process.argv.slice(2);
const value = (name: string) => args[args.indexOf(name) + 1];
const code = value("--code");
if (!code) throw new Error("Usage: --code <selected-code> [--language <language>]");

const request: ExplainRequest = {
  requestId: randomUUID(), code, language: value("--language"), mode: "overview", source: "cli", createdAt: new Date().toISOString()
};

// In the packaged app this is replaced by a localhost named-pipe client.
console.log(JSON.stringify(request));

