using System.Threading.Channels;
using AgentCore;
using design_agent.Models;
using design_agent.Services;
using Microsoft.Extensions.Hosting;
using RunPersistence = design_agent.Services.RunPersistence;

namespace flow_api.Services;

public sealed record PipelineWorkItem
{
    public string RunPath { get; init; } = "";
    public string RunId { get; init; } = "";

    /// <summary>RunClarifier: run Clarifier then optionally remaining pipeline.</summary>
    public bool IsRunClarifier { get; init; }
    public bool AllowAssumptions { get; init; }
    public List<string>? SynthSpecialists { get; init; }

    /// <summary>RunRemainingPipeline: after answers submitted.</summary>
    public IReadOnlyDictionary<string, string>? Answers { get; init; }
}

public interface IBackgroundPipelineQueue
{
    ValueTask EnqueueAsync(PipelineWorkItem item, CancellationToken cancellationToken = default);
}

public sealed class BackgroundPipelineQueue : IBackgroundPipelineQueue
{
    private readonly Channel<PipelineWorkItem> _channel = Channel.CreateUnbounded<PipelineWorkItem>(new UnboundedChannelOptions { SingleReader = true });

    public ChannelReader<PipelineWorkItem> Reader => _channel.Reader;

    public ValueTask EnqueueAsync(PipelineWorkItem item, CancellationToken cancellationToken = default) =>
        _channel.Writer.WriteAsync(item, cancellationToken);
}

public sealed class BackgroundPipelineService : BackgroundService
{
    private readonly IBackgroundPipelineQueue _queue;

    public BackgroundPipelineService(IBackgroundPipelineQueue queue)
    {
        _queue = queue;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var queue = (BackgroundPipelineQueue)_queue;
        await foreach (var item in queue.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                if (item.IsRunClarifier)
                    await RunClarifierJobAsync(item, stoppingToken);
                else
                    await RunRemainingPipelineJobAsync(item, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                SetRunFailed(item.RunPath, item.RunId, ex);
            }
        }
    }

    private async Task RunClarifierJobAsync(PipelineWorkItem item, CancellationToken cancellationToken)
    {
        using var traceWriter = new TraceWriter(item.RunPath);
        void OnEvent(JsonStageEvent e) => traceWriter.Append(e);

        var state = RunPersistence.LoadState(item.RunPath);
        var input = RunPersistence.LoadInput(item.RunPath);
        state = state with { Status = "Running", UpdatedAt = DateTime.UtcNow.ToString("O") };
        RunPersistence.SaveState(item.RunPath, state);

        var result = await PipelineRunner.RunClarifierAsync(item.RunPath, input.Title, input.Prompt, OnEvent);
        RunPersistence.SaveClarifier(item.RunPath, result.Output);

        if (result.HasBlockingQuestions && !item.AllowAssumptions)
        {
            state = RunPersistence.LoadState(item.RunPath);
            state = state with { Status = "AwaitingClarifications", UpdatedAt = DateTime.UtcNow.ToString("O") };
            RunPersistence.SaveState(item.RunPath, state);
            return;
        }

        if (result.HasBlockingQuestions && item.AllowAssumptions)
        {
            var (blocking, _) = GetQuestionsFromClarifier(result.Output);
            await PipelineRunner.RunAssumptionBuilderAsync(item.RunPath, blocking, OnEvent);
        }

        var draft = result.Output.ClarifiedSpecDraft
            ?? throw new InvalidOperationException("Clarifier produced no clarified_spec_draft.");
        var clarifiedSpec = ClarifiedSpecHelper.CreateFromDraft(draft, new Dictionary<string, string>());
        RunPersistence.SaveClarifiedSpec(item.RunPath, clarifiedSpec);

        var options = new PipelineOptions(SynthSpecialists: item.SynthSpecialists, AllowAssumptions: item.AllowAssumptions);
        await RunRemainingPipelineInternalAsync(item.RunPath, item.RunId, clarifiedSpec, null, options, traceWriter, cancellationToken);
    }

    private async Task RunRemainingPipelineJobAsync(PipelineWorkItem item, CancellationToken cancellationToken)
    {
        var state = RunPersistence.LoadState(item.RunPath);
        state = state with { Status = "Running", UpdatedAt = DateTime.UtcNow.ToString("O") };
        RunPersistence.SaveState(item.RunPath, state);

        var clarifiedSpec = RunPersistence.LoadClarifiedSpec(item.RunPath);
        var selection = RunPersistence.LoadSynthSelection(item.RunPath);
        var allowAssumptions = selection?.AllowAssumptions ?? false;
        var synthSpecialists = selection?.SynthSpecialists;
        var options = new PipelineOptions(SynthSpecialists: synthSpecialists, AllowAssumptions: allowAssumptions);

        using var traceWriter = new TraceWriter(item.RunPath);
        await RunRemainingPipelineInternalAsync(item.RunPath, item.RunId, clarifiedSpec, item.Answers, options, traceWriter, cancellationToken);
    }

    private async Task RunRemainingPipelineInternalAsync(
        string runPath,
        string runId,
        ClarifiedSpec clarifiedSpec,
        IReadOnlyDictionary<string, string>? answers,
        PipelineOptions options,
        TraceWriter traceWriter,
        CancellationToken cancellationToken)
    {
        try
        {
            void OnEvent(JsonStageEvent e) => traceWriter.Append(e);
            var pipelineResult = await PipelineRunner.RunRemainingPipelineAsync(runPath, clarifiedSpec, answers, options, OnEvent);
            var state = RunPersistence.LoadState(runPath);

            if (pipelineResult is PipelineAwaitingSynthQuestions awaiting)
            {
                state = state with { Status = "AwaitingClarifications", UpdatedAt = DateTime.UtcNow.ToString("O") };
                RunPersistence.SaveState(runPath, state);
                return;
            }

            state = state with { Status = "Completed", UpdatedAt = DateTime.UtcNow.ToString("O") };
            RunPersistence.SaveState(runPath, state);
        }
        catch (Exception)
        {
            SetRunFailed(runPath, runId, null);
            throw;
        }
    }

    private static void SetRunFailed(string runPath, string runId, Exception? ex)
    {
        try
        {
            var state = RunPersistence.LoadState(runPath);
            state = state with { Status = "Failed", UpdatedAt = DateTime.UtcNow.ToString("O") };
            RunPersistence.SaveState(runPath, state);
        }
        catch { /* best effort */ }
    }

    private static (List<Question> Blocking, List<Question> NonBlocking) GetQuestionsFromClarifier(ClarifierOutput? clarifier)
    {
        var questions = clarifier?.Questions ?? [];
        return (
            questions.Where(q => q.Blocking).ToList(),
            questions.Where(q => !q.Blocking).ToList());
    }
}
