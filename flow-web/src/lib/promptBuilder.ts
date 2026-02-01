export interface StructuredContext {
  goals?: string
  nonGoals?: string
  /** Raw links text (one per line); used for context.links, not prompt */
  links?: string
  /** Raw notes text; used for context.notes, not prompt */
  notes?: string
  functionalReqs?: string
  nonFunctionalReqs?: string
  successMetrics?: string
  constraints?: string
  assumptions?: string
  currentSystem?: string
  dataClassification?: string[]
  authExpectations?: string
  securityNotes?: string
  observability?: string
  rollout?: string
  testExpectations?: string
  openQuestions?: string
}

function formatBullets(text: string): string {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  return lines.map((line) => (line.startsWith("-") ? line : `- ${line}`)).join("\n")
}

export function buildPrompt(userPrompt: string, context: StructuredContext): string {
  const parts: string[] = []
  if (userPrompt.trim()) {
    parts.push(userPrompt.trim())
  }

  const contextSections: string[] = []

  if (context.goals?.trim()) {
    contextSections.push(`Goals:\n${formatBullets(context.goals)}`)
  }
  if (context.nonGoals?.trim()) {
    contextSections.push(`Non-goals:\n${formatBullets(context.nonGoals)}`)
  }
  if (context.functionalReqs?.trim()) {
    contextSections.push(
      `Functional requirements:\n${formatBullets(context.functionalReqs)}`
    )
  }
  if (context.nonFunctionalReqs?.trim()) {
    contextSections.push(
      `Non-functional requirements:\n${formatBullets(context.nonFunctionalReqs)}`
    )
  }
  if (context.successMetrics?.trim()) {
    contextSections.push(
      `Success metrics:\n${formatBullets(context.successMetrics)}`
    )
  }
  if (context.constraints?.trim()) {
    contextSections.push(`Constraints:\n${formatBullets(context.constraints)}`)
  }
  if (context.assumptions?.trim()) {
    contextSections.push(`Assumptions:\n${formatBullets(context.assumptions)}`)
  }
  if (context.currentSystem?.trim()) {
    contextSections.push(`Current system:\n${context.currentSystem.trim()}`)
  }

  const dataParts: string[] = []
  if (context.dataClassification?.length) {
    dataParts.push(`Data classification: ${context.dataClassification.join(", ")}`)
  }
  if (context.authExpectations?.trim()) {
    dataParts.push(`AuthN/AuthZ: ${context.authExpectations.trim()}`)
  }
  if (context.securityNotes?.trim()) {
    dataParts.push(context.securityNotes.trim())
  }
  if (dataParts.length) {
    contextSections.push(`Data & security:\n${dataParts.join("\n")}`)
  }

  const opsParts: string[] = []
  if (context.observability?.trim()) {
    opsParts.push(`Observability: ${context.observability.trim()}`)
  }
  if (context.rollout?.trim()) {
    opsParts.push(`Rollout: ${context.rollout.trim()}`)
  }
  if (context.testExpectations?.trim()) {
    opsParts.push(`Testing: ${context.testExpectations.trim()}`)
  }
  if (opsParts.length) {
    contextSections.push(`Operations:\n${opsParts.join("\n")}`)
  }

  if (context.openQuestions?.trim()) {
    contextSections.push(
      `Open questions:\n${formatBullets(context.openQuestions)}`
    )
  }

  if (contextSections.length) {
    parts.push("--- Context Pack ---")
    parts.push(contextSections.join("\n\n"))
  }

  return parts.join("\n\n")
}
