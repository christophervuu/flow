namespace design_agent.Models;

/// <summary>
/// Result of RunRemainingPipelineAsync: either completed with outputs or paused for synth questions.
/// </summary>
public abstract record RunRemainingPipelineResult;

public record PipelineCompleted(
    ProposedDesign Design,
    Critique Critique,
    OptimizedDesign Optimized,
    PublishedPackage Published) : RunRemainingPipelineResult;

public record PipelineAwaitingSynthQuestions(List<Question> Questions) : RunRemainingPipelineResult;
