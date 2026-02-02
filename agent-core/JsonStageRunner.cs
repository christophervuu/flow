using Azure;
using Microsoft.Agents.AI;

namespace AgentCore;

/// <summary>
/// Optional event for stage runs (no secrets or full prompt/response).
/// </summary>
public record JsonStageEvent(string Kind, string? StageName, string? AgentName, string? Message, long? DurationMs);

/// <summary>
/// Runs a JSON-producing stage with one retry on parse failure; persists raw output on failure; never logs secrets.
/// </summary>
public static class JsonStageRunner
{
    public const string JsonRetryPrompt = "Your previous response was not valid JSON. You must output valid JSON matching the schema.";

    /// <summary>
    /// Calls the agent, parses JSON with the given deserializer. On first parse failure: persists raw to artifacts/{agentName}.raw.txt, retries once. On final failure: persists raw, writes to stderr, throws.
    /// </summary>
    public static async Task<T> RunJsonStageWithRetryAsync<T>(
        ChatClientAgent agent,
        string prompt,
        string runPath,
        string stageName,
        string agentName,
        Func<string, T?> deserializer,
        Action<JsonStageEvent>? onEvent = null) where T : class
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        onEvent?.Invoke(new JsonStageEvent("stage_start", stageName, agentName, null, null));

        try
        {
            var response = await agent.RunAsync(prompt);
            var text = response.Text ?? "";
            onEvent?.Invoke(new JsonStageEvent("model_call", stageName, agentName, null, sw.ElapsedMilliseconds));

            var result = deserializer(text);
            if (result != null)
            {
                onEvent?.Invoke(new JsonStageEvent("stage_end", stageName, agentName, null, sw.ElapsedMilliseconds));
                return result;
            }

            onEvent?.Invoke(new JsonStageEvent("json_parse_failure", stageName, agentName, "First parse failed", null));
            RunPersistence.SaveArtifactText(runPath, $"{agentName}.raw.txt", text);
            onEvent?.Invoke(new JsonStageEvent("retry_used", stageName, agentName, null, null));

            var retryResponse = await agent.RunAsync($"{JsonRetryPrompt}\n\nOriginal response:\n{text}");
            var retryText = retryResponse.Text ?? "";
            result = deserializer(retryText);

            if (result == null)
            {
                onEvent?.Invoke(new JsonStageEvent("json_parse_failure", stageName, agentName, "Retry parse failed", null));
                RunPersistence.SaveArtifactText(runPath, $"{agentName}.raw.txt", retryText);
                var message = $"{agentName} produced invalid JSON after retry. Raw output saved to artifacts/{agentName}.raw.txt";
                Console.Error.WriteLine($"Error: {message}");
                throw new InvalidOperationException(message);
            }

            onEvent?.Invoke(new JsonStageEvent("stage_end", stageName, agentName, null, sw.ElapsedMilliseconds));
            return result;
        }
        catch (RequestFailedException ex)
        {
            Console.Error.WriteLine($"Error: Model call failed. Status: {ex.Status}, Message: {ex.Message}");
            if (!string.IsNullOrEmpty(ex.ErrorCode))
                Console.Error.WriteLine($"Error code: {ex.ErrorCode}");
            throw;
        }
    }
}
