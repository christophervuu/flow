using AgentCore;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;

namespace design_agent.Agents;

public static class AgentFactory
{
    public static IChatClient CreateChatClient() => ChatClientFactory.CreateChatClient();

    private static ChatClientAgent CreateAgent(IChatClient chatClient, string instructions, string name, IReadOnlyList<AIFunction>? tools = null)
    {
        if (tools is null or { Count: 0 })
            return new ChatClientAgent(chatClient, instructions: instructions, name: name);
        return new ChatClientAgent(chatClient, instructions: instructions, name: name, tools: tools.Cast<AITool>().ToList());
    }

    public static ChatClientAgent CreateClarifierAgent(IChatClient chatClient, IReadOnlyList<AIFunction>? tools = null) =>
        CreateAgent(chatClient, ClarifierAgent.Instructions, "Clarifier", tools);

    public static ChatClientAgent CreateSynthesizerAgent(IChatClient chatClient, IReadOnlyList<AIFunction>? tools = null) =>
        CreateAgent(chatClient, SynthesizerAgent.Instructions, "Synthesizer", tools);

    public static ChatClientAgent CreateChallengerAgent(IChatClient chatClient, IReadOnlyList<AIFunction>? tools = null) =>
        CreateAgent(chatClient, ChallengerAgent.Instructions, "Challenger", tools);

    public static ChatClientAgent CreateOptimizerAgent(IChatClient chatClient, IReadOnlyList<AIFunction>? tools = null) =>
        CreateAgent(chatClient, OptimizerAgent.Instructions, "Optimizer", tools);

    public static ChatClientAgent CreatePublisherAgent(IChatClient chatClient, IReadOnlyList<AIFunction>? tools = null) =>
        CreateAgent(chatClient, PublisherAgent.Instructions, "Publisher", tools);

    public static ChatClientAgent CreateDesignJudgeAgent(IChatClient chatClient, IReadOnlyList<AIFunction>? tools = null) =>
        CreateAgent(chatClient, DesignJudgeAgent.Instructions, "DesignJudge", tools);

    public static ChatClientAgent CreateCritiqueJudgeAgent(IChatClient chatClient, IReadOnlyList<AIFunction>? tools = null) =>
        CreateAgent(chatClient, CritiqueJudgeAgent.Instructions, "CritiqueJudge", tools);

    public static ChatClientAgent CreateChallengerPersonaAgent(IChatClient chatClient, string personaName, string instructions, IReadOnlyList<AIFunction>? tools = null) =>
        CreateAgent(chatClient, instructions, $"Challenger_{personaName}", tools);
}
