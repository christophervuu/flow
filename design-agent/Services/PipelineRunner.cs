using System.Text.Json;
using AgentCore;
using design_agent.Agents;
using design_agent.Models;
using Microsoft.Extensions.AI;

namespace design_agent.Services;

public static class PipelineRunner
{
    public static async Task<ClarifierResult> RunClarifierAsync(
        string runPath,
        string title,
        string prompt)
    {
        var chatClient = AgentFactory.CreateChatClient();
        var runTools = RunScopedTools.CreateFunctions(runPath);
        var agent = AgentFactory.CreateClarifierAgent(chatClient, runTools);

        var fullPrompt = $"""
            Title: {title}
            
            Initial prompt from the user:
            {prompt}
            
            Analyze this and produce your ClarifierOutput JSON.
            """;

        var output = await JsonStageRunner.RunJsonStageWithRetryAsync(
            agent, fullPrompt, runPath, "Clarifier", "Clarifier",
            s => JsonHelper.TryDeserialize<ClarifierOutput>(s));

        return new ClarifierResult(output, (output.Questions ?? []).Any(q => q.Blocking));
    }

    public static async Task<(ProposedDesign Design, Critique Critique, OptimizedDesign Optimized, PublishedPackage Published)> RunRemainingPipelineAsync(
        string runPath,
        ClarifiedSpec clarifiedSpec,
        IReadOnlyDictionary<string, string>? answers = null,
        PipelineOptions? options = null)
    {
        options ??= new PipelineOptions();
        var opts = options with { Variants = options.VariantsClamped };

        using var traceWriter = opts.Trace ? new TraceWriter(runPath) : null;
        void OnEvent(JsonStageEvent e) => traceWriter?.Append(e);

        var chatClient = AgentFactory.CreateChatClient();
        var runTools = RunScopedTools.CreateFunctions(runPath);
        var specJson = JsonSerializer.Serialize(clarifiedSpec, new JsonSerializerOptions { WriteIndented = false });
        var answersText = answers is { Count: > 0 }
            ? "\n\nUser-provided answers to blocking questions:\n" + string.Join("\n", answers.Select(kv => $"{kv.Key}: {kv.Value}"))
            : "";

        ProposedDesign proposed;
        if (opts.VariantsClamped > 1)
        {
            proposed = await RunSynthesisWithVariantsAsync(runPath, chatClient, runTools, specJson, answersText, opts.VariantsClamped, OnEvent);
        }
        else
        {
            var synthAgent = AgentFactory.CreateSynthesizerAgent(chatClient, runTools);
            proposed = await JsonStageRunner.RunJsonStageWithRetryAsync(
                synthAgent,
                $"Clarified specification:\n{specJson}{answersText}\n\nProduce your ProposedDesign JSON.",
                runPath, "Synthesizer", "Synthesizer",
                s => JsonHelper.TryDeserialize<ProposedDesign>(s), OnEvent);
        }

        RunPersistence.SaveProposedDesign(runPath, proposed);
        var proposedJson = JsonSerializer.Serialize(proposed, new JsonSerializerOptions { WriteIndented = false });

        Critique critique;
        if (opts.DeepCritique)
        {
            critique = await RunDeepCritiqueAsync(runPath, chatClient, runTools, proposedJson, OnEvent);
        }
        else
        {
            var challengeAgent = AgentFactory.CreateChallengerAgent(chatClient, runTools);
            critique = await JsonStageRunner.RunJsonStageWithRetryAsync(
                challengeAgent,
                $"Proposed design:\n{proposedJson}\n\nProduce your Critique JSON.",
                runPath, "Challenger", "Challenger",
                s => JsonHelper.TryDeserialize<Critique>(s), OnEvent);
        }

        RunPersistence.SaveCritique(runPath, critique);
        var critiqueJson = JsonSerializer.Serialize(critique, new JsonSerializerOptions { WriteIndented = false });

        var optimizeAgent = AgentFactory.CreateOptimizerAgent(chatClient, runTools);
        var optimized = await JsonStageRunner.RunJsonStageWithRetryAsync(
            optimizeAgent,
            $"Proposed design:\n{proposedJson}\n\nCritique:\n{critiqueJson}\n\nProduce your OptimizedDesign JSON.",
            runPath, "Optimizer", "Optimizer",
            s => JsonHelper.TryDeserialize<OptimizedDesign>(s), OnEvent);

        RunPersistence.SaveOptimizedDesign(runPath, optimized);
        var optimizedJson = JsonSerializer.Serialize(optimized, new JsonSerializerOptions { WriteIndented = false });

        var publishAgent = AgentFactory.CreatePublisherAgent(chatClient, runTools);
        var published = await JsonStageRunner.RunJsonStageWithRetryAsync(
            publishAgent,
            $"""
            Clarified spec: {specJson}
            Proposed design: {proposedJson}
            Critique: {critiqueJson}
            Optimized design: {optimizedJson}
            
            Produce your PublishedPackage JSON with a complete design_doc_markdown following the 15-section template.
            """,
            runPath, "Publisher", "Publisher",
            s => JsonHelper.TryDeserialize<PublishedPackage>(s), OnEvent);

        RunPersistence.SavePublishedPackage(runPath, published);

        return (proposed, critique, optimized, published);
    }

    private static async Task<ProposedDesign> RunSynthesisWithVariantsAsync(
        string runPath,
        Microsoft.Extensions.AI.IChatClient chatClient,
        IReadOnlyList<AIFunction> runTools,
        string specJson,
        string answersText,
        int variantCount,
        Action<JsonStageEvent>? onEvent = null)
    {
        var basePrompt = $"Clarified specification:\n{specJson}{answersText}\n\nProduce your ProposedDesign JSON.";
        var variants = new List<ProposedDesign>();

        for (var i = 1; i <= variantCount; i++)
        {
            var suffix = SynthesizerAgent.GetVariantSuffix(i);
            var agent = AgentFactory.CreateSynthesizerAgent(chatClient, runTools);
            var design = await JsonStageRunner.RunJsonStageWithRetryAsync(
                agent,
                basePrompt + suffix,
                runPath, "Synthesizer", $"Synthesizer_Variant{i}",
                s => JsonHelper.TryDeserialize<ProposedDesign>(s), onEvent);
            variants.Add(design);
            AgentCore.RunPersistence.SaveArtifactJson(runPath, $"synthesis.variant{i}.json", design);
        }

        var judgeAgent = AgentFactory.CreateDesignJudgeAgent(chatClient, runTools);
        var variantsJson = JsonSerializer.Serialize(variants, new JsonSerializerOptions { WriteIndented = false });
        var judgePrompt = $"ProposedDesign variants (pick or merge into one):\n{variantsJson}\n\nOutput a single ProposedDesign JSON.";
        var chosen = await JsonStageRunner.RunJsonStageWithRetryAsync(
            judgeAgent,
            judgePrompt,
            runPath, "DesignJudge", "DesignJudge",
            s => JsonHelper.TryDeserialize<ProposedDesign>(s), onEvent);
        AgentCore.RunPersistence.SaveArtifactJson(runPath, "synthesis.judge.json", chosen);
        return chosen;
    }

    private static async Task<Critique> RunDeepCritiqueAsync(
        string runPath,
        Microsoft.Extensions.AI.IChatClient chatClient,
        IReadOnlyList<AIFunction> runTools,
        string proposedJson,
        Action<JsonStageEvent>? onEvent = null)
    {
        var personas = new[] { ("security", ChallengerPersonas.Security), ("operations", ChallengerPersonas.Operations), ("cost", ChallengerPersonas.Cost), ("edgecases", ChallengerPersonas.EdgeCases) };
        var critiques = new List<Critique>();

        foreach (var (name, instructions) in personas)
        {
            var agent = AgentFactory.CreateChallengerPersonaAgent(chatClient, name, instructions, runTools);
            var c = await JsonStageRunner.RunJsonStageWithRetryAsync(
                agent,
                $"Proposed design:\n{proposedJson}\n\nProduce your Critique JSON.",
                runPath, $"Challenger_{name}", $"Challenger_{name}",
                s => JsonHelper.TryDeserialize<Critique>(s), onEvent);
            critiques.Add(c);
            AgentCore.RunPersistence.SaveArtifactJson(runPath, $"critique.{name}.json", c);
        }

        var judgeAgent = AgentFactory.CreateCritiqueJudgeAgent(chatClient, runTools);
        var critiquesJson = JsonSerializer.Serialize(critiques, new JsonSerializerOptions { WriteIndented = false });
        var judgePrompt = $"Critique perspectives (Security, Operations, Cost, Edge Cases):\n{critiquesJson}\n\nMerge into a single Critique JSON.";
        var merged = await JsonStageRunner.RunJsonStageWithRetryAsync(
            judgeAgent,
            judgePrompt,
            runPath, "CritiqueJudge", "CritiqueJudge",
            s => JsonHelper.TryDeserialize<Critique>(s), onEvent);
        AgentCore.RunPersistence.SaveArtifactJson(runPath, "critique.judge.json", merged);
        return merged;
    }
}

public record ClarifierResult(ClarifierOutput Output, bool HasBlockingQuestions);
