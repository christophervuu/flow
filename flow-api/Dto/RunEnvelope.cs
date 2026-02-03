using System.Text.Json.Serialization;

namespace flow_api.Dto;

public record RunEnvelope(
    [property: JsonPropertyName("runId")] string RunId,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("runPath")] string RunPath,
    [property: JsonPropertyName("includedSections")] IReadOnlyList<string> IncludedSections,
    [property: JsonPropertyName("blockingQuestions")] List<QuestionDto> BlockingQuestions,
    [property: JsonPropertyName("nonBlockingQuestions")] List<QuestionDto> NonBlockingQuestions,
    [property: JsonPropertyName("designDocMarkdown")] string? DesignDocMarkdown);

public record QuestionDto(
    [property: JsonPropertyName("id")] string Id,
    [property: JsonPropertyName("text")] string Text,
    [property: JsonPropertyName("blocking")] bool Blocking);
