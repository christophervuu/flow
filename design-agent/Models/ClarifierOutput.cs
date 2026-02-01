using System.Text.Json.Serialization;

namespace design_agent.Models;

public record ClarifierOutput(
    [property: JsonPropertyName("questions")] List<Question>? Questions,
    [property: JsonPropertyName("clarified_spec_draft")] ClarifiedSpecDraft? ClarifiedSpecDraft);

public record Question(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("text")] string Text,
    [property: JsonPropertyName("blocking")] bool Blocking);

public record ClarifiedSpecDraft(
    [property: JsonPropertyName("title")] string? Title,
    [property: JsonPropertyName("problem_statement")] string? ProblemStatement,
    [property: JsonPropertyName("goals")] List<string>? Goals,
    [property: JsonPropertyName("non_goals")] List<string>? NonGoals,
    [property: JsonPropertyName("assumptions")] List<string>? Assumptions,
    [property: JsonPropertyName("constraints")] List<string>? Constraints,
    [property: JsonPropertyName("requirements")] RequirementsSpec? Requirements,
    [property: JsonPropertyName("success_metrics")] List<string>? SuccessMetrics,
    [property: JsonPropertyName("open_questions")] List<Question>? OpenQuestions);

public record RequirementsSpec(
    [property: JsonPropertyName("functional")] List<string> Functional,
    [property: JsonPropertyName("non_functional")] List<string> NonFunctional);
