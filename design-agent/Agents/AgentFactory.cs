using Azure;
using Azure.AI.Inference;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;

namespace design_agent.Agents;

public static class AgentFactory
{
    public static IChatClient CreateChatClient()
    {
        var token = Environment.GetEnvironmentVariable("GITHUB_TOKEN")
            ?? throw new InvalidOperationException("GITHUB_TOKEN is required.");

        var endpoint = Environment.GetEnvironmentVariable("GITHUB_MODELS_ENDPOINT")
            ?? "https://models.github.ai/inference";
        var model = Environment.GetEnvironmentVariable("GITHUB_MODELS_MODEL") ?? "openai/gpt-4.1";

        var client = new ChatCompletionsClient(
            new Uri(endpoint),
            new AzureKeyCredential(token));

        return client.AsIChatClient(model);
    }

    public static ChatClientAgent CreateClarifierAgent(IChatClient chatClient) => new(
        chatClient,
        instructions: ClarifierAgent.Instructions,
        name: "Clarifier");

    public static ChatClientAgent CreateSynthesizerAgent(IChatClient chatClient) => new(
        chatClient,
        instructions: SynthesizerAgent.Instructions,
        name: "Synthesizer");

    public static ChatClientAgent CreateChallengerAgent(IChatClient chatClient) => new(
        chatClient,
        instructions: ChallengerAgent.Instructions,
        name: "Challenger");

    public static ChatClientAgent CreateOptimizerAgent(IChatClient chatClient) => new(
        chatClient,
        instructions: OptimizerAgent.Instructions,
        name: "Optimizer");

    public static ChatClientAgent CreatePublisherAgent(IChatClient chatClient) => new(
        chatClient,
        instructions: PublisherAgent.Instructions,
        name: "Publisher");
}
