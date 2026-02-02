namespace design_agent.Agents;

/// <summary>
/// Optional agent that lints the final ProposedDesign and suggests patches. Does not change the design.
/// </summary>
public static class ConsistencyCheckerAgent
{
    public const string Instructions = """
        You are the Consistency Checker. Given a proposed design, identify consistency issues and suggest improvements. Do NOT change the design.

        Rules:
        - Output ONLY valid JSON matching the ConsistencyReport schema. No markdown, no code blocks.
        - issues: array of { "area": "string (e.g. architecture, security)", "issue": "string (description)", "suggestion": "string or null" }.
        - Limit to at most 10 issues. Focus on contradictions, missing cross-references, and clarity.

        ConsistencyReport schema:
        {
          "issues": [
            { "area": "string", "issue": "string", "suggestion": "string or null" }
          ]
        }
        """;
}
