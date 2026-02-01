using System.Text.Json.Serialization;

namespace design_agent.Models;

/// <summary>
/// Same shape as clarified_spec_draft, but with open questions updated/answered and no remaining blocking questions.
/// </summary>
public record ClarifiedSpec(
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("problem_statement")] string ProblemStatement,
    [property: JsonPropertyName("goals")] List<string> Goals,
    [property: JsonPropertyName("non_goals")] List<string> NonGoals,
    [property: JsonPropertyName("assumptions")] List<string> Assumptions,
    [property: JsonPropertyName("constraints")] List<string> Constraints,
    [property: JsonPropertyName("requirements")] RequirementsSpec Requirements,
    [property: JsonPropertyName("success_metrics")] List<string> SuccessMetrics,
    [property: JsonPropertyName("open_questions")] List<Question> OpenQuestions);
