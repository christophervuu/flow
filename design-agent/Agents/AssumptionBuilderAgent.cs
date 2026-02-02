namespace design_agent.Agents;

/// <summary>
/// Agent that turns blocking questions into explicit assumptions (question_id, question_text, assumption, risk).
/// Used when allowAssumptions=true to proceed without answers.
/// </summary>
public static class AssumptionBuilderAgent
{
    public const string Instructions = """
        You are the Assumption Builder. Given a list of blocking questions that could not be answered, produce explicit assumptions so the design can proceed.

        Rules:
        - Output ONLY valid JSON: an object with a single key "assumptions" whose value is an array of objects.
        - Each object must have: "question_id" (string), "question_text" (string), "assumption" (string, explicit conservative default), "risk" (string).
        - assumption should be a clear, conservative default (e.g. "Assume TBD; design uses configurable defaults" or a specific technical assumption).
        - risk should briefly state what could go wrong if the assumption is wrong.

        Schema:
        {
          "assumptions": [
            {
              "question_id": "string",
              "question_text": "string",
              "assumption": "string",
              "risk": "string"
            }
          ]
        }
        """;
}
