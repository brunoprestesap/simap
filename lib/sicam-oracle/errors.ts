export class SicamOracleError extends Error {
  readonly oraCode: number | null;
  readonly cause: unknown;

  constructor(message: string, options: { oraCode?: number | null; cause?: unknown } = {}) {
    super(message);
    this.name = "SicamOracleError";
    this.oraCode = options.oraCode ?? null;
    this.cause = options.cause;
  }
}

const ORA_CODE_REGEX = /ORA-(\d{5})/;

export function extractOraCode(err: unknown): number | null {
  if (!err) return null;
  if (typeof err === "object" && err !== null) {
    const maybe = err as { errorNum?: unknown; message?: unknown };
    if (typeof maybe.errorNum === "number") return maybe.errorNum;
    if (typeof maybe.message === "string") {
      const m = maybe.message.match(ORA_CODE_REGEX);
      if (m) return Number(m[1]);
    }
  }
  if (typeof err === "string") {
    const m = err.match(ORA_CODE_REGEX);
    if (m) return Number(m[1]);
  }
  return null;
}

export function wrapSicamOracleError(message: string, cause: unknown): SicamOracleError {
  return new SicamOracleError(message, { oraCode: extractOraCode(cause), cause });
}
