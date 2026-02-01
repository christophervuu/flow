using design_agent.Models;

namespace design_agent.Services;

/// <summary>
/// Builds a ClarifiedSpec from a draft and user answers (open_questions = non-blocking union answered blocking).
/// </summary>
public static class ClarifiedSpecHelper
{
    public static ClarifiedSpec CreateFromDraft(
        ClarifiedSpecDraft draft,
        IReadOnlyDictionary<string, string> answers)
    {
        var openQuestions = (draft.OpenQuestions ?? [])
            .Where(q => !q.Blocking || answers.ContainsKey(q.Id))
            .ToList();
        return new ClarifiedSpec(
            draft.Title ?? "",
            draft.ProblemStatement ?? "",
            draft.Goals ?? [],
            draft.NonGoals ?? [],
            draft.Assumptions ?? [],
            draft.Constraints ?? [],
            draft.Requirements ?? new RequirementsSpec([], []),
            draft.SuccessMetrics ?? [],
            openQuestions);
    }
}
