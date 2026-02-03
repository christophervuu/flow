/**
 * Design doc section options. Canonical IDs must match backend SectionSelection.AllSectionIds.
 */

export const SECTION_OPTIONS: { id: string; label: string }[] = [
  { id: "title", label: "Title" },
  { id: "problem_statement", label: "Problem Statement" },
  { id: "goals_non_goals", label: "Goals / Non-goals" },
  { id: "requirements", label: "Requirements" },
  { id: "proposed_design", label: "Proposed Design" },
  { id: "api_contracts", label: "API Contracts" },
  { id: "data_model", label: "Data Model" },
  { id: "failure_modes_mitigations", label: "Failure Modes & Mitigations" },
  { id: "observability", label: "Observability" },
  { id: "security_privacy", label: "Security & Privacy" },
  { id: "rollout_plan", label: "Rollout Plan" },
  { id: "test_plan", label: "Test Plan" },
  { id: "alternatives_considered", label: "Alternatives Considered" },
  { id: "open_questions", label: "Open Questions" },
  { id: "work_breakdown", label: "Work Breakdown (Issues + PR plan)" },
]

export const DEFAULT_MINIMAL_SECTIONS = [
  "title",
  "problem_statement",
  "goals_non_goals",
  "requirements",
  "proposed_design",
] as const

export const ALL_SECTION_IDS = SECTION_OPTIONS.map((s) => s.id)
