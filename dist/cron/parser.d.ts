/**
 * Validate a cron expression
 */
export declare function validateCron(expression: string): {
    valid: boolean;
    error?: string;
};
/**
 * Get the next N run times for a cron expression
 */
export declare function getNextRuns(expression: string, count?: number, timezone?: string): Date[];
/**
 * Get the next run time for a cron expression
 */
export declare function getNextRun(expression: string, timezone?: string): Date | null;
/**
 * Common cron presets with human-readable names
 */
export declare const CRON_PRESETS: Record<string, {
    expression: string;
    description: string;
}>;
/**
 * Try to parse natural language into a cron expression
 * Returns undefined if parsing fails
 */
export declare function naturalLanguageToCron(input: string): string | undefined;
//# sourceMappingURL=parser.d.ts.map