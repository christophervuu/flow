using System.CommandLine;

namespace design_agent.Commands;

public static class StartCommand
{
    public static Command Create()
    {
        var titleOption = new Option<string>("--title", "Design title") { IsRequired = true };
        var promptOption = new Option<string>("--prompt", "Initial freeform prompt") { IsRequired = true };
        var runDirOption = new Option<string>("--run-dir", () => ".", "Base directory for runs (default: current directory)");

        var command = new Command("start", "Start a new design run");
        command.AddOption(titleOption);
        command.AddOption(promptOption);
        command.AddOption(runDirOption);

        command.SetHandler(async (title, prompt, runDir) =>
        {
            await ExecuteAsync(title!, prompt!, runDir ?? ".");
        }, titleOption, promptOption, runDirOption);

        return command;
    }

    private static async Task ExecuteAsync(string title, string prompt, string runDir)
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
            state = state with { Status = "AwaitingClarifications", UpdatedAt = DateTime.UtcNow.ToString("O") };
            design_agent.Services.RunPersistence.SaveState(runPath, state);

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
        var clarifiedSpec = CreateClarifiedSpecFromDraft(draft, new Dictionary<string, string>());
        design_agent.Services.RunPersistence.SaveClarifiedSpec(runPath, clarifiedSpec);

        var (_, _, _, published) = await design_agent.Services.PipelineRunner.RunRemainingPipelineAsync(runPath, clarifiedSpec);

        state = state with { Status = "Completed", UpdatedAt = DateTime.UtcNow.ToString("O") };
        design_agent.Services.RunPersistence.SaveState(runPath, state);

        Console.WriteLine(published.DesignDocMarkdown ?? "");
        Console.WriteLine();
        Console.WriteLine($"--- Run ID: {runId} | Design doc: {runPath}/published/DESIGN.md ---");
    }

    private static design_agent.Models.ClarifiedSpec CreateClarifiedSpecFromDraft(
        design_agent.Models.ClarifiedSpecDraft draft,
        IReadOnlyDictionary<string, string> answers)
    {
        var openQuestions = (draft.OpenQuestions ?? [])
            .Where(q => !q.Blocking)
            .ToList();
        return new design_agent.Models.ClarifiedSpec(
            draft.Title ?? "",
            draft.ProblemStatement ?? "",
            draft.Goals ?? [],
            draft.NonGoals ?? [],
            draft.Assumptions ?? [],
            draft.Constraints ?? [],
            draft.Requirements ?? new design_agent.Models.RequirementsSpec([], []),
            draft.SuccessMetrics ?? [],
            openQuestions);
    }
}
