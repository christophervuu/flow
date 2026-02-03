using System.CommandLine;
using System.Text.Json;
using design_agent.Models;

namespace design_agent.Commands;

public static class StartCommand
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = false };

    public static Command Create()
    {
        var titleOption = new Option<string>("--title", "Design title") { IsRequired = true };
        var promptOption = new Option<string>("--prompt", "Initial freeform prompt") { IsRequired = true };
        var runDirOption = new Option<string>("--run-dir", () => ".", "Base directory for runs (default: current directory)");
        var jsonOption = new Option<bool>("--json", "Output a single JSON envelope (runId, status, questions, designDocMarkdown)");
        var deepCritiqueOption = new Option<bool>("--deep-critique", () => false, "Run multiple Challenger personas (Security, Operations, Cost, Edge Cases) and merge");
        var variantsOption = new Option<int>("--variants", () => 1, "Number of Synthesizer variants (1-5); default 1");
        var traceOption = new Option<bool>("--trace", () => false, "Emit trace artifact (artifacts/trace.jsonl) for debugging");

        var command = new Command("start", "Start a new design run");
        command.AddOption(titleOption);
        command.AddOption(promptOption);
        command.AddOption(runDirOption);
        command.AddOption(jsonOption);
        command.AddOption(deepCritiqueOption);
        command.AddOption(variantsOption);
        command.AddOption(traceOption);

        command.SetHandler(async (title, prompt, runDir, json, deepCritique, variants, trace) =>
        {
            await ExecuteAsync(title!, prompt!, runDir ?? ".", json, new PipelineOptions(deepCritique, variants, trace));
        }, titleOption, promptOption, runDirOption, jsonOption, deepCritiqueOption, variantsOption, traceOption);

        return command;
    }

    private static async Task ExecuteAsync(string title, string prompt, string runDir, bool json, PipelineOptions pipelineOptions)
    {
        design_agent.Services.RunPersistence.ValidateGitHubToken();

        var runId = Guid.NewGuid().ToString();
        var runPath = design_agent.Services.RunPersistence.GetRunDir(runDir, runId);
        design_agent.Services.RunPersistence.EnsureRunDirectory(runPath);

        var now = DateTime.UtcNow.ToString("O");
        var state = new design_agent.Models.RunState(runId, "Running", now, now);
        design_agent.Services.RunPersistence.SaveState(runPath, state);
        design_agent.Services.RunPersistence.SaveInput(runPath, new design_agent.Models.RunInput(title, prompt));

        var result = await design_agent.Services.PipelineRunner.RunClarifierAsync(runPath, title, prompt);
        design_agent.Services.RunPersistence.SaveClarifier(runPath, result.Output);

        if (result.HasBlockingQuestions)
        {
            var blocking = (result.Output.Questions ?? []).Where(q => q.Blocking).ToList();
            var nonBlocking = (result.Output.Questions ?? []).Where(q => !q.Blocking).ToList();
            state = state with { Status = "AwaitingClarifications", UpdatedAt = DateTime.UtcNow.ToString("O") };
            design_agent.Services.RunPersistence.SaveState(runPath, state);

            if (json)
            {
                var includedSections = design_agent.Services.SectionSelection.Normalize(null);
                var envelope = new { runId, status = state.Status, runPath, includedSections, blockingQuestions = blocking.Select(q => new { q.Id, q.Text, q.Blocking }), nonBlockingQuestions = nonBlocking.Select(q => new { q.Id, q.Text, q.Blocking }), designDocMarkdown = (string?)null };
                Console.WriteLine(JsonSerializer.Serialize(envelope, JsonOptions));
                return;
            }
            Console.WriteLine($"Run ID: {runId}");
            Console.WriteLine($"Run directory: {runPath}");
            Console.WriteLine();
            Console.WriteLine("Blocking questions (answer with: design-agent answer --run-id <guid>):");
            Console.WriteLine();
            foreach (var q in blocking)
            {
                Console.WriteLine($"  {q.Id}: {q.Text}");
            }
            return;
        }

        var draft = result.Output.ClarifiedSpecDraft ?? throw new InvalidOperationException("Clarifier produced no clarified_spec_draft.");
        var clarifiedSpec = design_agent.Services.ClarifiedSpecHelper.CreateFromDraft(draft, new Dictionary<string, string>());
        design_agent.Services.RunPersistence.SaveClarifiedSpec(runPath, clarifiedSpec);

        var pipelineResult = await design_agent.Services.PipelineRunner.RunRemainingPipelineAsync(runPath, clarifiedSpec, null, pipelineOptions);

        if (pipelineResult is design_agent.Models.PipelineAwaitingSynthQuestions awaiting)
        {
            state = state with { Status = "AwaitingClarifications", UpdatedAt = DateTime.UtcNow.ToString("O") };
            design_agent.Services.RunPersistence.SaveState(runPath, state);
            var blocking = awaiting.Questions.Where(q => q.Blocking).ToList();
            var nonBlocking = awaiting.Questions.Where(q => !q.Blocking).ToList();
            if (json)
            {
                var includedSections = design_agent.Services.RunPersistence.LoadNormalizedIncludedSections(runPath);
                var envelope = new { runId, status = state.Status, runPath, includedSections, blockingQuestions = blocking, nonBlockingQuestions = nonBlocking, designDocMarkdown = (string?)null };
                Console.WriteLine(JsonSerializer.Serialize(envelope, JsonOptions));
            }
            else
            {
                Console.WriteLine("Awaiting clarifications from specialist synthesis. Answer via: flow answer <runId>");
                foreach (var q in blocking)
                    Console.WriteLine($"  [{q.Id}] {q.Text} (blocking)");
                foreach (var q in nonBlocking)
                    Console.WriteLine($"  [{q.Id}] {q.Text}");
            }
            return;
        }

        var completed = (design_agent.Models.PipelineCompleted)pipelineResult;
        state = state with { Status = "Completed", UpdatedAt = DateTime.UtcNow.ToString("O") };
        design_agent.Services.RunPersistence.SaveState(runPath, state);

        if (json)
        {
            var envelope = new { runId, status = state.Status, runPath, includedSections = completed.IncludedSections, blockingQuestions = Array.Empty<object>(), nonBlockingQuestions = Array.Empty<object>(), designDocMarkdown = completed.Published.DesignDocMarkdown };
            Console.WriteLine(JsonSerializer.Serialize(envelope, JsonOptions));
            return;
        }
        Console.WriteLine(completed.Published.DesignDocMarkdown ?? "");
        Console.WriteLine();
        Console.WriteLine($"--- Run ID: {runId} | Design doc: {runPath}/published/DESIGN.md ---");
    }
}
