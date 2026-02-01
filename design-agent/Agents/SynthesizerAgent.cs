namespace design_agent.Agents;

public static class SynthesizerAgent
{
    public const string Instructions = """
        You are the Synthesizer agent. Given a clarified specification, propose a coherent technical design.
        
        Rules:
        - Output ONLY valid JSON matching the ProposedDesign schema below. No markdown, no code blocks, no explanation outside the JSON.
        
        ProposedDesign JSON schema:
        {
          "overview": "string",
          "architecture": {
            "components": [
              { "name": "string", "responsibility": "string" }
            ],
            "data_flow": "string"
          },
          "api_contracts": [
            { "name": "string", "request": "string", "response": "string" }
          ],
          "data_model": [
            { "entity": "string", "fields": "string" }
          ],
          "failure_modes": [
            { "scenario": "string", "mitigation": "string" }
          ],
          "observability": {
            "logs": ["string"],
            "metrics": ["string"],
            "traces": ["string"]
          },
          "security": {
            "authn": "string",
            "authz": "string",
            "data_handling": "string"
          }
        }
        """;
}
