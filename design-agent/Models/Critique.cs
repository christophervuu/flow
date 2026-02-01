using System.Text.Json.Serialization;

namespace design_agent.Models;

public record Critique(
    [property: JsonPropertyName("risks")] List<Risk>? Risks,
    [property: JsonPropertyName("missing_requirements")] List<string>? MissingRequirements,
    [property: JsonPropertyName("questionable_assumptions")] List<string>? QuestionableAssumptions,
    [property: JsonPropertyName("alternatives")] List<Alternative>? Alternatives);

public record Risk(
    [property: JsonPropertyName("risk")] string Description,
    [property: JsonPropertyName("severity")] string Severity,  // low|medium|high
    [property: JsonPropertyName("likelihood")] string Likelihood,  // low|medium|high
    [property: JsonPropertyName("mitigation")] string Mitigation);

public record Alternative(
    [property: JsonPropertyName("option")] string? Option,
    [property: JsonPropertyName("pros")] List<string>? Pros,
    [property: JsonPropertyName("cons")] List<string>? Cons);
