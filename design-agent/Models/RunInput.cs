using System.Text.Json.Serialization;

namespace design_agent.Models;

public record RunInput(
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("prompt")] string Prompt,
    [property: JsonPropertyName("includedSections")] List<string>? IncludedSections = null);
