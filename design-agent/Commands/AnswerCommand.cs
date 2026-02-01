using System.CommandLine;

namespace design_agent.Commands;

public static class AnswerCommand
{
    public static Command Create()
    {
        var runIdOption = new Option<string>("--run-id", "Run ID (GUID)") { IsRequired = true };
        var runDirOption = new Option<string>("--run-dir", () => ".", "Base directory for runs (default: current directory)");

        var command = new Command("answer", "Answer blocking questions and resume pipeline");
        command.AddOption(runIdOption);
        command.AddOption(runDirOption);

        command.SetHandler(async (runId, runDir) =>
        {
            await ExecuteAsync(runId!, runDir ?? ".");
        }, runIdOption, runDirOption);

        return command;
    }

    private static async Task ExecuteAsync(string runId, string runDir)
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
        var clarifiedSpec = CreateClarifiedSpecFromDraft(draft!, answers);
        design_agent.Services.RunPersistence.SaveClarifiedSpec(runPath, clarifiedSpec);

        var (_, _, _, published) = await design_agent.Services.PipelineRunner.RunRemainingPipelineAsync(runPath, clarifiedSpec, answers);

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
            .Where(q => !q.Blocking || answers.ContainsKey(q.Id))
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
