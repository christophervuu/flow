using design_agent.Models;
using design_agent.Services;
using flow_api.Dto;
using flow_api.Services;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(5180);
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSingleton<IBackgroundPipelineQueue, BackgroundPipelineQueue>();
builder.Services.AddHostedService<BackgroundPipelineService>();

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

static RunEnvelope ToEnvelope(string runId, string runPath, RunState state, IReadOnlyList<string> includedSections, List<Question> blockingQuestions, List<Question> nonBlockingQuestions, string? designDocMarkdown)
{
    var blocking = blockingQuestions.Select(q => new QuestionDto(q.Id, q.Text, q.Blocking)).ToList();
    var nonBlocking = nonBlockingQuestions.Select(q => new QuestionDto(q.Id, q.Text, q.Blocking)).ToList();
    return new RunEnvelope(runId, state.Status, runPath, includedSections, blocking, nonBlocking, designDocMarkdown);
}

static (List<Question> Blocking, List<Question> NonBlocking) GetQuestionsFromClarifier(ClarifierOutput? clarifier)
{
    var questions = clarifier?.Questions ?? [];
    return (
        questions.Where(q => q.Blocking).ToList(),
        questions.Where(q => !q.Blocking).ToList());
}

static ExecutionStatusDto BuildExecutionStatus(string runDir, string runId, string runPath, RunState state)
{
    var completed = new List<string>();
    var active = new List<string>();
    var currentStage = "";
    string? currentAgent = null;

    var tracePath = Path.Combine(RunPersistence.GetArtifactsDir(runPath), "trace.jsonl");
    if (File.Exists(tracePath))
    {
        var inProgress = new Dictionary<string, string>();
        foreach (var line in File.ReadLines(tracePath))
        {
            if (string.IsNullOrWhiteSpace(line)) continue;
            try
            {
                var obj = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, System.Text.Json.JsonElement>>(line);
                if (obj == null) continue;
                var kind = obj.TryGetValue("Kind", out var k) ? k.GetString() : null;
                var stageName = obj.TryGetValue("StageName", out var s) ? s.GetString() : null;
                var agentName = obj.TryGetValue("AgentName", out var a) ? a.GetString() : null;
                if (string.IsNullOrEmpty(agentName)) continue;

                if (kind == "stage_start")
                {
                    inProgress[agentName] = stageName ?? "";
                    currentStage = stageName ?? "";
                    currentAgent = agentName;
                }
                else if (kind == "stage_end")
                {
                    if (inProgress.Remove(agentName))
                        completed.Add(agentName);
                }
            }
            catch { /* skip malformed lines */ }
        }
        active = inProgress.Keys.ToList();
    }
    else
    {
        // Infer from artifacts
        if (File.Exists(Path.Combine(RunPersistence.GetArtifactsDir(runPath), "clarifier.json")))
            completed.Add("Clarifier");
        if (File.Exists(Path.Combine(RunPersistence.GetArtifactsDir(runPath), "proposedDesign.json")))
        {
            completed.Add("Synthesizer");
            var selectionPath = Path.Combine(RunPersistence.GetArtifactsDir(runPath), "synth", "selection.json");
            if (File.Exists(selectionPath))
            {
                try
                {
                    var synthDir = Path.Combine(RunPersistence.GetArtifactsDir(runPath), "synth", "specialists");
                    if (Directory.Exists(synthDir))
                    {
                        foreach (var f in Directory.GetFiles(synthDir, "*.json"))
                        {
                            var key = Path.GetFileNameWithoutExtension(f);
                            if (!string.IsNullOrEmpty(key) && !completed.Contains($"Synth_{key}"))
                                completed.Add($"Synth_{key}");
                        }
                    }
                    if (File.Exists(Path.Combine(RunPersistence.GetArtifactsDir(runPath), "synth", "mergedPartial.json")))
                        completed.Add("Merger");
                }
                catch { }
            }
        }
        if (File.Exists(Path.Combine(RunPersistence.GetArtifactsDir(runPath), "critique.json")))
            completed.Add("Challenger");
        if (File.Exists(Path.Combine(RunPersistence.GetArtifactsDir(runPath), "optimizedDesign.json")))
            completed.Add("Optimizer");
        if (File.Exists(Path.Combine(RunPersistence.GetArtifactsDir(runPath), "publishedPackage.json")))
            completed.Add("Publisher");

        if (state.Status == "Running" && completed.Count > 0)
        {
            currentStage = completed[^1].StartsWith("Synth_") ? "Synthesizer" : completed[^1];
            currentAgent = completed[^1];
        }
    }

    var allKnown = new HashSet<string> { "Clarifier", "Synthesizer", "Challenger", "Optimizer", "Publisher", "Merger", "DesignJudge", "CritiqueJudge" };
    foreach (var a in completed) allKnown.Add(a);
    foreach (var a in active) allKnown.Add(a);
    var selection = RunPersistence.LoadSynthSelection(runPath);
    if (selection?.SynthSpecialists is { Count: > 0 } specialists)
    {
        foreach (var key in specialists)
            allKnown.Add($"Synth_{key}");
        allKnown.Add("Merger");
    }
    var pending = allKnown.Except(completed).Except(active).OrderBy(x => x).ToList();

    var total = Math.Max(completed.Count + active.Count + pending.Count, 1);
    var current = completed.Count + (active.Count > 0 ? 1 : 0);

    return new ExecutionStatusDto(
        runId,
        state.Status,
        currentStage,
        currentAgent,
        completed,
        active,
        pending,
        new ProgressDto(current, total));
}

app.MapPost("/api/design/runs", async (HttpContext ctx, [FromBody] CreateRunRequest req, IBackgroundPipelineQueue queue) =>
{
    if (string.IsNullOrWhiteSpace(req?.Title) || string.IsNullOrWhiteSpace(req?.Prompt))
        return Results.Problem("title and prompt are required", statusCode: 400);

    IReadOnlyList<string> normalizedSections;
    try
    {
        normalizedSections = SectionSelection.Normalize(req.IncludedSections);
    }
    catch (ArgumentException ex)
    {
        return Results.Problem(ex.Message, statusCode: 400);
    }

    var runDir = GetRunDir();
    var runId = Guid.NewGuid().ToString();
    var runPath = RunPersistence.GetRunDir(runDir, runId);
    RunPersistence.EnsureRunDirectory(runPath);

    var prompt = BuildPromptFromContext(req.Prompt, req.Context);
    var now = DateTime.UtcNow.ToString("O");
    var state = new RunState(runId, "Running", now, now);
    RunPersistence.SaveState(runPath, state);
    RunPersistence.SaveInput(runPath, new RunInput(req.Title, prompt, normalizedSections.ToList()));

    await queue.EnqueueAsync(new PipelineWorkItem
    {
        RunPath = runPath,
        RunId = runId,
        IsRunClarifier = true,
        AllowAssumptions = req.AllowAssumptions,
        SynthSpecialists = req.SynthSpecialists,
    });

    return Results.Json(ToEnvelope(runId, runPath, state, normalizedSections, [], [], null));
});

app.MapPost("/api/design/runs/{runId}/answers", async (string runId, [FromBody] SubmitAnswersRequest? req, IBackgroundPipelineQueue queue) =>
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

    var selection = RunPersistence.LoadSynthSelection(runPath);
    var allowAssumptions = req.AllowAssumptions ?? selection?.AllowAssumptions ?? false;
    var synthSpecialists = req.SynthSpecialists ?? selection?.SynthSpecialists;
    if (synthSpecialists is { Count: > 0 })
        RunPersistence.SaveSynthSelection(runPath, new SynthSelection(synthSpecialists, allowAssumptions));

    state = state with { Status = "Running", UpdatedAt = DateTime.UtcNow.ToString("O") };
    RunPersistence.SaveState(runPath, state);

    await queue.EnqueueAsync(new PipelineWorkItem
    {
        RunPath = runPath,
        RunId = runId,
        IsRunClarifier = false,
        Answers = req.Answers,
    });

    var includedSections = RunPersistence.LoadNormalizedIncludedSections(runPath);
    var (blockingQ, nonBlockingQ) = GetQuestionsFromClarifier(clarifierOutput);
    return Results.Json(ToEnvelope(runId, runPath, state, includedSections, blockingQ, nonBlockingQ, null));
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
    int? remainingOpenQuestionsCount = null;
    int? assumptionsCount = null;

    if (state.Status == "AwaitingClarifications")
    {
        try
        {
            var synthQuestions = RunPersistence.LoadSynthQuestions(runPath);
            if (synthQuestions is { Count: > 0 })
            {
                blockingQuestions = synthQuestions.Where(q => q.Blocking).Select(q => new QuestionDto(q.Id, q.Text, q.Blocking)).ToList();
                nonBlockingQuestions = synthQuestions.Where(q => !q.Blocking).Select(q => new QuestionDto(q.Id, q.Text, q.Blocking)).ToList();
            }
            else
            {
                var clarifier = RunPersistence.LoadClarifier(runPath);
                var questions = clarifier.Questions ?? [];
                blockingQuestions = questions.Where(q => q.Blocking).Select(q => new QuestionDto(q.Id, q.Text, q.Blocking)).ToList();
                nonBlockingQuestions = questions.Where(q => !q.Blocking).Select(q => new QuestionDto(q.Id, q.Text, q.Blocking)).ToList();
            }
        }
        catch { /* optional for metadata */ }
    }
    else if (state.Status == "Completed")
    {
        try
        {
            var published = RunPersistence.LoadPublishedPackage(runPath);
            remainingOpenQuestionsCount = published?.RemainingOpenQuestions?.Count;
        }
        catch { /* optional */ }
        try
        {
            var assumptions = RunPersistence.LoadSynthAssumptions(runPath);
            assumptionsCount = assumptions?.Count;
        }
        catch { /* optional */ }
    }

    ExecutionStatusDto? executionStatus = null;
    if (state.Status == "Running" || state.Status == "Completed" || state.Status == "AwaitingClarifications")
    {
        try
        {
            executionStatus = BuildExecutionStatus(runDir, runId, runPath, state);
        }
        catch { /* optional */ }
    }

    IReadOnlyList<string>? includedSections = null;
    try
    {
        includedSections = RunPersistence.LoadNormalizedIncludedSections(runPath);
    }
    catch { /* optional */ }

    var meta = new RunMetadata(state.RunId, state.Status, state.CreatedAt, state.UpdatedAt, hasDesignDoc, artifactPaths, includedSections, blockingQuestions, nonBlockingQuestions, remainingOpenQuestionsCount, assumptionsCount, executionStatus);
    return Results.Json(meta);
});

app.MapGet("/api/design/runs/{runId}/status", (string runId) =>
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

    try
    {
        var status = BuildExecutionStatus(runDir, runId, runPath, state);
        return Results.Json(status);
    }
    catch
    {
        return Results.Problem("Failed to build execution status", statusCode: 500);
    }
});

app.MapGet("/api/design/runs/{runId}/trace", (string runId) =>
{
    var runDir = GetRunDir();
    var runPath = RunPersistence.GetRunDir(runDir, runId);
    if (!Directory.Exists(runPath))
        return Results.Problem("Run not found", statusCode: 404);

    var tracePath = Path.Combine(RunPersistence.GetArtifactsDir(runPath), "trace.jsonl");
    if (!File.Exists(tracePath))
        return Results.Json(Array.Empty<TraceEventDto>());

    var events = new List<TraceEventDto>();
    foreach (var line in File.ReadLines(tracePath))
    {
        if (string.IsNullOrWhiteSpace(line)) continue;
        try
        {
            var obj = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, System.Text.Json.JsonElement>>(line);
            if (obj == null) continue;
            var getStr = (string k) => obj.TryGetValue(k, out var v) ? v.GetString() : null;
            var getLong = (string k) => obj.TryGetValue(k, out var v) && v.TryGetInt64(out var n) ? n : (long?)null;
            events.Add(new TraceEventDto(
                getStr("Timestamp") ?? "",
                getStr("Kind") ?? "",
                getStr("StageName"),
                getStr("AgentName"),
                getStr("Message"),
                getLong("DurationMs")));
        }
        catch { /* skip malformed lines */ }
    }
    return Results.Json(events);
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
