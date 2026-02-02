using Azure;
using Azure.AI.Inference;
using Microsoft.Extensions.AI;

namespace AgentCore;

/// <summary>
/// Creates chat clients for GitHub Models (Azure AI Inference). Never persists or logs GITHUB_TOKEN.
/// </summary>
public static class ChatClientFactory
{
    public const string DefaultEndpoint = "https://models.github.ai/inference";
    public const string DefaultModel = "openai/gpt-4.1";

    /// <summary>
    /// Validates GITHUB_TOKEN and exits the process with code 1 if missing (for CLI use).
    /// </summary>
    public static void ValidateGitHubToken()
    {
        try
        {
            ValidateGitHubTokenOrThrow();
        }
        catch (InvalidOperationException ex)
        {
            Console.Error.WriteLine($"Error: {ex.Message}");
            Environment.Exit(1);
        }
    }

    /// <summary>
    /// Validates GITHUB_TOKEN and throws if missing (for API use; avoids Environment.Exit).
    /// Never persist or log the token.
    /// </summary>
    public static void ValidateGitHubTokenOrThrow()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("GITHUB_TOKEN")))
        {
            throw new InvalidOperationException(
                "GITHUB_TOKEN environment variable is required. Set it with a PAT that has GitHub Models (models: read) access.");
        }
    }

    /// <summary>
    /// Creates an IChatClient for GitHub Models. Requires GITHUB_TOKEN.
    /// Uses GITHUB_MODELS_ENDPOINT (default https://models.github.ai/inference) and GITHUB_MODELS_MODEL (default openai/gpt-4.1).
    /// </summary>
    public static IChatClient CreateChatClient()
    {
        var token = Environment.GetEnvironmentVariable("GITHUB_TOKEN")
            ?? throw new InvalidOperationException("GITHUB_TOKEN is required.");

        var endpoint = Environment.GetEnvironmentVariable("GITHUB_MODELS_ENDPOINT") ?? DefaultEndpoint;
        var model = Environment.GetEnvironmentVariable("GITHUB_MODELS_MODEL") ?? DefaultModel;

        var client = new ChatCompletionsClient(
            new Uri(endpoint),
            new AzureKeyCredential(token));

        return client.AsIChatClient(model);
    }
}
