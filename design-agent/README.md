# design-agent

A .NET CLI tool that orchestrates 5 sub-agents (Clarifier, Synthesizer, Challenger, Optimizer, Publisher) to generate technical design documents. Uses **Microsoft Agent Framework** and **GitHub Models** for inference.

## Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- A GitHub Personal Access Token (PAT) with **models: read** scope for GitHub Models access

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_TOKEN` | Yes | - | PAT with GitHub Models (models: read) access |
| `GITHUB_MODELS_ENDPOINT` | No | `https://models.github.ai/inference` | Override the inference endpoint |
| `GITHUB_MODELS_MODEL` | No | `openai/gpt-4.1` | Override the model ID |

## Example Commands

### Start a new design run

```bash
design-agent start --title "User Auth Service" --prompt "Design an authentication service for a web app supporting email/password and OAuth."
```

With a custom run directory:

```bash
design-agent start --title "My Feature" --prompt "..." --run-dir "C:\projects\my-app"
```

If the Clarifier identifies blocking questions, they are printed and the run pauses. Answer them with:

```bash
design-agent answer --run-id <guid>
```

### Answer blocking questions and resume

```bash
design-agent answer --run-id 550e8400-e29b-41d4-a716-446655440000
```

### Show the published design doc

```bash
design-agent show --run-id 550e8400-e29b-41d4-a716-446655440000
```

## Run Storage

Runs are stored under:

```
{run-dir}/.design-agent/runs/{runId}/
├── state.json           # Run metadata, status, timestamps
├── input.json           # Title and initial prompt
├── artifacts/
│   ├── clarifier.json
│   ├── clarifiedSpec.json
│   ├── proposedDesign.json
│   ├── critique.json
│   ├── optimizedDesign.json
│   └── publishedPackage.json
└── published/
    └── DESIGN.md        # Final design document (markdown)
```

The default `run-dir` is the current working directory.

## Docker

Build and run with Docker:

```bash
docker build -t design-agent -f design-agent/Dockerfile .
docker run --rm -e GITHUB_TOKEN="$env:GITHUB_TOKEN" -v "${PWD}:/workspace" design-agent start --title "Test" --prompt "A simple CRUD API" --run-dir /workspace
```

Pass `GITHUB_TOKEN` via `-e` or an env file. Mount a volume to persist runs.

## Output

- **start** / **answer**: If completed, prints the design doc markdown and a footer with run ID and file path.
- **start**: If awaiting clarifications, prints blocking questions with IDs.
- **show**: Prints the last published design doc, or a message if the run is not finished.

## Error Handling

- Missing `GITHUB_TOKEN`: Prints an error and exits with code 1.
- Model call failure: Prints status and message; exits with code 1.
- Invalid JSON from an agent (after one retry): Saves raw output to `artifacts/<agentName>.raw.txt` and exits with code 1.
