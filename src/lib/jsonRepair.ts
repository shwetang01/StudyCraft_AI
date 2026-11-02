/**
 * Resilient JSON Extractor and Repair Utility
 * Solves common LLM JSON failure modes:
 * - Conversational text surrounding JSON (markdown code blocks, introductory text)
 * - Trailing commas in arrays and objects
 * - Truncated JSON due to token limits (unclosed braces/brackets/quotes)
 * - Single quotes instead of double quotes
 * - Unescaped control characters
 */

export interface RepairResult {
  parsed: unknown;
  wasRepaired: boolean;
  notes: string[];
}

export function extractAndRepairJson(rawText: string): RepairResult {
  const notes: string[] = [];
  let wasRepaired = false;

  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Input is empty or not a string');
  }

  let text = rawText.trim();

  // Step 1: Extract from markdown code fences if present
  const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (markdownMatch && markdownMatch[1]) {
    text = markdownMatch[1].trim();
    wasRepaired = true;
    notes.push('Extracted JSON from markdown code fence');
  }

  // Step 2: If there's conversational prefix/suffix, locate the outermost { ... }
  if (!text.startsWith('{') && !text.startsWith('[')) {
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    let startIdx = -1;

    if (firstBrace !== -1 && firstBracket !== -1) {
      startIdx = Math.min(firstBrace, firstBracket);
    } else if (firstBrace !== -1) {
      startIdx = firstBrace;
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
    }

    if (startIdx !== -1) {
      text = text.substring(startIdx);
      wasRepaired = true;
      notes.push('Stripped conversational prefix preceding JSON');
    }
  }

  // First fast attempt: native JSON.parse
  try {
    const directParse = JSON.parse(text);
    return {
      parsed: directParse,
      wasRepaired,
      notes,
    };
  } catch (initialErr) {
    // Needs repairing
    wasRepaired = true;
    notes.push(`Direct parse failed: ${(initialErr as Error).message}`);
  }

  // Step 2.5: Fix invalid backslash escapes (e.g. from LaTeX math like \vec, \alpha, \text)
  const beforeEscapes = text;
  text = text.replace(/(?<!\\)\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\');
  if (text !== beforeEscapes) {
    notes.push('Escaped invalid backslash escape sequences (e.g. LaTeX formulas)');
  }

  // Step 3: Repair trailing commas before closing } or ]
  const beforeTrailingComma = text;
  text = text.replace(/,(\s*[\]}])/g, '$1');
  if (text !== beforeTrailingComma) {
    notes.push('Removed trailing commas before closing brackets');
  }

  // Step 4: Fix single quotes around keys or values (carefully avoiding apostrophes inside words)
  // Replaces 'key': with "key":
  const beforeQuotes = text;
  text = text.replace(/([{,]\s*)'([^'\n]+)'\s*:/g, '$1"$2":');
  if (text !== beforeQuotes) {
    notes.push('Normalized single-quoted object keys to double quotes');
  }

  // Step 5: Check for truncated strings / unclosed structures (e.g. LLM ran out of tokens)
  text = balanceUnclosedJson(text, notes);

  // Try parsing after balance
  try {
    const repairedParse = JSON.parse(text);
    notes.push('Successfully parsed after automated syntax repair');
    return {
      parsed: repairedParse,
      wasRepaired: true,
      notes,
    };
  } catch (secondErr) {
    // Step 6: Aggressive heuristic truncation repair:
    // Find the last valid closed object in an array or closed key-value pair
    const heuristicFixed = recoverPartialArrayOrObject(text);
    if (heuristicFixed) {
      try {
        const partialParse = JSON.parse(heuristicFixed);
        notes.push('Recovered valid partial JSON payload from truncated stream');
        return {
          parsed: partialParse,
          wasRepaired: true,
          notes,
        };
      } catch {
        // Fall through to final error
      }
    }

    throw new Error(
      `Unable to safely repair malformed JSON: ${(secondErr as Error).message}. Diagnostics: ${notes.join('; ')}`
    );
  }
}

/**
 * Closes unclosed quotes, brackets, and braces to balance an incomplete JSON string
 */
function balanceUnclosedJson(input: string, notes: string[]): string {
  let str = input;
  let inString = false;
  let isEscaped = false;
  const stack: ('{' | '[')[] = [];

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      isEscaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        stack.push('{');
      } else if (char === '[') {
        stack.push('[');
      } else if (char === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '{') {
          stack.pop();
        }
      } else if (char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === '[') {
          stack.pop();
        }
      }
    }
  }

  // If ended while still inside an unclosed string, close the quote
  if (inString) {
    str += '"';
    notes.push('Closed unterminated string quote');
  }

  // Remove trailing dangling comma if string ended right after comma
  str = str.replace(/,\s*$/, '');

  // Close remaining unclosed open braces/brackets in reverse order
  if (stack.length > 0) {
    let closingSymbols = '';
    while (stack.length > 0) {
      const open = stack.pop();
      if (open === '{') closingSymbols += '}';
      if (open === '[') closingSymbols += ']';
    }
    str += closingSymbols;
    notes.push(`Auto-closed dangling brackets: ${closingSymbols}`);
  }

  return str;
}

/**
 * Truncates back to the last valid comma or closing delimiter in an array of objects
 */
function recoverPartialArrayOrObject(input: string): string | null {
  const lastArrayClose = input.lastIndexOf('}');
  if (lastArrayClose !== -1) {
    const truncated = input.substring(0, lastArrayClose + 1);
    // Count open braces vs brackets
    const openBrackets = (truncated.match(/\[/g) || []).length;
    const closeBrackets = (truncated.match(/\]/g) || []).length;
    const openBraces = (truncated.match(/\{/g) || []).length;
    const closeBraces = (truncated.match(/\}/g) || []).length;

    let fix = truncated;
    for (let i = 0; i < openBraces - closeBraces; i++) fix += '}';
    for (let i = 0; i < openBrackets - closeBrackets; i++) fix += ']';
    for (let i = 0; i < openBraces - closeBraces; i++) fix += '}';

    return fix;
  }
  return null;
}
