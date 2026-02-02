using System.Text.Json.Serialization;

namespace flow_api.Dto;

public record CreateRunRequest(
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("prompt")] string Prompt,
    [property: JsonPropertyName("context")] CreateRunContext? Context,
    [property: JsonPropertyName("synthSpecialists")] [property: JsonConverter(typeof(SynthSpecialistsConverter))] List<string>? SynthSpecialists = null,
    [property: JsonPropertyName("allowAssumptions")] bool AllowAssumptions = false);

public record CreateRunContext(
    [property: JsonPropertyName("links")] List<string>? Links,
    [property: JsonPropertyName("notes")] string? Notes);
