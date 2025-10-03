/**
 * Utilities for parsing OpenAI response items into Entry objects and formatting them.
 *
 * It provides:
 *   - Entry: a record of role and content.
 *   - parseResponseItems: flatten responses into entries with optional filtering.
 *   - formatEntries: render entries as JSON or plain text.
 */

/**
 * Parsed text entry with role metadata.
 */
export interface Entry {
  /** The role of the message (e.g., 'user', 'assistant'). */
  role: string;
  /** The content of the message. */
  content: string;
}

/**
 * Type alias for OpenAI response types.
 */
export type TResponse = any;
export type TResponseInputItem = any;
export type TResponseOutputItem = any;
export type TResponseStreamEvent = any;

/**
 * Convert an object to a mapping or pass through if it's already a mapping.
 */
function toMapping(item: any): Record<string, any> | null {
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    return item;
  }
  return null;
}

/**
 * Parse both input and output messages (type='message').
 */
function parseMessage(item: Record<string, any>): Entry[] {
  const role = item.role;
  const contents = item.content;

  if (typeof contents === 'string') {
    return [{ role, content: contents }];
  }

  const parts: string[] = [];
  if (Array.isArray(contents)) {
    for (const part of contents) {
      if (typeof part === 'object' && part !== null) {
        if (part.type === 'input_text' || part.type === 'output_text') {
          parts.push(part.text || '');
        } else if (typeof part === 'string') {
          parts.push(part);
        } else {
          console.warn('Unknown message part:', part);
        }
      } else if (typeof part === 'string') {
        parts.push(part);
      }
    }
  }

  return [{ role, content: parts.join('') }];
}

/**
 * Generate handler for single-string fields.
 */
function scalarHandler(role: string, key: string): (item: Record<string, any>) => Entry[] {
  return (item: Record<string, any>): Entry[] => {
    const val = item[key];
    return typeof val === 'string' ? [{ role, content: val }] : [];
  };
}

/**
 * Generate handler for list fields.
 */
function listHandler(
  role: string,
  listKey: string,
  textKey: string
): (item: Record<string, any>) => Entry[] {
  return (item: Record<string, any>): Entry[] => {
    const list = item[listKey];
    if (!Array.isArray(list)) return [];

    const entries: Entry[] = [];
    for (const listItem of list) {
      if (typeof listItem === 'object' && listItem !== null) {
        const text = listItem[textKey];
        if (typeof text === 'string') {
          entries.push({ role, content: text });
        }
      }
    }
    return entries;
  };
}

/**
 * Parse response items into Entry objects.
 *
 * @param response - The response to parse.
 * @param filterFn - Optional filter function for entries.
 * @returns Array of parsed entries.
 */
export function parseResponseItems(
  response: TResponse,
  filterFn?: (entry: Entry) => boolean
): Entry[] {
  const entries: Entry[] = [];

  if (!response || typeof response !== 'object') {
    return entries;
  }

  // Handle different response types
  if (response.choices && Array.isArray(response.choices)) {
    for (const choice of response.choices) {
      if (choice.message) {
        const messageEntries = parseMessage(choice.message);
        entries.push(...messageEntries);
      }
    }
  }

  // Apply filter if provided
  if (filterFn) {
    return entries.filter(filterFn);
  }

  return entries;
}

/**
 * Parse response items as JSON.
 *
 * @param response - The response to parse.
 * @returns Array of parsed entries.
 */
export function parseResponseItemsAsJson(response: TResponse): Entry[] {
  return parseResponseItems(response, (entry) => {
    try {
      JSON.parse(entry.content);
      return true;
    } catch {
      return false;
    }
  });
}

/**
 * Format entries as JSON.
 *
 * @param entries - The entries to format.
 * @returns JSON string representation.
 */
export function formatEntriesAsJson(entries: Entry[]): string {
  return JSON.stringify(entries, null, 2);
}

/**
 * Format entries as plain text.
 *
 * @param entries - The entries to format.
 * @returns Plain text representation.
 */
export function formatEntriesAsText(entries: Entry[]): string {
  return entries.map((entry) => `${entry.role}: ${entry.content}`).join('\n');
}

/**
 * Format entries in the specified format.
 *
 * @param entries - The entries to format.
 * @param format - The format to use ('json' or 'text').
 * @param options - Formatting options.
 * @returns Formatted string representation.
 */
export function formatEntries(
  entries: Entry[],
  format: 'json' | 'text' = 'text',
  options: {
    indent?: number;
    filterRole?: string;
    lastN?: number;
    separator?: string;
  } = {}
): string {
  switch (format) {
    case 'json':
      return formatEntriesAsJson(entries);
    case 'text':
    default:
      return formatEntriesAsText(entries);
  }
}

/**
 * Extract text content from a response.
 *
 * @param response - The response to extract text from.
 * @returns Extracted text content.
 */
export function extractTextContent(response: TResponse): string {
  const entries = parseResponseItems(response);
  return entries.map((entry) => entry.content).join('\n');
}

/**
 * Extract JSON content from a response.
 *
 * @param response - The response to extract JSON from.
 * @returns Extracted JSON content or null if parsing fails.
 */
export function extractJsonContent(response: TResponse): any {
  const entries = parseResponseItemsAsJson(response);
  if (entries.length === 0) return null;

  try {
    return JSON.parse(entries[0].content);
  } catch {
    return null;
  }
}
