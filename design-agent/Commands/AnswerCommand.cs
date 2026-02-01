using System.CommandLine;
using System.Text.Json;

namespace design_agent.Commands;

public static class AnswerCommand
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = false };

    public static Command Create()
    {
        var runIdOption = new Option<string>("--run-id", "Run ID (GUID)") { IsRequired = true };
        var runDirOption = new Option<string>("--run-dir", () => ".", "Base directory for runs (default: current directory)");
        var jsonOption = new Option<bool>("--json", "Output a single JSON envelope (runId, status, questions, designDocMarkdown)");

        var command = new Command("answer", "Answer blocking questions and resume pipeline");
        command.AddOption(runIdOption);
        command.AddOption(runDirOption);
        command.AddOption(jsonOption);

        command.SetHandler(async (runId, runDir, json) =>
        {
            await ExecuteAsync(runId!, runDir ?? ".", json);
        }, runIdOption, runDirOption, jsonOption);

        return command;
    }

    private static async Task ExecuteAsync(string runId, string runDir, bool json)
    {
        design_agent.Services.RunPersistence.ValidateGitHubToken();

        var runPath = design_agent.Services.RunPersistence.GetRunDir(runDir, runId);

        if (!Directory.Exists(runPath))
        {
            Console.Error.WriteLine($"Error: Run not found. Run directory does not exist: {runPath}");
            Environment.Exit(1);
        }

        var state = design_agent.Services.RunPersistence.LoadState(runPath);
        if (state.Status != "AwaitingClarifications")
        {
            Console.Error.WriteLine($"Error: Run is not awaiting clarifications. Current status: {state.Status}");
            Environment.Exit(1);
        }

        var clarifierOutput = design_agent.Services.RunPersistence.LoadClarifier(runPath);
        var blocking = (clarifierOutput.Questions ?? []).Where(q => q.Blocking).ToList();

        if (blocking.Count == 0)
        {
            Console.Error.WriteLine("Error: No blocking questions found.");
            Environment.Exit(1);
        }

        var answers = new Dictionary<string, string>();
        Console.WriteLine("Please answer the following blocking questions:");
        Console.WriteLine();

        foreach (var q in blocking)
        {
            Console.Write($"{q.Id}: {q.Text} ");
            var answer = Console.ReadLine() ?? "";
            answers[q.Id] = answer;
        }

        var draft = clarifierOutput.ClarifiedSpecDraft;
        var clarifiedSpec = design_agent.Services.ClarifiedSpecHelper.CreateFromDraft(draft!, answers);
        design_agent.Services.RunPersistence.SaveClarifiedSpec(runPath, clarifiedSpec);

        var (_, _, _, published) = await design_agent.Services.PipelineRunner.RunRemainingPipelineAsync(runPath, clarifiedSpec, answers);

        state = state with { Status = "Completed", UpdatedAt = DateTime.UtcNow.ToString("O") };
        design_agent.Services.RunPersistence.SaveState(runPath, state);

        if (json)
        {
            var envelope = new { runId, status = state.Status, runPath, blockingQuestions = Array.Empty<object>(), nonBlockingQuestions = Array.Empty<object>(), designDocMarkdown = published.DesignDocMarkdown };
            Console.WriteLine(JsonSerializer.Serialize(envelope, JsonOptions));
            return;
        }
        Console.WriteLine(published.DesignDocMarkdown ?? "");
        Console.WriteLine();
        Console.WriteLine($"--- Run ID: {runId} | Design doc: {runPath}/published/DESIGN.md ---");
    }
}
