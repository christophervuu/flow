using System.Text.Json;

namespace AgentCore;

/// <summary>
/// Appends NDJSON trace events to artifacts/trace.jsonl. Never writes secrets or prompt/response content.
/// </summary>
public sealed class TraceWriter : IDisposable
{
    private readonly StreamWriter _writer;
    private readonly JsonSerializerOptions _jsonOptions = new() { WriteIndented = false };
    private readonly object _lock = new();

    public TraceWriter(string runPath)
    {
        var tracePath = Path.Combine(RunPersistence.GetArtifactsDir(runPath), "trace.jsonl");
        Directory.CreateDirectory(Path.GetDirectoryName(tracePath)!);
        _writer = new StreamWriter(new FileStream(tracePath, FileMode.Append, FileAccess.Write, FileShare.Read));
    }

    public void Append(JsonStageEvent evt)
    {
        var line = new TraceLine(
            DateTime.UtcNow.ToString("O"),
            evt.Kind,
            evt.StageName,
            evt.AgentName,
            evt.Message,
            evt.DurationMs);
        var json = JsonSerializer.Serialize(line, _jsonOptions);
        lock (_lock)
        {
            _writer.WriteLine(json);
            _writer.Flush();
        }
    }

    public void Dispose() => _writer.Dispose();

    private record TraceLine(string Timestamp, string Kind, string? StageName, string? AgentName, string? Message, long? DurationMs);
}
