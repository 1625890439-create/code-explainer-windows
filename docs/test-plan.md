# Test Plan

## Automated

- Contract compilation and provider unit tests.
- Input validation: empty, whitespace-only, 30,000-char boundary and oversized selection.
- Prompt-generation snapshot tests with code containing quotes, Chinese and secret-like values.
- IPC integration tests: invalid token, malformed JSON, two simultaneous requests and timeout.

## Windows manual matrix

| Area | Cases |
| --- | --- |
| Selection capture | Notepad, VS Code, Chrome text area; Unicode; no selection; clipboard containing image/text |
| App lifecycle | app closed, app hidden to tray, duplicate launcher, app restart during request |
| Security | invalid pipe token, non-current user, API failure, secret-like selection |
| UI | long response, markdown code blocks, copy answer, keyboard-only navigation, 125% scaling |

Record Windows version, application version and observed result for each release candidate.

