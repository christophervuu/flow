# flow-web

Modern React + Vite + TypeScript UI for the Flow design pipeline. Start design runs, answer clarifications, and view the final DESIGN.md.

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

3. Open **http://localhost:5173**.

## Features

- **New Design**: Compose a design request with Title + Prompt and optional collapsible context sections (Goals, Requirements, Constraints, Data & Security, Operations, etc.).
- **Clarify**: When the clarifier asks questions, answer blocking questions (required) and optional non-blocking questions.
- **Results**: View the rendered design doc with markdown styling.
- **Recent Runs**: Last 10 runs stored in localStorage; click to load a run.
- **Polling**: While a run is "Running", the UI polls every 1.5s until status changes.

## Proxy

The Vite dev server proxies `/api` to `http://localhost:5180`, so the browser only calls `/api/design/...` and CORS is avoided.
