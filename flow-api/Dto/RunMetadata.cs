using System.Text.Json.Serialization;

namespace flow_api.Dto;

public record RunMetadata(
    [property: JsonPropertyName("runId")] string RunId,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("createdAt")] string CreatedAt,
    [property: JsonPropertyName("updatedAt")] string UpdatedAt,
    [property: JsonPropertyName("hasDesignDoc")] bool HasDesignDoc,
    [property: JsonPropertyName("artifactPaths")] ArtifactPathsDto ArtifactPaths,
    [property: JsonPropertyName("blockingQuestions")] List<QuestionDto>? BlockingQuestions = null,
    [property: JsonPropertyName("nonBlockingQuestions")] List<QuestionDto>? NonBlockingQuestions = null,
    [property: JsonPropertyName("remainingOpenQuestionsCount")] int? RemainingOpenQuestionsCount = null,
    [property: JsonPropertyName("assumptionsCount")] int? AssumptionsCount = null,
    [property: JsonPropertyName("executionStatus")] ExecutionStatusDto? ExecutionStatus = null);

public record ArtifactPathsDto(
    [property: JsonPropertyName("state")] string State,
    [property: JsonPropertyName("input")] string Input,
    [property: JsonPropertyName("clarifier")] string Clarifier,
    [property: JsonPropertyName("clarifiedSpec")] string ClarifiedSpec,
    [property: JsonPropertyName("publishedPackage")] string PublishedPackage,
    [property: JsonPropertyName("designDoc")] string DesignDoc);
