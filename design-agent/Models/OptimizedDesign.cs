using System.Text.Json.Serialization;

namespace design_agent.Models;

public record OptimizedDesign(
    [property: JsonPropertyName("chosen_approach_summary")] string? ChosenApproachSummary,
    [property: JsonPropertyName("changes_from_original")] List<string>? ChangesFromOriginal,
    [property: JsonPropertyName("tradeoffs")] List<string>? Tradeoffs,
    [property: JsonPropertyName("rollout_plan")] List<string>? RolloutPlan,
    [property: JsonPropertyName("test_plan")] List<string>? TestPlan,
    [property: JsonPropertyName("migration_plan")] List<string>? MigrationPlan);
