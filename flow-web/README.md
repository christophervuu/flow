# flow-web

Minimal React + Vite + TypeScript UI for starting design runs, answering blocking questions, and viewing the final DESIGN.md.

## Prerequisites

- Node.js 18+
- **flow-api** must be running on `http://localhost:5180` (the dev server proxies `/api` to it).

## Local run

1. Start the API first (from repo root):
   ```bash
   dotnet run --project flow-api
   ```

2. From the repo root:
   ```bash
   cd flow-web
   npm install
   npm run dev
   ```

3. Open **http://localhost:5173**. Use the form to start a run; if the clarifier asks blocking questions, answer them and submit; then view the design doc.

## Proxy

The Vite dev server proxies `/api` to `http://localhost:5180`, so the browser only calls `/api/design/...` and CORS is avoided.
