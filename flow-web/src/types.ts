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

export interface RunMetadata {
  runId: string
  status: string
  createdAt: string
  updatedAt: string
  hasDesignDoc: boolean
  artifactPaths: ArtifactPathsDto
  blockingQuestions?: QuestionDto[] | null
  nonBlockingQuestions?: QuestionDto[] | null
}

export interface CreateRunRequest {
  title: string
  prompt: string
  context?: {
    links?: string[]
    notes?: string
  }
}

export interface SubmitAnswersRequest {
  answers: Record<string, string>
}
