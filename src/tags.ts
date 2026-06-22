import type { Meta } from './types.js';

const STR_TAG_ORDER = [
  'Event',
  'Site',
  'Date',
  'Round',
  'White',
  'Black',
  'Result',
] as const;

function escapeTagValue(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', String.raw`\"`);
}

function stringifyTags(meta: Meta): string {
  const lines: string[] = [];
  const stringSet = new Set<string>(STR_TAG_ORDER);

  for (const key of STR_TAG_ORDER) {
    const value = meta[key];
    if (value !== undefined) {
      lines.push(`[${key} "${escapeTagValue(value)}"]`);
    }
  }

  const sortedKeys = Object.keys(meta).toSorted((a, b) => a.localeCompare(b));
  for (const key of sortedKeys) {
    if (!stringSet.has(key)) {
      const value = meta[key];
      if (value !== undefined) {
        lines.push(`[${key} "${escapeTagValue(value)}"]`);
      }
    }
  }

  return lines.join('\n');
}

export { stringifyTags };
