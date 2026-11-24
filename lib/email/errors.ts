export class EmailSendError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryable = false,
    public readonly uncertain = false,
  ) {
    super(code);
  }
}
