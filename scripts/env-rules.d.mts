// Type declarations for scripts/env-rules.mjs (ESM module)
export interface ValidationResult {
  name: string;
  status: "OK" | "MISSING" | "INVALID";
  reason?: string;
}

export interface ValidateAllResult {
  results: ValidationResult[];
  hasMissingRequired: boolean;
}

export declare const DEV_REQUIRED: ReadonlySet<string>;
export declare const PROD_REQUIRED: ReadonlySet<string>;
export declare const ALL_KNOWN: ReadonlySet<string>;

export declare function validateVar(
  name: string,
  value: string | undefined,
  mode: "dev" | "prod",
): ValidationResult;

export declare function validateAll(
  env: Record<string, string | undefined>,
  mode: "dev" | "prod",
): ValidateAllResult;

export declare function formatResults(results: ValidationResult[]): string;

export declare function isValidUrl(
  value: string,
  allowedProtocols: string[],
): boolean;
export declare function isPositiveNumber(value: string): boolean;
export declare function isSecretLongEnough(value: string): boolean;
export declare function isBooleanString(value: string): boolean;
