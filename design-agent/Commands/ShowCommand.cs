using System.CommandLine;

namespace design_agent.Commands;

public static class ShowCommand
{
    public static Command Create()
    {
        var runIdOption = new Option<string>("--run-id", "Run ID (GUID)") { IsRequired = true };
        var runDirOption = new Option<string>("--run-dir", () => ".", "Base directory for runs (default: current directory)");

        var command = new Command("show", "Show the last published design doc");
        command.AddOption(runIdOption);
        command.AddOption(runDirOption);

        command.SetHandler((runId, runDir) =>
        {
            Execute(runId!, runDir ?? ".");
        }, runIdOption, runDirOption);

        return command;
    }

    private static void Execute(string runId, string runDir)
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
            Console.WriteLine("Run not finished; no design doc available.");
            return;
        }

        var markdown = design_agent.Services.RunPersistence.LoadDesignMarkdown(runPath);
        Console.WriteLine(markdown);
    }
}
