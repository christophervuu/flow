using System.Text.Json.Serialization;

namespace design_agent.Models;

/// <summary>
/// Persisted under artifacts/synth/selection.json: selected specialist keys and allowAssumptions flag.
/// </summary>
public record SynthSelection(
    [property: JsonPropertyName("synthSpecialists")] List<string> SynthSpecialists,
    [property: JsonPropertyName("allowAssumptions")] bool AllowAssumptions);
