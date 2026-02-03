using System.Text.Json.Serialization;

namespace design_agent.Models;

public record RunState(
    [property: JsonPropertyName("runId")] string RunId,
    [property: JsonPropertyName("status")] string Status,  // Running | AwaitingClarifications | Completed | Failed
    [property: JsonPropertyName("createdAt")] string CreatedAt,
    [property: JsonPropertyName("updatedAt")] string UpdatedAt);
