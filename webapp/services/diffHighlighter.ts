/**
 * @file services/diffHighlighter.ts
 * @description
 * This file exports a function that compares two text strings (original and corrected)
 * on a character-by-character basis and returns an HTML string with <mark> tags around any inserted text.
 * 
 * Key features:
 * - Uses diff-match-patch with checklines set to false for a more granular, character-level diff.
 * - Wraps inserted text in <mark> tags.
 * - Skips deleted text.
 * 
 * @dependencies
 * - diff-match-patch: For computing text diffs.
 *
 * @notes
 * - Removing any cleanup calls ensures a more literal diff.
 */

import DiffMatchPatch from 'diff-match-patch';

export function highlightDifferences(original: string, corrected: string): string {
  const dmp = new DiffMatchPatch();
  // Force a character-by-character diff by setting checklines to false.
  const diffs = dmp.diff_main(original, corrected, false);
  
  // Do not perform any cleanup to preserve all granular differences.
  // (Removing cleanup ensures even minor changes are detected)

  let result = '';
  for (const [op, text] of diffs) {
    if (op === DiffMatchPatch.DIFF_INSERT) {
      result += `<mark>${text}</mark>`;
    } else if (op === DiffMatchPatch.DIFF_DELETE) {
      // Skipping deleted text; alternatively, you could highlight deletions if desired.
    } else { // DiffMatchPatch.DIFF_EQUAL
      result += text;
    }
  }
  return result;
}
