using System.Text.Json.Serialization;

namespace design_agent.Models;

/// <summary>
/// Single assumption generated when proceeding without an answer (allowAssumptions=true).
/// Persisted in artifacts/synth/assumptions.json as a list.
/// </summary>
public record AssumptionRecord(
    [property: JsonPropertyName("question_id")] string QuestionId,
    [property: JsonPropertyName("question_text")] string QuestionText,
    [property: JsonPropertyName("assumption")] string Assumption,
    [property: JsonPropertyName("risk")] string Risk);

/// <summary>
/// Envelope returned by Assumption Builder agent.
/// </summary>
public record AssumptionBuilderOutput(
    [property: JsonPropertyName("assumptions")] List<AssumptionRecord>? Assumptions);
