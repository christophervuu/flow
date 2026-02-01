# flow-api

ASP.NET 9 Minimal API that wraps the design-agent pipeline as HTTP endpoints for the local Flow UI.

## Prerequisites

- .NET 9 SDK
- `GITHUB_TOKEN` environment variable (required) — PAT with GitHub Models (models: read) access

## Local run (no Docker)

1. Set `GITHUB_TOKEN`:
   ```bash
   export GITHUB_TOKEN=your_token   # macOS/Linux
   set GITHUB_TOKEN=your_token     # Windows cmd
   $env:GITHUB_TOKEN="your_token"  # PowerShell
   ```

2. Optional: set `FLOW_RUN_DIR` to override the base directory for runs (default: current directory `.`).

3. From the repo root:
   ```bash
   dotnet run --project flow-api
   ```

4. API listens on **http://localhost:5180**. Swagger UI: **http://localhost:5180/swagger**.

## Endpoints

- `POST /api/design/runs` — Start a design run
- `POST /api/design/runs/{runId}/answers` — Submit answers and resume pipeline
- `GET /api/design/runs/{runId}` — Get run metadata and artifact paths
- `GET /api/design/runs/{runId}/design` — Get DESIGN.md content (text/markdown)

## Docker (optional)

A Dockerfile can be added later; local run is the primary path.
