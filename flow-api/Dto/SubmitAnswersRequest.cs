using System.Text.Json.Serialization;

namespace flow_api.Dto;

public record SubmitAnswersRequest(
    [property: JsonPropertyName("answers")] Dictionary<string, string> Answers,
    [property: JsonPropertyName("allowAssumptions")] bool? AllowAssumptions = null,
    [property: JsonPropertyName("synthSpecialists")] [property: JsonConverter(typeof(SynthSpecialistsConverter))] List<string>? SynthSpecialists = null);
