using System.Text.Json;
using Azure;
using design_agent.Agents;
using design_agent.Models;

namespace design_agent.Services;

public static class PipelineRunner
{
    private const string JsonRetryPrompt = "Your previous response was not valid JSON. You must output valid JSON matching the schema.";

    public static async Task<ClarifierResult> RunClarifierAsync(
        string runPath,
        string title,
        string prompt)
    {
        var chatClient = AgentFactory.CreateChatClient();
        var agent = AgentFactory.CreateClarifierAgent(chatClient);

        var fullPrompt = $"""
            Title: {title}
            
            Initial prompt from the user:
            {prompt}
            
            Analyze this and produce your ClarifierOutput JSON.
            """;

        var output = await RunAgentWithRetryAsync(
            agent, fullPrompt, runPath, "Clarifier",
            s => JsonHelper.TryDeserialize<ClarifierOutput>(s));

        return new ClarifierResult(output!, (output?.Questions ?? []).Any(q => q.Blocking));
    }

    public static async Task<(ProposedDesign Design, Critique Critique, OptimizedDesign Optimized, PublishedPackage Published)> RunRemainingPipelineAsync(
        string runPath,
        ClarifiedSpec clarifiedSpec,
        IReadOnlyDictionary<string, string>? answers = null)
    {
        var chatClient = AgentFactory.CreateChatClient();
        var synthAgent = AgentFactory.CreateSynthesizerAgent(chatClient);
        var challengeAgent = AgentFactory.CreateChallengerAgent(chatClient);
        var optimizeAgent = AgentFactory.CreateOptimizerAgent(chatClient);
        var publishAgent = AgentFactory.CreatePublisherAgent(chatClient);

        var specJson = JsonSerializer.Serialize(clarifiedSpec, new JsonSerializerOptions { WriteIndented = false });
        var answersText = answers is { Count: > 0 }
            ? "\n\nUser-provided answers to blocking questions:\n" + string.Join("\n", answers.Select(kv => $"{kv.Key}: {kv.Value}"))
            : "";

        var proposed = await RunAgentWithRetryAsync(
            synthAgent,
            $"Clarified specification:\n{specJson}{answersText}\n\nProduce your ProposedDesign JSON.",
            runPath, "Synthesizer",
            s => JsonHelper.TryDeserialize<ProposedDesign>(s))!;

        RunPersistence.SaveProposedDesign(runPath, proposed);

        var proposedJson = JsonSerializer.Serialize(proposed, new JsonSerializerOptions { WriteIndented = false });
        var critique = await RunAgentWithRetryAsync(
            challengeAgent,
            $"Proposed design:\n{proposedJson}\n\nProduce your Critique JSON.",
            runPath, "Challenger",
            s => JsonHelper.TryDeserialize<Critique>(s))!;

        RunPersistence.SaveCritique(runPath, critique);

        var critiqueJson = JsonSerializer.Serialize(critique, new JsonSerializerOptions { WriteIndented = false });
        var optimized = await RunAgentWithRetryAsync(
            optimizeAgent,
            $"Proposed design:\n{proposedJson}\n\nCritique:\n{critiqueJson}\n\nProduce your OptimizedDesign JSON.",
            runPath, "Optimizer",
            s => JsonHelper.TryDeserialize<OptimizedDesign>(s))!;

        RunPersistence.SaveOptimizedDesign(runPath, optimized);

        var optimizedJson = JsonSerializer.Serialize(optimized, new JsonSerializerOptions { WriteIndented = false });
        var published = await RunAgentWithRetryAsync(
            publishAgent,
            $"""
            Clarified spec: {specJson}
            Proposed design: {proposedJson}
            Critique: {critiqueJson}
            Optimized design: {optimizedJson}
            
            Produce your PublishedPackage JSON with a complete design_doc_markdown following the 15-section template.
            """,
            runPath, "Publisher",
            s => JsonHelper.TryDeserialize<PublishedPackage>(s))!;

        RunPersistence.SavePublishedPackage(runPath, published);

        return (proposed, critique, optimized, published);
    }

    private static async Task<T> RunAgentWithRetryAsync<T>(
        Microsoft.Agents.AI.ChatClientAgent agent,
        string prompt,
        string runPath,
        string agentName,
        Func<string, T?> deserializer) where T : class
    {
        try
        {
            var response = await agent.RunAsync(prompt);
            var text = response.Text ?? "";

            var result = deserializer(text);
            if (result != null)
                return result;

            var retryResponse = await agent.RunAsync($"{JsonRetryPrompt}\n\nOriginal response:\n{text}");
            var retryText = retryResponse.Text ?? "";
            result = deserializer(retryText);

            if (result == null)
            {
                RunPersistence.SaveRawAgentOutput(runPath, agentName, retryText);
                Console.Error.WriteLine($"Error: {agentName} produced invalid JSON after retry. Raw output saved to artifacts/{agentName}.raw.txt");
                Environment.Exit(1);
            }

            return result!;
        }
        catch (RequestFailedException ex)
        {
            Console.Error.WriteLine($"Error: Model call failed. Status: {ex.Status}, Message: {ex.Message}");
            if (!string.IsNullOrEmpty(ex.ErrorCode))
                Console.Error.WriteLine($"Error code: {ex.ErrorCode}");
            Environment.Exit(1);
            throw;
        }
    }
}

public record ClarifierResult(ClarifierOutput Output, bool HasBlockingQuestions);
