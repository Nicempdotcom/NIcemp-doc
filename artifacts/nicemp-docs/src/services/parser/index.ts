// ─── Parser Service ───────────────────────────────────────────────────────────
// Transforms raw file content (JSON, Markdown, TypeScript) into structured
// internal representations consumable by the scanner and graph services.

export type ParsedNodeKind = 'module' | 'component' | 'hook' | 'api' | 'table' | 'function';

export interface ParsedNode {
  id: string;
  kind: ParsedNodeKind;
  name: string;
  filePath: string;
  exports: string[];
  imports: string[];
  rawContent: string;
}

export interface ParseResult {
  nodes: ParsedNode[];
  errors: Array<{ filePath: string; message: string }>;
  parsedAt: string;
}

/** Stub — not yet implemented. */
export const parserService = {
  /** Parse a single file's content into structured nodes. */
  async parseFile(_filePath: string, _content: string): Promise<ParseResult> {
    // TODO: implement per-format parsers (JSON, TS, MD)
    return { nodes: [], errors: [], parsedAt: new Date().toISOString() };
  },

  /** Parse multiple files in batch. */
  async parseFiles(_files: Array<{ path: string; content: string }>): Promise<ParseResult> {
    // TODO: implement batch parsing with error aggregation
    return { nodes: [], errors: [], parsedAt: new Date().toISOString() };
  },
};
