/**
 * Sequence Generation Utilities
 * Format and generate sequence numbers (work order, tech ID, PO)
 */

export interface SequenceConfig {
  format: string;
  next_number: number;
  reset_yearly?: boolean;
}

/**
 * Format a sequence number using template
 * Template placeholders: {YYYY}, {MM}, {SEQUENCE}
 * Example: "WO-{YYYY}-{SEQUENCE}" with next_number=1001 → "WO-2025-1001"
 */
export function formatSequenceNumber(config: SequenceConfig): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  const paddedSequence = String(config.next_number).padStart(4, '0');

  return config.format
    .replace('{YYYY}', String(year))
    .replace('{MM}', month)
    .replace('{SEQUENCE}', paddedSequence);
}

/**
 * Get preview of next N sequence numbers
 */
export function getSequencePreview(config: SequenceConfig, count: number = 5): string[] {
  const preview = [];
  for (let i = 0; i < count; i++) {
    preview.push(
      formatSequenceNumber({
        ...config,
        next_number: config.next_number + i,
      })
    );
  }
  return preview;
}

/**
 * Validate sequence config format
 */
export function validateSequenceFormat(format: string): boolean {
  return /\{YYYY\}|\{MM\}|\{SEQUENCE\}/.test(format);
}
