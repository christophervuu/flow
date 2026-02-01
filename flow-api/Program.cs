using design_agent.Models;
using design_agent.Services;
using flow_api.Dto;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(5180);
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Fail fast if GITHUB_TOKEN is missing (throws; process exits with unhandled exception)
RunPersistence.ValidateGitHubTokenOrThrow();

app.UseSwagger();
app.UseSwaggerUI();

string GetRunDir() =>
    string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FLOW_RUN_DIR"))
        ? "."
        : Environment.GetEnvironmentVariable("FLOW_RUN_DIR")!;

static string BuildPromptFromContext(string prompt, CreateRunContext? context)
{
    if (context == null) return prompt;
    var parts = new List<string> { prompt };
    if (context.Links is { Count: > 0 })
        parts.Add("Links:\n- " + string.Join("\n- ", context.Links));
    if (!string.IsNullOrWhiteSpace(context.Notes))
        parts.Add("Notes:\n" + context.Notes);
    return string.Join("\n\n", parts);
}

static RunEnvelope ToEnvelope(string runId, string runPath, RunState state, ClarifierOutput? clarifier, string? designDocMarkdown)
{
    var questions = clarifier?.Questions ?? [];
    var blocking = questions.Where(q => q.Blocking).Select(q => new QuestionDto(q.Id, q.Text, q.Blocking)).ToList();
    var nonBlocking = questions.Where(q => !q.Blocking).Select(q => new QuestionDto(q.Id, q.Text, q.Blocking)).ToList();
    return new RunEnvelope(runId, state.Status, runPath, blocking, nonBlocking, designDocMarkdown);
}

app.MapPost("/api/design/runs", async (HttpContext ctx, [FromBody] CreateRunRequest req) =>
{
    if (string.IsNullOrWhiteSpace(req?.Title) || string.IsNullOrWhiteSpace(req?.Prompt))
        return Results.Problem("title and prompt are required", statusCode: 400);

    var runDir = GetRunDir();
    var runId = Guid.NewGuid().ToString();
    var runPath = RunPersistence.GetRunDir(runDir, runId);
    RunPersistence.EnsureRunDirectory(runPath);

    var prompt = BuildPromptFromContext(req.Prompt, req.Context);
    var now = DateTime.UtcNow.ToString("O");
    var state = new RunState(runId, "Running", now, now);
    RunPersistence.SaveState(runPath, state);
    RunPersistence.SaveInput(runPath, new RunInput(req.Title, prompt));

    ClarifierResult result;
    try
    {
        result = await PipelineRunner.RunClarifierAsync(runPath, req.Title, prompt);
    }
    catch (InvalidOperationException ex)
    {
        return Results.Problem(ex.Message, statusCode: 500);
    }
    catch (Azure.RequestFailedException ex)
    {
        return Results.Problem($"Model call failed: {ex.Message}", statusCode: 502);
    }

    RunPersistence.SaveClarifier(runPath, result.Output);

    if (result.HasBlockingQuestions)
    {
        state = state with { Status = "AwaitingClarifications", UpdatedAt = DateTime.UtcNow.ToString("O") };
        RunPersistence.SaveState(runPath, state);
        return Results.Json(ToEnvelope(runId, runPath, state, result.Output, null));
    }

    var draft = result.Output.ClarifiedSpecDraft
        ?? throw new InvalidOperationException("Clarifier produced no clarified_spec_draft.");
    var clarifiedSpec = ClarifiedSpecHelper.CreateFromDraft(draft, new Dictionary<string, string>());
    RunPersistence.SaveClarifiedSpec(runPath, clarifiedSpec);

    try
    {
        var (_, _, _, published) = await PipelineRunner.RunRemainingPipelineAsync(runPath, clarifiedSpec);
        state = state with { Status = "Completed", UpdatedAt = DateTime.UtcNow.ToString("O") };
        RunPersistence.SaveState(runPath, state);
        return Results.Json(ToEnvelope(runId, runPath, state, result.Output, published.DesignDocMarkdown));
    }
    catch (InvalidOperationException ex)
    {
        return Results.Problem(ex.Message, statusCode: 500);
    }
    catch (Azure.RequestFailedException ex)
    {
        return Results.Problem($"Model call failed: {ex.Message}", statusCode: 502);
    }
});

app.MapPost("/api/design/runs/{runId}/answers", async (string runId, [FromBody] SubmitAnswersRequest? req) =>
{
    if (req?.Answers == null)
        return Results.Problem("answers object is required", statusCode: 400);

    var runDir = GetRunDir();
    var runPath = RunPersistence.GetRunDir(runDir, runId);
    if (!Directory.Exists(runPath))
        return Results.Problem("Run not found", statusCode: 404);

    RunState state;
    try
    {
        state = RunPersistence.LoadState(runPath);
    }
    catch (InvalidOperationException)
    {
        return Results.Problem("Run state invalid", statusCode: 404);
    }

    if (state.Status != "AwaitingClarifications")
        return Results.Problem($"Run is not awaiting clarifications. Current status: {state.Status}", statusCode: 400);

    ClarifierOutput clarifierOutput;
    try
    {
        clarifierOutput = RunPersistence.LoadClarifier(runPath);
    }
    catch (InvalidOperationException)
    {
        return Results.Problem("Clarifier output not found", statusCode: 404);
    }

    var draft = clarifierOutput.ClarifiedSpecDraft
        ?? throw new InvalidOperationException("Clarifier produced no clarified_spec_draft.");
    var clarifiedSpec = ClarifiedSpecHelper.CreateFromDraft(draft, req.Answers);
    RunPersistence.SaveClarifiedSpec(runPath, clarifiedSpec);

    try
    {
        var (_, _, _, published) = await PipelineRunner.RunRemainingPipelineAsync(runPath, clarifiedSpec, req.Answers);
        state = state with { Status = "Completed", UpdatedAt = DateTime.UtcNow.ToString("O") };
        RunPersistence.SaveState(runPath, state);
        return Results.Json(ToEnvelope(runId, runPath, state, clarifierOutput, published.DesignDocMarkdown));
    }
    catch (InvalidOperationException ex)
    {
        return Results.Problem(ex.Message, statusCode: 500);
    }
    catch (Azure.RequestFailedException ex)
    {
        return Results.Problem($"Model call failed: {ex.Message}", statusCode: 502);
    }
});

app.MapGet("/api/design/runs/{runId}", (string runId) =>
{
    var runDir = GetRunDir();
    var runPath = RunPersistence.GetRunDir(runDir, runId);
    if (!Directory.Exists(runPath))
        return Results.Problem("Run not found", statusCode: 404);

    RunState state;
    try
    {
        state = RunPersistence.LoadState(runPath);
    }
    catch (InvalidOperationException)
    {
        return Results.Problem("Run state invalid", statusCode: 404);
    }

    var artifactsDir = RunPersistence.GetArtifactsDir(runPath);
    var publishedDir = RunPersistence.GetPublishedDir(runPath);
    var artifactPaths = new ArtifactPathsDto(
        Path.Combine(runPath, "state.json"),
        Path.Combine(runPath, "input.json"),
        Path.Combine(artifactsDir, "clarifier.json"),
        Path.Combine(artifactsDir, "clarifiedSpec.json"),
        Path.Combine(artifactsDir, "publishedPackage.json"),
        Path.Combine(publishedDir, "DESIGN.md"));
    var hasDesignDoc = RunPersistence.GetDesignMarkdownPath(runPath) != null;
    List<QuestionDto>? blockingQuestions = null;
    List<QuestionDto>? nonBlockingQuestions = null;
    if (state.Status == "AwaitingClarifications")
    {
        try
        {
            var clarifier = RunPersistence.LoadClarifier(runPath);
            var questions = clarifier.Questions ?? [];
            blockingQuestions = questions.Where(q => q.Blocking).Select(q => new QuestionDto(q.Id, q.Text, q.Blocking)).ToList();
            nonBlockingQuestions = questions.Where(q => !q.Blocking).Select(q => new QuestionDto(q.Id, q.Text, q.Blocking)).ToList();
        }
        catch { /* optional for metadata */ }
    }
    var meta = new RunMetadata(state.RunId, state.Status, state.CreatedAt, state.UpdatedAt, hasDesignDoc, artifactPaths, blockingQuestions, nonBlockingQuestions);
    return Results.Json(meta);
});

app.MapGet("/api/design/runs/{runId}/design", (string runId) =>
{
    var runDir = GetRunDir();
    var runPath = RunPersistence.GetRunDir(runDir, runId);
    if (!Directory.Exists(runPath))
        return Results.Problem("Run not found", statusCode: 404);

    var designPath = RunPersistence.GetDesignMarkdownPath(runPath);
    if (designPath == null)
        return Results.Problem("Design doc not available", statusCode: 404);

    var markdown = File.ReadAllText(designPath);
    return Results.Text(markdown, "text/markdown");
});

app.Run();
