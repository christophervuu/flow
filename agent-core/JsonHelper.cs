using System.Text.Json;
using System.Text.RegularExpressions;

namespace AgentCore;

/// <summary>
/// JSON parsing with tolerant behavior: extracts from ```json ... ``` fences, case-insensitive, trailing commas.
/// </summary>
public static class JsonHelper
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        AllowTrailingCommas = true
    };

    /// <summary>
    /// Extracts JSON from text that might be wrapped in markdown code blocks (```json ... ```).
    /// </summary>
    public static string ExtractJson(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return text;

        var trimmed = text.Trim();

        // Match ```json ... ``` or ``` ... ```
        var match = Regex.Match(trimmed, @"^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```\s*$", RegexOptions.Multiline);
        if (match.Success)
            return match.Groups[1].Value.Trim();

        return trimmed;
    }

    public static T? TryDeserialize<T>(string json) where T : class
    {
        var extracted = ExtractJson(json);
        try
        {
            return JsonSerializer.Deserialize<T>(extracted, Options);
        }
        catch
        {
            return null;
        }
    }
}
