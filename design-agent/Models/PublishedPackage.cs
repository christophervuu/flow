using System.Text.Json.Serialization;

namespace design_agent.Models;

public record PublishedPackage(
    [property: JsonPropertyName("design_doc_markdown")] string? DesignDocMarkdown,
    [property: JsonPropertyName("issues")] List<Issue>? Issues,
    [property: JsonPropertyName("pr_plan")] List<string>? PrPlan,
    [property: JsonPropertyName("remaining_open_questions")] List<string>? RemainingOpenQuestions,
    [property: JsonPropertyName("included_sections")] List<string>? IncludedSections = null);

public record Issue(
    [property: JsonPropertyName("title")] string? Title,
    [property: JsonPropertyName("body")] string? Body,
    [property: JsonPropertyName("labels")] List<string>? Labels,
    [property: JsonPropertyName("acceptance_criteria")] List<string>? AcceptanceCriteria);
