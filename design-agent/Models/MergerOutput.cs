using System.Text.Json.Serialization;

namespace design_agent.Models;

/// <summary>
/// Output of the Merger agent: merged proposed_design, missing_sections for generic fill, conflicts, questions.
/// </summary>
public record MergerOutput(
    [property: JsonPropertyName("proposed_design")] ProposedDesign? ProposedDesign,
    [property: JsonPropertyName("missing_sections")] List<string>? MissingSections,
    [property: JsonPropertyName("conflicts")] List<Conflict>? Conflicts,
    [property: JsonPropertyName("questions")] List<Question>? Questions);

public record Conflict(
    [property: JsonPropertyName("area")] string Area,
    [property: JsonPropertyName("description")] string Description,
    [property: JsonPropertyName("suggested_resolution")] string? SuggestedResolution);
