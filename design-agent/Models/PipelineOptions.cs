namespace design_agent.Models;

/// <summary>
/// Opt-in orchestration options. Defaults preserve current single-path behavior.
/// </summary>
public record PipelineOptions(
    bool DeepCritique = false,
    int Variants = 1,
    bool Trace = false)
{
    public const int MinVariants = 1;
    public const int MaxVariants = 5;

    public int VariantsClamped => Math.Clamp(Variants, MinVariants, MaxVariants);
}
