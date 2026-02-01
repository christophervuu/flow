using System.Text.Json.Serialization;

namespace flow_api.Dto;

public record SubmitAnswersRequest(
    [property: JsonPropertyName("answers")] Dictionary<string, string> Answers);
