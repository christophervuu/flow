using System.CommandLine;
using System.Text.Json;

namespace design_agent.Commands;

public static class ShowCommand
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = false };

    public static Command Create()
    {
        var runIdOption = new Option<string>("--run-id", "Run ID (GUID)") { IsRequired = true };
        var runDirOption = new Option<string>("--run-dir", () => ".", "Base directory for runs (default: current directory)");
        var jsonOption = new Option<bool>("--json", "Output a single JSON envelope (runId, status, runPath, designDocMarkdown)");

        var command = new Command("show", "Show the last published design doc");
        command.AddOption(runIdOption);
        command.AddOption(runDirOption);
        command.AddOption(jsonOption);

        command.SetHandler((runId, runDir, json) =>
        {
            Execute(runId!, runDir ?? ".", json);
        }, runIdOption, runDirOption, jsonOption);

        return command;
    }

    private static void Execute(string runId, string runDir, bool json)
    {
        var runPath = design_agent.Services.RunPersistence.GetRunDir(runDir, runId);

        if (!Directory.Exists(runPath))
        {
            Console.Error.WriteLine($"Error: Run not found. Run directory does not exist: {runPath}");
            Environment.Exit(1);
        }

        var designPath = design_agent.Services.RunPersistence.GetDesignMarkdownPath(runPath);
        if (designPath == null)
        {
            if (json)
            {
                var state = design_agent.Services.RunPersistence.LoadState(runPath);
                var includedSections = design_agent.Services.RunPersistence.LoadNormalizedIncludedSections(runPath);
                var envelope = new { runId, status = state.Status, runPath, includedSections, blockingQuestions = Array.Empty<object>(), nonBlockingQuestions = Array.Empty<object>(), designDocMarkdown = (string?)null };
                Console.WriteLine(JsonSerializer.Serialize(envelope, JsonOptions));
            }
            else
            {
                Console.WriteLine("Run not finished; no design doc available.");
            }
            return;
        }

        var markdown = design_agent.Services.RunPersistence.LoadDesignMarkdown(runPath);
        if (json)
        {
            var includedSections = design_agent.Services.RunPersistence.LoadNormalizedIncludedSections(runPath);
            var envelope = new { runId, status = "Completed", runPath, includedSections, blockingQuestions = Array.Empty<object>(), nonBlockingQuestions = Array.Empty<object>(), designDocMarkdown = markdown };
            Console.WriteLine(JsonSerializer.Serialize(envelope, JsonOptions));
        }
        else
        {
            Console.WriteLine(markdown);
        }
    }
}
