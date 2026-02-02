using AgentCore;
using design_agent.Models;

namespace design_agent.Services;

public static class RunPersistence
{
    public static void ValidateGitHubToken() => ChatClientFactory.ValidateGitHubToken();
    public static void ValidateGitHubTokenOrThrow() => ChatClientFactory.ValidateGitHubTokenOrThrow();

    public static string GetRunDir(string runDir, string runId) =>
        AgentCore.RunPersistence.GetRunDir(runDir, "design-agent", runId);

    public static string GetArtifactsDir(string runPath) => AgentCore.RunPersistence.GetArtifactsDir(runPath);
    public static string GetPublishedDir(string runPath) => AgentCore.RunPersistence.GetPublishedDir(runPath);

    public static void EnsureRunDirectory(string runPath) => AgentCore.RunPersistence.EnsureRunDirectory(runPath);

    public static void SaveState(string runPath, RunState state) =>
        AgentCore.RunPersistence.SaveState(runPath, state);

    public static RunState LoadState(string runPath) =>
        AgentCore.RunPersistence.LoadState<RunState>(runPath);

    public static void SaveInput(string runPath, RunInput input) =>
        AgentCore.RunPersistence.SaveInput(runPath, input);

    public static RunInput LoadInput(string runPath) =>
        AgentCore.RunPersistence.LoadInput<RunInput>(runPath);

    public static void SaveClarifier(string runPath, ClarifierOutput output) =>
        AgentCore.RunPersistence.SaveArtifactJson(runPath, "clarifier.json", output);

    public static ClarifierOutput LoadClarifier(string runPath) =>
        AgentCore.RunPersistence.LoadArtifactJson<ClarifierOutput>(runPath, "clarifier.json");

    public static void SaveClarifiedSpec(string runPath, ClarifiedSpec spec) =>
        AgentCore.RunPersistence.SaveArtifactJson(runPath, "clarifiedSpec.json", spec);

    public static ClarifiedSpec LoadClarifiedSpec(string runPath) =>
        AgentCore.RunPersistence.LoadArtifactJson<ClarifiedSpec>(runPath, "clarifiedSpec.json");

    public static void SaveProposedDesign(string runPath, ProposedDesign design) =>
        AgentCore.RunPersistence.SaveArtifactJson(runPath, "proposedDesign.json", design);

    public static void SaveCritique(string runPath, Critique critique) =>
        AgentCore.RunPersistence.SaveArtifactJson(runPath, "critique.json", critique);

    public static void SaveOptimizedDesign(string runPath, OptimizedDesign design) =>
        AgentCore.RunPersistence.SaveArtifactJson(runPath, "optimizedDesign.json", design);

    public static void SavePublishedPackage(string runPath, PublishedPackage package)
    {
        AgentCore.RunPersistence.SaveArtifactJson(runPath, "publishedPackage.json", package);
        AgentCore.RunPersistence.SavePublishedText(runPath, "DESIGN.md", package.DesignDocMarkdown ?? "");
    }

    public static void SaveRawAgentOutput(string runPath, string agentName, string rawOutput) =>
        AgentCore.RunPersistence.SaveArtifactText(runPath, $"{agentName}.raw.txt", rawOutput);

    public static string? GetDesignMarkdownPath(string runPath)
    {
        var path = Path.Combine(AgentCore.RunPersistence.GetPublishedDir(runPath), "DESIGN.md");
        return File.Exists(path) ? path : null;
    }

    public static string LoadDesignMarkdown(string runPath)
    {
        var path = GetDesignMarkdownPath(runPath)
            ?? throw new InvalidOperationException("Run not finished; no design doc available.");
        return File.ReadAllText(path);
    }
}
