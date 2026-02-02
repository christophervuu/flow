using System.ComponentModel;
using Microsoft.Extensions.AI;

namespace AgentCore;

/// <summary>
/// Run-scoped tools for agents: read/list/write files under runPath only. Path traversal (..) and absolute paths rejected.
/// </summary>
public class RunScopedTools
{
    private readonly string _runPath;

    public RunScopedTools(string runPath)
    {
        _runPath = runPath ?? throw new ArgumentNullException(nameof(runPath));
    }

    [Description("Read a file from the run directory. relativePath is relative to the run root (e.g. input.json, artifacts/clarifier.json, published/DESIGN.md).")]
    public string ReadRunFile([Description("Relative path to the file, e.g. input.json or artifacts/proposedDesign.json")] string relativePath)
    {
        var fullPath = RunPersistence.ResolveRunRelativePath(_runPath, relativePath);
        return File.Exists(fullPath) ? File.ReadAllText(fullPath) : throw new FileNotFoundException("File not found.", relativePath);
    }

    [Description("List files in the run directory matching a glob pattern (e.g. *.json, artifacts/*.json). Returns relative paths.")]
    public string ListRunFiles([Description("Glob pattern relative to run root, e.g. *.json or artifacts/*.json")] string glob)
    {
        var paths = RunPersistence.ListRunFiles(_runPath, glob);
        return string.Join("\n", paths);
    }

    [Description("Write text content to a file under the run artifacts directory. relativePath is relative to artifacts/ (e.g. myfile.txt or subdir/note.json).")]
    public string WriteArtifact([Description("Relative path under artifacts/, e.g. myfile.txt")] string relativePath, [Description("Content to write")] string content)
    {
        RunPersistence.SaveArtifactText(_runPath, relativePath, content);
        return $"Wrote {relativePath}";
    }

    [Description("Write text content to a file under the run published directory. relativePath is relative to published/ (e.g. DESIGN.md).")]
    public string WritePublished([Description("Relative path under published/, e.g. DESIGN.md")] string relativePath, [Description("Content to write")] string content)
    {
        RunPersistence.SavePublishedText(_runPath, relativePath, content);
        return $"Wrote {relativePath}";
    }

    /// <summary>
    /// Returns AIFunction instances for use with ChatClientAgent (construction or run options).
    /// </summary>
    public static IReadOnlyList<AIFunction> CreateFunctions(string runPath)
    {
        var instance = new RunScopedTools(runPath);
        return
        [
            AIFunctionFactory.Create(instance.ReadRunFile),
            AIFunctionFactory.Create(instance.ListRunFiles),
            AIFunctionFactory.Create(instance.WriteArtifact),
            AIFunctionFactory.Create(instance.WritePublished),
        ];
    }
}
