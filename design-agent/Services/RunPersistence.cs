using System.Text.Json;
using design_agent.Models;

namespace design_agent.Services;

public static class RunPersistence
{
    public static void ValidateGitHubToken()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("GITHUB_TOKEN")))
        {
            Console.Error.WriteLine("Error: GITHUB_TOKEN environment variable is required. Set it with a PAT that has GitHub Models (models: read) access.");
            Environment.Exit(1);
        }
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNameCaseInsensitive = true
    };

    public static string GetRunDir(string runDir, string runId)
    {
        var basePath = string.IsNullOrWhiteSpace(runDir) ? "." : runDir;
        return Path.Combine(basePath, ".design-agent", "runs", runId);
    }

    public static string GetArtifactsDir(string runPath) => Path.Combine(runPath, "artifacts");
    public static string GetPublishedDir(string runPath) => Path.Combine(runPath, "published");

    public static void EnsureRunDirectory(string runPath)
    {
        Directory.CreateDirectory(GetArtifactsDir(runPath));
        Directory.CreateDirectory(GetPublishedDir(runPath));
    }

    public static void SaveState(string runPath, RunState state)
    {
        var path = Path.Combine(runPath, "state.json");
        File.WriteAllText(path, JsonSerializer.Serialize(state, JsonOptions));
    }

    public static RunState LoadState(string runPath)
    {
        var path = Path.Combine(runPath, "state.json");
        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<RunState>(json, JsonOptions)
            ?? throw new InvalidOperationException($"Failed to load state from {path}");
    }

    public static void SaveInput(string runPath, RunInput input)
    {
        var path = Path.Combine(runPath, "input.json");
        File.WriteAllText(path, JsonSerializer.Serialize(input, JsonOptions));
    }

    public static RunInput LoadInput(string runPath)
    {
        var path = Path.Combine(runPath, "input.json");
        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<RunInput>(json, JsonOptions)
            ?? throw new InvalidOperationException($"Failed to load input from {path}");
    }

    public static void SaveClarifier(string runPath, ClarifierOutput output)
    {
        var path = Path.Combine(GetArtifactsDir(runPath), "clarifier.json");
        File.WriteAllText(path, JsonSerializer.Serialize(output, JsonOptions));
    }

    public static ClarifierOutput LoadClarifier(string runPath)
    {
        var path = Path.Combine(GetArtifactsDir(runPath), "clarifier.json");
        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<ClarifierOutput>(json, JsonOptions)
            ?? throw new InvalidOperationException($"Failed to load clarifier from {path}");
    }

    public static void SaveClarifiedSpec(string runPath, ClarifiedSpec spec)
    {
        var path = Path.Combine(GetArtifactsDir(runPath), "clarifiedSpec.json");
        File.WriteAllText(path, JsonSerializer.Serialize(spec, JsonOptions));
    }

    public static ClarifiedSpec LoadClarifiedSpec(string runPath)
    {
        var path = Path.Combine(GetArtifactsDir(runPath), "clarifiedSpec.json");
        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<ClarifiedSpec>(json, JsonOptions)
            ?? throw new InvalidOperationException($"Failed to load clarifiedSpec from {path}");
    }

    public static void SaveProposedDesign(string runPath, ProposedDesign design)
    {
        var path = Path.Combine(GetArtifactsDir(runPath), "proposedDesign.json");
        File.WriteAllText(path, JsonSerializer.Serialize(design, JsonOptions));
    }

    public static void SaveCritique(string runPath, Critique critique)
    {
        var path = Path.Combine(GetArtifactsDir(runPath), "critique.json");
        File.WriteAllText(path, JsonSerializer.Serialize(critique, JsonOptions));
    }

    public static void SaveOptimizedDesign(string runPath, OptimizedDesign design)
    {
        var path = Path.Combine(GetArtifactsDir(runPath), "optimizedDesign.json");
        File.WriteAllText(path, JsonSerializer.Serialize(design, JsonOptions));
    }

    public static void SavePublishedPackage(string runPath, PublishedPackage package)
    {
        var path = Path.Combine(GetArtifactsDir(runPath), "publishedPackage.json");
        File.WriteAllText(path, JsonSerializer.Serialize(package, JsonOptions));

        var designPath = Path.Combine(GetPublishedDir(runPath), "DESIGN.md");
        File.WriteAllText(designPath, package.DesignDocMarkdown ?? "");
    }

    public static void SaveRawAgentOutput(string runPath, string agentName, string rawOutput)
    {
        var path = Path.Combine(GetArtifactsDir(runPath), $"{agentName}.raw.txt");
        File.WriteAllText(path, rawOutput);
    }

    public static string? GetDesignMarkdownPath(string runPath)
    {
        var path = Path.Combine(GetPublishedDir(runPath), "DESIGN.md");
        return File.Exists(path) ? path : null;
    }

    public static string LoadDesignMarkdown(string runPath)
    {
        var path = GetDesignMarkdownPath(runPath)
            ?? throw new InvalidOperationException("Run not finished; no design doc available.");
        return File.ReadAllText(path);
    }
}
