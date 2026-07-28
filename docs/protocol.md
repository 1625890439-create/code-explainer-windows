# Local IPC Protocol

Transport: Windows named pipe `\\\\.\\pipe\\code-explainer-v1-<session-id>`. Encoding: UTF-8 JSON, one object per line. Every message includes an ephemeral session token.

## Request

`ExplainRequest` is defined in `packages/contracts/src/index.ts`.

```json
{
  "requestId": "uuid",
  "code": "const sum = (a, b) => a + b",
  "language": "typescript",
  "mode": "overview",
  "source": "hotkey",
  "createdAt": "2026-07-28T09:00:00.000Z"
}
```

Limits: non-empty text, at most 30,000 UTF-16 code units. The server rejects unknown fields only after schema validation is added; retain forward compatibility by versioning the pipe name for breaking changes.

## Response

Success is `ExplainResult`; expected failures use `ExplainError`. Never send provider stack traces across the renderer boundary.

