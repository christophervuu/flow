using System.Text.Json;

namespace AgentCore;

/// <summary>
/// Generic run persistence: agent-name aware run directory, state/input, and path-safe artifact/published writes.
/// Never persist GITHUB_TOKEN or other secrets.
/// </summary>
public static class RunPersistence
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNameCaseInsensitive = true
    };

    /// <summary>
    /// Returns the run directory path: {runDir}/.{agentName}/runs/{runId}.
    /// </summary>
    public static string GetRunDir(string runDir, string agentName, string runId)
    {
        var basePath = string.IsNullOrWhiteSpace(runDir) ? "." : runDir;
        return Path.Combine(basePath, $".{agentName}", "runs", runId);
    }

    public static string GetArtifactsDir(string runPath) => Path.Combine(runPath, "artifacts");
    public static string GetPublishedDir(string runPath) => Path.Combine(runPath, "published");

    public static void EnsureRunDirectory(string runPath)
    {
        Directory.CreateDirectory(GetArtifactsDir(runPath));
        Directory.CreateDirectory(GetPublishedDir(runPath));
    }

    public static void SaveState<T>(string runPath, T state)
    {
        var path = Path.Combine(runPath, "state.json");
        File.WriteAllText(path, JsonSerializer.Serialize(state, JsonOptions));
    }

    public static T LoadState<T>(string runPath) where T : class
    {
        var path = Path.Combine(runPath, "state.json");
        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<T>(json, JsonOptions)
            ?? throw new InvalidOperationException($"Failed to load state from {path}");
    }

    public static void SaveInput<T>(string runPath, T input)
    {
        var path = Path.Combine(runPath, "input.json");
        File.WriteAllText(path, JsonSerializer.Serialize(input, JsonOptions));
    }

    public static T LoadInput<T>(string runPath) where T : class
    {
        var path = Path.Combine(runPath, "input.json");
        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<T>(json, JsonOptions)
            ?? throw new InvalidOperationException($"Failed to load input from {path}");
    }

    /// <summary>
    /// Resolves relativePath under artifacts/ and validates: no .. or absolute paths.
    /// </summary>
    private static string ResolveArtifactPath(string runPath, string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
            throw new ArgumentException("Relative path cannot be empty.", nameof(relativePath));
        if (Path.IsPathRooted(relativePath))
            throw new ArgumentException("Absolute paths are not allowed.", nameof(relativePath));
        var normalized = relativePath.Replace('\\', '/');
        if (normalized.Contains("..", StringComparison.Ordinal))
            throw new ArgumentException("Path traversal (..) is not allowed.", nameof(relativePath));
        var fullPath = Path.GetFullPath(Path.Combine(GetArtifactsDir(runPath), relativePath));
        var artifactsFull = Path.GetFullPath(GetArtifactsDir(runPath));
        if (!fullPath.StartsWith(artifactsFull, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Path escapes artifacts directory.", nameof(relativePath));
        return fullPath;
    }

    /// <summary>
    /// Resolves relativePath under published/ and validates: no .. or absolute paths.
    /// </summary>
    private static string ResolvePublishedPath(string runPath, string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
            throw new ArgumentException("Relative path cannot be empty.", nameof(relativePath));
        if (Path.IsPathRooted(relativePath))
            throw new ArgumentException("Absolute paths are not allowed.", nameof(relativePath));
        var normalized = relativePath.Replace('\\', '/');
        if (normalized.Contains("..", StringComparison.Ordinal))
            throw new ArgumentException("Path traversal (..) is not allowed.", nameof(relativePath));
        var fullPath = Path.GetFullPath(Path.Combine(GetPublishedDir(runPath), relativePath));
        var publishedFull = Path.GetFullPath(GetPublishedDir(runPath));
        if (!fullPath.StartsWith(publishedFull, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Path escapes published directory.", nameof(relativePath));
        return fullPath;
    }

    public static void SaveArtifactText(string runPath, string relativePath, string content)
    {
        var fullPath = ResolveArtifactPath(runPath, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        File.WriteAllText(fullPath, content);
    }

    public static void SaveArtifactJson<T>(string runPath, string relativePath, T value)
    {
        var fullPath = ResolveArtifactPath(runPath, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        File.WriteAllText(fullPath, JsonSerializer.Serialize(value, JsonOptions));
    }

    public static T LoadArtifactJson<T>(string runPath, string relativePath) where T : class
    {
        var fullPath = ResolveArtifactPath(runPath, relativePath);
        var json = File.ReadAllText(fullPath);
        return JsonSerializer.Deserialize<T>(json, JsonOptions)
            ?? throw new InvalidOperationException($"Failed to load artifact from {relativePath}");
    }

    public static void SavePublishedText(string runPath, string relativePath, string content)
    {
        var fullPath = ResolvePublishedPath(runPath, relativePath);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
        File.WriteAllText(fullPath, content);
    }

    /// <summary>
    /// Resolves relativePath under runPath (root, artifacts/, or published/). Rejects .. and absolute paths.
    /// </summary>
    public static string ResolveRunRelativePath(string runPath, string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
            throw new ArgumentException("Relative path cannot be empty.", nameof(relativePath));
        if (Path.IsPathRooted(relativePath))
            throw new ArgumentException("Absolute paths are not allowed.", nameof(relativePath));
        var normalized = relativePath.Replace('\\', '/');
        if (normalized.Contains("..", StringComparison.Ordinal))
            throw new ArgumentException("Path traversal (..) is not allowed.", nameof(relativePath));
        var fullPath = Path.GetFullPath(Path.Combine(runPath, relativePath));
        var runFull = Path.GetFullPath(runPath);
        if (!fullPath.StartsWith(runFull, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Path escapes run directory.", nameof(relativePath));
        return fullPath;
    }

    /// <summary>
    /// Enumerates file paths under runPath matching the glob pattern (e.g. "*.json", "artifacts/*.json"). Rejects .. in pattern.
    /// Returns relative paths from runPath.
    /// </summary>
    public static IReadOnlyList<string> ListRunFiles(string runPath, string glob)
    {
        if (string.IsNullOrWhiteSpace(glob))
            throw new ArgumentException("Glob pattern cannot be empty.", nameof(glob));
        if (glob.Replace('\\', '/').Contains("..", StringComparison.Ordinal))
            throw new ArgumentException("Path traversal (..) is not allowed in glob.", nameof(glob));
        var runFull = Path.GetFullPath(runPath);
        var searchDir = Path.GetDirectoryName(Path.Combine(runPath, glob)) ?? runPath;
        var searchDirFull = Path.GetFullPath(searchDir);
        if (!searchDirFull.StartsWith(runFull, StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Glob escapes run directory.", nameof(glob));
        var pattern = Path.GetFileName(glob);
        if (string.IsNullOrEmpty(pattern))
            pattern = "*";
        var list = new List<string>();
        if (!Directory.Exists(searchDirFull))
            return list;
        foreach (var full in Directory.EnumerateFiles(searchDirFull, pattern))
        {
            var relative = Path.GetRelativePath(runFull, full);
            list.Add(relative.Replace('\\', '/'));
        }
        return list;
    }
}
