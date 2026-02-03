namespace design_agent.Services;

/// <summary>
/// Deterministic section normalization and validation. Canonical section IDs and heading text.
/// </summary>
public static class SectionSelection
{
    /// <summary>
    /// All valid section IDs in canonical order.
    /// </summary>
    public static readonly IReadOnlyList<string> AllSectionIds = [
        "title",
        "problem_statement",
        "goals_non_goals",
        "requirements",
        "proposed_design",
        "api_contracts",
        "data_model",
        "failure_modes_mitigations",
        "observability",
        "security_privacy",
        "rollout_plan",
        "test_plan",
        "alternatives_considered",
        "open_questions",
        "work_breakdown"
    ];

    /// <summary>
    /// Section IDs that require proposed_design to be included (dependency).
    /// </summary>
    private static readonly HashSet<string> ProposedDesignDependents = [
        "api_contracts",
        "data_model",
        "failure_modes_mitigations",
        "observability",
        "security_privacy"
    ];

    private static readonly IReadOnlyDictionary<string, string> IdToHeading = new Dictionary<string, string>
    {
        ["title"] = "## Title",
        ["problem_statement"] = "## Problem Statement",
        ["goals_non_goals"] = "## Goals / Non-goals",
        ["requirements"] = "## Requirements (Functional / Non-functional)",
        ["proposed_design"] = "## Proposed Design (Overview, Components, Data Flow)",
        ["api_contracts"] = "## API Contracts",
        ["data_model"] = "## Data Model",
        ["failure_modes_mitigations"] = "## Failure Modes & Mitigations",
        ["observability"] = "## Observability",
        ["security_privacy"] = "## Security & Privacy",
        ["rollout_plan"] = "## Rollout Plan",
        ["test_plan"] = "## Test Plan",
        ["alternatives_considered"] = "## Alternatives Considered",
        ["open_questions"] = "## Open Questions",
        ["work_breakdown"] = "## Work Breakdown (Issues + PR plan)"
    };

    /// <summary>
    /// Default minimal sections when included_sections is null or empty.
    /// </summary>
    public static readonly IReadOnlyList<string> DefaultMinimalSections = [
        "title",
        "problem_statement",
        "goals_non_goals",
        "requirements",
        "proposed_design"
    ];

    /// <summary>
    /// Normalizes and validates the include-list. Returns sections in canonical order.
    /// </summary>
    /// <param name="includedSections">Raw section IDs from user; null or empty yields default minimal.</param>
    /// <returns>Normalized, validated, and ordered list of section IDs.</returns>
    /// <exception cref="ArgumentException">Thrown when invalid section IDs are present.</exception>
    public static IReadOnlyList<string> Normalize(IReadOnlyList<string>? includedSections)
    {
        if (includedSections == null || includedSections.Count == 0)
            return DefaultMinimalSections;

        var validIds = new HashSet<string>(AllSectionIds, StringComparer.OrdinalIgnoreCase);
        var normalized = new List<string>();
        var invalid = new List<string>();

        foreach (var raw in includedSections)
        {
            var id = raw?.Trim().ToLowerInvariant().Replace('-', '_') ?? "";
            if (string.IsNullOrEmpty(id)) continue;
            if (validIds.Contains(id))
            {
                if (!normalized.Contains(id, StringComparer.OrdinalIgnoreCase))
                    normalized.Add(AllSectionIds.First(s => string.Equals(s, id, StringComparison.OrdinalIgnoreCase)));
            }
            else
            {
                invalid.Add(raw ?? "(null)");
            }
        }

        if (invalid.Count > 0)
        {
            var validList = string.Join(", ", AllSectionIds);
            throw new ArgumentException(
                $"Invalid section IDs: {string.Join(", ", invalid)}. Valid IDs: {validList}.");
        }

        // Auto-add proposed_design if any dependent section is included but proposed_design is not
        var hasProposedDesign = normalized.Any(s => string.Equals(s, "proposed_design", StringComparison.OrdinalIgnoreCase));
        if (!hasProposedDesign && normalized.Any(s => ProposedDesignDependents.Contains(s)))
        {
            normalized.Add("proposed_design");
        }

        // Sort by canonical order (deduplicate by keeping first occurrence, then sort)
        var orderIndex = AllSectionIds.Select((id, i) => (id, i)).ToDictionary(x => x.id, x => x.i);
        normalized.Sort((a, b) => orderIndex[a].CompareTo(orderIndex[b]));

        return normalized;
    }

    /// <summary>
    /// Returns the canonical markdown heading for a section ID.
    /// </summary>
    public static string GetHeading(string sectionId) =>
        IdToHeading.TryGetValue(sectionId, out var h) ? h : $"## {sectionId}";

    /// <summary>
    /// Builds the section-to-heading mapping text for the Publisher prompt.
    /// </summary>
    public static string BuildHeadingMappingText(IReadOnlyList<string> includedSections)
    {
        var lines = includedSections.Select(id => $"- {id} -> {GetHeading(id)}");
        return string.Join("\n", lines);
    }
}
