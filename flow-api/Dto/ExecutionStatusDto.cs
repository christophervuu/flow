using System.Text.Json.Serialization;

namespace flow_api.Dto;

public record ExecutionStatusDto(
    [property: JsonPropertyName("runId")] string RunId,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("currentStage")] string CurrentStage,
    [property: JsonPropertyName("currentAgent")] string? CurrentAgent,
    [property: JsonPropertyName("completedAgents")] List<string> CompletedAgents,
    [property: JsonPropertyName("activeAgents")] List<string> ActiveAgents,
    [property: JsonPropertyName("pendingAgents")] List<string> PendingAgents,
    [property: JsonPropertyName("progress")] ProgressDto Progress);

public record ProgressDto(
    [property: JsonPropertyName("current")] int Current,
    [property: JsonPropertyName("total")] int Total);

public record TraceEventDto(
    [property: JsonPropertyName("timestamp")] string Timestamp,
    [property: JsonPropertyName("kind")] string Kind,
    [property: JsonPropertyName("stageName")] string? StageName,
    [property: JsonPropertyName("agentName")] string? AgentName,
    [property: JsonPropertyName("message")] string? Message,
    [property: JsonPropertyName("durationMs")] long? DurationMs);
