using System.Text.Json.Serialization;

namespace design_agent.Models;

/// <summary>
/// Optional consistency report from Consistency Checker. Does not modify ProposedDesign.
/// </summary>
public record ConsistencyReport(
    [property: JsonPropertyName("issues")] List<ConsistencyIssue>? Issues);

public record ConsistencyIssue(
    [property: JsonPropertyName("area")] string Area,
    [property: JsonPropertyName("issue")] string Issue,
    [property: JsonPropertyName("suggestion")] string? Suggestion);
