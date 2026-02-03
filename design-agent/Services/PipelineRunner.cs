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
        string prompt,
        Action<JsonStageEvent>? onEvent = null)
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
            s => JsonHelper.TryDeserialize<ClarifierOutput>(s), onEvent);

        return new ClarifierResult(output, (output.Questions ?? []).Any(q => q.Blocking));
    }

    public static async Task<RunRemainingPipelineResult> RunRemainingPipelineAsync(
        string runPath,
        ClarifiedSpec clarifiedSpec,
        IReadOnlyDictionary<string, string>? answers = null,
        PipelineOptions? options = null,
        Action<JsonStageEvent>? onEvent = null)
    {
        options ??= new PipelineOptions();
        var opts = options with { Variants = options.VariantsClamped };

        using var traceWriter = (onEvent == null && opts.Trace) ? new TraceWriter(runPath) : null;
        void OnEventLocal(JsonStageEvent e)
        {
            if (onEvent != null) onEvent(e);
            else traceWriter?.Append(e);
        }

        var chatClient = AgentFactory.CreateChatClient();
        var runTools = RunScopedTools.CreateFunctions(runPath);
        var specJson = JsonSerializer.Serialize(clarifiedSpec, new JsonSerializerOptions { WriteIndented = false });
        var answersText = answers is { Count: > 0 }
            ? "\n\nUser-provided answers to blocking questions:\n" + string.Join("\n", answers.Select(kv => $"{kv.Key}: {kv.Value}"))
            : "";

        ProposedDesign? proposed = null;
        List<Question>? awaitingSynthQuestions = null;
        var specialists = opts.SynthSpecialists?.Where(SpecialistSynthesizerAgents.IsKnownSpecialist).ToList();
        if (specialists is { Count: > 0 })
        {
            var (design, awaiting) = await RunHybridSynthesisAsync(runPath, chatClient, runTools, specJson, answersText, specialists, opts.AllowAssumptions, OnEventLocal);
            proposed = design;
            awaitingSynthQuestions = awaiting;
        }
        else if (opts.VariantsClamped > 1)
        {
            proposed = await RunSynthesisWithVariantsAsync(runPath, chatClient, runTools, specJson, answersText, opts.VariantsClamped, OnEventLocal);
        }
        else
        {
            var synthAgent = AgentFactory.CreateSynthesizerAgent(chatClient, runTools);
            proposed = await JsonStageRunner.RunJsonStageWithRetryAsync(
                synthAgent,
                $"Clarified specification:\n{specJson}{answersText}\n\nProduce your ProposedDesign JSON.",
                runPath, "Synthesizer", "Synthesizer",
                s => JsonHelper.TryDeserialize<ProposedDesign>(s), OnEventLocal);
        }

        if (awaitingSynthQuestions != null)
            return new PipelineAwaitingSynthQuestions(awaitingSynthQuestions);

        if (proposed == null)
            throw new InvalidOperationException("Pipeline produced no design and no pending questions.");

        RunPersistence.SaveProposedDesign(runPath, proposed);
        var proposedJson = JsonSerializer.Serialize(proposed, new JsonSerializerOptions { WriteIndented = false });

        if (opts.RunConsistencyCheck)
        {
            var consistencyAgent = AgentFactory.CreateConsistencyCheckerAgent(chatClient, runTools);
            var report = await JsonStageRunner.RunJsonStageWithRetryAsync(
                consistencyAgent,
                $"Proposed design:\n{proposedJson}\n\nProduce your ConsistencyReport JSON.",
                runPath, "ConsistencyChecker", "ConsistencyChecker",
                s => JsonHelper.TryDeserialize<ConsistencyReport>(s), OnEventLocal);
            if (report != null)
                RunPersistence.SaveConsistencyReport(runPath, report);
        }

        Critique critique;
        if (opts.DeepCritique)
        {
            critique = await RunDeepCritiqueAsync(runPath, chatClient, runTools, proposedJson, OnEventLocal);
        }
        else
        {
            var challengeAgent = AgentFactory.CreateChallengerAgent(chatClient, runTools);
            critique = await JsonStageRunner.RunJsonStageWithRetryAsync(
                challengeAgent,
                $"Proposed design:\n{proposedJson}\n\nProduce your Critique JSON.",
                runPath, "Challenger", "Challenger",
                s => JsonHelper.TryDeserialize<Critique>(s), OnEventLocal);
        }

        RunPersistence.SaveCritique(runPath, critique);
        var critiqueJson = JsonSerializer.Serialize(critique, new JsonSerializerOptions { WriteIndented = false });

        var optimizeAgent = AgentFactory.CreateOptimizerAgent(chatClient, runTools);
        var optimized = await JsonStageRunner.RunJsonStageWithRetryAsync(
            optimizeAgent,
            $"Proposed design:\n{proposedJson}\n\nCritique:\n{critiqueJson}\n\nProduce your OptimizedDesign JSON.",
            runPath, "Optimizer", "Optimizer",
            s => JsonHelper.TryDeserialize<OptimizedDesign>(s), OnEventLocal);

        RunPersistence.SaveOptimizedDesign(runPath, optimized);
        var optimizedJson = JsonSerializer.Serialize(optimized, new JsonSerializerOptions { WriteIndented = false });

        List<string>? rawSections = null;
        try
        {
            var input = RunPersistence.LoadInput(runPath);
            rawSections = input.IncludedSections;
        }
        catch { /* backward compat: missing or malformed input.json -> null -> default minimal */ }
        var includedSections = SectionSelection.Normalize(rawSections);
        var includedSectionsJson = JsonSerializer.Serialize(includedSections, new JsonSerializerOptions { WriteIndented = false });
        var headingMapping = SectionSelection.BuildHeadingMappingText(includedSections);

        var publishAgent = AgentFactory.CreatePublisherAgent(chatClient, runTools);
        var synthQuestions = RunPersistence.LoadSynthQuestions(runPath);
        var synthAssumptions = RunPersistence.LoadSynthAssumptions(runPath);
        var openQuestionsBlock = synthQuestions is { Count: > 0 }
            ? "\n\nRemaining open questions (include in Open Questions section and in remaining_open_questions):\n" + JsonSerializer.Serialize(synthQuestions, new JsonSerializerOptions { WriteIndented = false })
            : "";
        var assumptionsBlock = synthAssumptions is { Count: > 0 }
            ? "\n\nAssumptions made when proceeding without answers (include in Open Questions or Assumptions):\n" + JsonSerializer.Serialize(synthAssumptions, new JsonSerializerOptions { WriteIndented = false })
            : "";
        var published = await JsonStageRunner.RunJsonStageWithRetryAsync(
            publishAgent,
            $"""
            Clarified spec: {specJson}
            Proposed design: {proposedJson}
            Critique: {critiqueJson}
            Optimized design: {optimizedJson}
            {openQuestionsBlock}
            {assumptionsBlock}

            included_sections: {includedSectionsJson}
            For each section ID, use this exact heading:
            {headingMapping}
            Output ONLY these sections in this order. If work_breakdown is not in included_sections, output issues: [] and pr_plan: []. Ensure remaining_open_questions includes any open questions and assumptions listed above.

            Produce your PublishedPackage JSON.
            """,
            runPath, "Publisher", "Publisher",
            s => JsonHelper.TryDeserialize<PublishedPackage>(s), OnEventLocal);

        if (!includedSections.Contains("work_breakdown", StringComparer.OrdinalIgnoreCase))
        {
            published = published with { Issues = [], PrPlan = [] };
        }
        published = published with { IncludedSections = includedSections.ToList() };

        RunPersistence.SavePublishedPackage(runPath, published);

        return new PipelineCompleted(proposed, critique, optimized, published, includedSections);
    }

    /// <summary>
    /// Builds assumptions from blocking questions and persists to artifacts/synth/assumptions.json.
    /// Returns the list of assumptions (or empty list on parse failure with deterministic fallback).
    /// </summary>
    public static async Task<List<AssumptionRecord>> RunAssumptionBuilderAsync(
        string runPath,
        List<Question> blockingQuestions,
        Action<JsonStageEvent>? onEvent = null)
    {
        if (blockingQuestions.Count == 0)
            return [];

        var chatClient = AgentFactory.CreateChatClient();
        var runTools = RunScopedTools.CreateFunctions(runPath);
        var questionsJson = JsonSerializer.Serialize(blockingQuestions, new JsonSerializerOptions { WriteIndented = false });
        var prompt = $"Blocking questions that could not be answered:\n{questionsJson}\n\nProduce your JSON with an \"assumptions\" array (question_id, question_text, assumption, risk) for each.";
        var agent = AgentFactory.CreateAssumptionBuilderAgent(chatClient, runTools);
        var output = await JsonStageRunner.RunJsonStageWithRetryAsync(
            agent,
            prompt,
            runPath, "AssumptionBuilder", "AssumptionBuilder",
            s => JsonHelper.TryDeserialize<AssumptionBuilderOutput>(s), onEvent);
        var assumptions = output?.Assumptions ?? [];
        if (assumptions.Count == 0)
        {
            assumptions = blockingQuestions.Select(q => new AssumptionRecord(q.Id, q.Text, "Assume TBD; design uses configurable defaults.", "Design may need revision when answer is known.")).ToList();
        }
        RunPersistence.SaveSynthAssumptions(runPath, assumptions);
        return assumptions;
    }

    private static async Task<(ProposedDesign? Design, List<Question>? AwaitingQuestions)> RunHybridSynthesisAsync(
        string runPath,
        IChatClient chatClient,
        IReadOnlyList<AIFunction> runTools,
        string specJson,
        string answersText,
        List<string> specialists,
        bool allowAssumptions,
        Action<JsonStageEvent>? onEvent = null)
    {
        RunPersistence.SaveSynthSelection(runPath, new SynthSelection(specialists, allowAssumptions));

        var promptPrefix = $"Clarified specification:\n{specJson}{answersText}\n\nProduce your SpecialistSynthOutput JSON.";
        var results = await Task.WhenAll(specialists.Select(async key =>
        {
            var output = await RunSpecialistStageAsync(runPath, chatClient, runTools, key, promptPrefix, onEvent);
            return (key, output);
        }));
        var specialistOutputs = results.ToDictionary(t => t.key, t => t.output);

        var specialistOutputsJson = JsonSerializer.Serialize(specialistOutputs, new JsonSerializerOptions { WriteIndented = false });
        var mergerPrompt = $"""
            Clarified specification:
            {specJson}
            {answersText}

            Specialist partial outputs (by key):
            {specialistOutputsJson}

            Merge these into a single proposed_design. Set missing_sections to the section keys that are still empty and need generic fill. Output MergerOutput JSON.
            """;

        var mergerAgent = AgentFactory.CreateMergerAgent(chatClient, runTools);
        var mergerOutput = await JsonStageRunner.RunJsonStageWithRetryAsync(
            mergerAgent,
            mergerPrompt,
            runPath, "Merger", "Merger",
            s => JsonHelper.TryDeserialize<MergerOutput>(s), onEvent);

        var merged = mergerOutput.ProposedDesign ?? new ProposedDesign(null, null, null, null, null, null, null);
        RunPersistence.SaveMergedPartial(runPath, mergerOutput);

        var allQuestions = new List<Question>();
        foreach (var o in specialistOutputs.Values)
            if (o.Questions is { Count: > 0 })
                allQuestions.AddRange(o.Questions);
        if (mergerOutput.Questions is { Count: > 0 })
            allQuestions.AddRange(mergerOutput.Questions);

        var hasBlocking = allQuestions.Any(q => q.Blocking);
        if (hasBlocking && !allowAssumptions)
        {
            RunPersistence.SaveSynthQuestions(runPath, allQuestions);
            return (null, allQuestions);
        }
        if (hasBlocking && allowAssumptions)
        {
            var blocking = allQuestions.Where(q => q.Blocking).ToList();
            await RunAssumptionBuilderAsync(runPath, blocking, onEvent);
        }

        var missingSections = mergerOutput.MissingSections ?? [];
        if (missingSections.Count > 0)
        {
            var fillPrompt = $"""
                Fill ONLY these sections: {string.Join(", ", missingSections)}. Do not modify any other sections.
                Partial design (merge this with your filled sections):
                {JsonSerializer.Serialize(merged, new JsonSerializerOptions { WriteIndented = false })}

                Produce your ProposedDesign JSON. Include all sections; for sections you are not filling, use the values from the partial design above.
                """;
            var fillAgent = AgentFactory.CreateSynthesizerAgent(chatClient, runTools);
            var filled = await JsonStageRunner.RunJsonStageWithRetryAsync(
                fillAgent,
                fillPrompt,
                runPath, "Synthesizer", "Synthesizer_Fill",
                s => JsonHelper.TryDeserialize<ProposedDesign>(s), onEvent);
            merged = MergeDesigns(merged, filled, missingSections);
        }

        return (merged, null);
    }

    private static ProposedDesign MergeDesigns(ProposedDesign baseDesign, ProposedDesign fillResult, List<string> sectionsToTakeFromFill)
    {
        var overview = sectionsToTakeFromFill.Contains("overview") ? (fillResult.Overview ?? baseDesign.Overview) : baseDesign.Overview;
        var architecture = sectionsToTakeFromFill.Contains("architecture") ? (fillResult.Architecture ?? baseDesign.Architecture) : baseDesign.Architecture;
        var apiContracts = sectionsToTakeFromFill.Contains("api_contracts") ? (fillResult.ApiContracts ?? baseDesign.ApiContracts) : baseDesign.ApiContracts;
        var dataModel = sectionsToTakeFromFill.Contains("data_model") ? (fillResult.DataModel ?? baseDesign.DataModel) : baseDesign.DataModel;
        var failureModes = sectionsToTakeFromFill.Contains("failure_modes") ? (fillResult.FailureModes ?? baseDesign.FailureModes) : baseDesign.FailureModes;
        var observability = sectionsToTakeFromFill.Contains("observability") ? (fillResult.Observability ?? baseDesign.Observability) : baseDesign.Observability;
        var security = sectionsToTakeFromFill.Contains("security") ? (fillResult.Security ?? baseDesign.Security) : baseDesign.Security;
        return new ProposedDesign(overview, architecture, apiContracts, dataModel, failureModes, observability, security);
    }

    private static async Task<SpecialistSynthOutput> RunSpecialistStageAsync(
        string runPath,
        IChatClient chatClient,
        IReadOnlyList<AIFunction> runTools,
        string specialistKey,
        string promptPrefix,
        Action<JsonStageEvent>? onEvent = null)
    {
        var agentName = $"Synth_{specialistKey}";
        onEvent?.Invoke(new JsonStageEvent("stage_start", "Synthesizer", agentName, null, null));
        var sw = System.Diagnostics.Stopwatch.StartNew();

        var agent = AgentFactory.CreateSpecialistSynthesizerAgent(chatClient, specialistKey, runTools);
        var response = await agent.RunAsync(promptPrefix);
        var text = response.Text ?? "";
        onEvent?.Invoke(new JsonStageEvent("model_call", "Synthesizer", agentName, null, sw.ElapsedMilliseconds));

        var result = JsonHelper.TryDeserialize<SpecialistSynthOutput>(text);
        if (result != null)
        {
            onEvent?.Invoke(new JsonStageEvent("stage_end", "Synthesizer", agentName, null, sw.ElapsedMilliseconds));
            RunPersistence.SaveSynthSpecialistOutput(runPath, specialistKey, result);
            return result;
        }

        onEvent?.Invoke(new JsonStageEvent("json_parse_failure", "Synthesizer", agentName, "First parse failed", null));
        RunPersistence.SaveSynthSpecialistRaw(runPath, specialistKey, text);
        var retryResponse = await agent.RunAsync($"{JsonStageRunner.JsonRetryPrompt}\n\nOriginal response:\n{text}");
        var retryText = retryResponse.Text ?? "";
        result = JsonHelper.TryDeserialize<SpecialistSynthOutput>(retryText);
        if (result == null)
        {
            onEvent?.Invoke(new JsonStageEvent("json_parse_failure", "Synthesizer", agentName, "Retry parse failed", null));
            RunPersistence.SaveSynthSpecialistRaw(runPath, specialistKey, retryText);
            throw new InvalidOperationException($"{agentName} produced invalid JSON after retry. Raw output saved to artifacts/synth/specialists/{specialistKey}.raw.txt");
        }
        onEvent?.Invoke(new JsonStageEvent("stage_end", "Synthesizer", agentName, null, sw.ElapsedMilliseconds));
        RunPersistence.SaveSynthSpecialistOutput(runPath, specialistKey, result);
        return result;
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
