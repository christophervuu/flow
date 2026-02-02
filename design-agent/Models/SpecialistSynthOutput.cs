using System.Text.Json.Serialization;

namespace design_agent.Models;

/// <summary>
/// Envelope returned by each specialist synthesizer. partial_design populates only fields the specialist owns.
/// </summary>
public record SpecialistSynthOutput(
    [property: JsonPropertyName("questions")] List<Question>? Questions,
    [property: JsonPropertyName("partial_design")] ProposedDesign? PartialDesign,
    [property: JsonPropertyName("coverage")] SpecialistCoverage? Coverage);

public record SpecialistCoverage(
    [property: JsonPropertyName("provides")] List<string>? Provides,
    [property: JsonPropertyName("notes")] string? Notes);
