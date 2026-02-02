export interface QuestionDto {
  id: string
  text: string
  blocking: boolean
}

export interface RunEnvelope {
  runId: string
  status: string
  runPath: string
  blockingQuestions: QuestionDto[]
  nonBlockingQuestions: QuestionDto[]
  designDocMarkdown: string | null
}

export interface ArtifactPathsDto {
  state: string
  input: string
  clarifier: string
  clarifiedSpec: string
  publishedPackage: string
  designDoc: string
}

export interface ProgressDto {
  current: number
  total: number
}

export interface ExecutionStatusDto {
  runId: string
  status: string
  currentStage: string
  currentAgent: string | null
  completedAgents: string[]
  activeAgents: string[]
  pendingAgents: string[]
  progress: ProgressDto
}

export interface TraceEvent {
  timestamp: string
  kind: string
  stageName: string | null
  agentName: string | null
  message: string | null
  durationMs: number | null
}

export interface RunMetadata {
  runId: string
  status: string
  createdAt: string
  updatedAt: string
  hasDesignDoc: boolean
  artifactPaths: ArtifactPathsDto
  blockingQuestions?: QuestionDto[] | null
  nonBlockingQuestions?: QuestionDto[] | null
  remainingOpenQuestionsCount?: number | null
  assumptionsCount?: number | null
  executionStatus?: ExecutionStatusDto | null
}

export interface CreateRunRequest {
  title: string
  prompt: string
  context?: {
    links?: string[]
    notes?: string
  }
  synthSpecialists?: string[] | null
  allowAssumptions?: boolean
}

export interface SubmitAnswersRequest {
  answers: Record<string, string>
  allowAssumptions?: boolean
  synthSpecialists?: string | string[] | null
}
