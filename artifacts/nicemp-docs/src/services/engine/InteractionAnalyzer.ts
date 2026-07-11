/**
 * InteractionAnalyzer
 *
 * Heuristic (regex-based, no AST parser) extraction of "what happens when
 * the user clicks this" from page/component source already read into
 * memory (CategorizedFile.content). Produces plain-Portuguese descriptions
 * consumed by the documentation pages and the Explorador ao vivo (EPIC 10).
 *
 * Deliberately conservative: when a label or an action can't be inferred
 * with confidence, the interaction is skipped rather than invented.
 */

import type { CategorizedFile, InteractionEntry } from './types';

// ─── Detection patterns ─────────────────────────────────────────────────────

const API_CALL_HINT_RE = /\b(fetch|axios\.\w+|apiClient\.\w+|\.mutate|useMutation|navigate|router\.push)\s*\(/;

// A single JSX tag carrying an onClick handler, with enough surrounding
// context to look for a label. Deliberately shallow — no nested-tag support,
// which is fine for a heuristic pass over already-scanned text.
const CLICKABLE_RE = /<([A-Za-z][\w.]*)\b([^>]*?)onClick=\{\s*([^}]+?)\s*\}([^>]*?)>([^<]*)</g;

function extractLabel(innerText: string, attrsBlob: string): string {
  const text = innerText.replace(/\{[^}]*\}/g, '').trim();
  if (text && !/^[<{]/.test(text)) return text.slice(0, 60);

  const attrMatch = attrsBlob.match(/(?:aria-label|title)\s*=\s*["'`]([^"'`]{1,60})["'`]/);
  if (attrMatch) return attrMatch[1];

  return '';
}

function extractHandlerName(expr: string): string {
  const trimmed = expr.trim();
  // Plain identifier: onClick={handleSave}
  if (/^[A-Za-z_$][\w$]*$/.test(trimmed)) return trimmed;
  // Arrow calling a named function: onClick={() => handleCancel()} / onClick={() => handleCancel(x)}
  const callMatch = trimmed.match(/=>\s*([A-Za-z_$][\w$]*)\s*\(/);
  if (callMatch) return callMatch[1];
  return '';
}

/** Grabs a generous text window starting at a handler's declaration — a cheap
 *  substitute for real brace-matching, good enough for regex hint-scanning. */
function findHandlerBody(content: string, handlerName: string): string {
  const fnDeclRe = new RegExp(`function\\s+${handlerName}\\s*\\([^)]*\\)\\s*\\{`);
  const constDeclRe = new RegExp(`const\\s+${handlerName}\\s*=\\s*(?:useCallback\\(\\s*)?(?:async\\s*)?(?:\\([^)]*\\)|[A-Za-z0-9_]+)\\s*=>`);

  let idx = -1;
  let m = fnDeclRe.exec(content);
  if (m) idx = m.index;
  else {
    m = constDeclRe.exec(content);
    if (m) idx = m.index;
  }
  if (idx < 0) return '';

  return content.slice(idx, idx + 1200);
}

interface DetectedAction {
  callsApi: boolean;
  apiHint: string;
}

function detectAction(body: string): DetectedAction {
  if (!body) return { callsApi: false, apiHint: '' };

  // fetch('/path', { method: 'POST', ... })
  const fetchMatch = body.match(/fetch\(\s*[`'"]([^`'"]+)[`'"]/);
  if (fetchMatch) {
    const methodMatch = body.match(/method\s*:\s*[`'"](GET|POST|PUT|PATCH|DELETE)[`'"]/i);
    const method = methodMatch ? methodMatch[1].toUpperCase() : 'POST';
    return { callsApi: true, apiHint: `${method} ${fetchMatch[1]}` };
  }

  // axios.post('/path') / apiClient.get('/path')
  const clientMatch = body.match(/(?:axios|apiClient)\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"]+)[`'"]/i);
  if (clientMatch) {
    return { callsApi: true, apiHint: `${clientMatch[1].toUpperCase()} ${clientMatch[2]}` };
  }

  // navigate('/path') or router.push('/path')
  const navMatch = body.match(/(?:navigate|router\.push)\(\s*[`'"]([^`'"]+)[`'"]/);
  if (navMatch) {
    return { callsApi: false, apiHint: `navega para ${navMatch[1]}` };
  }
  if (/navigate\(\s*-1\s*\)/.test(body)) {
    return { callsApi: false, apiHint: 'volta para a tela anterior' };
  }

  // .mutate(...) / useMutation(...) without a resolvable literal path
  if (/\.mutate\s*\(|useMutation\s*\(/.test(body)) {
    return { callsApi: true, apiHint: 'executa uma operação no servidor' };
  }

  if (/fetch\(|axios\.|apiClient\./.test(body)) {
    return { callsApi: true, apiHint: 'chama uma API' };
  }

  return { callsApi: false, apiHint: '' };
}

function buildDescription(label: string, handlerName: string, action: DetectedAction): string {
  const who = label ? `Botão '${label}'` : 'Elemento clicável';
  const what = handlerName ? `executa ${handlerName}` : 'executa uma ação';
  if (!action.apiHint) return `${who} → ${what}`;
  if (action.callsApi) return `${who} → ${what} → envia dados para ${action.apiHint}`;
  return `${who} → ${what} → ${action.apiHint}`;
}

function moduleOf(path: string): string {
  const parts = path.split('/').filter(Boolean);
  const skip = new Set(['src', 'app', 'lib', 'features', 'pages', 'components']);
  for (const part of parts.slice(0, 3)) {
    if (!skip.has(part.toLowerCase())) return part;
  }
  return parts[0] ?? 'root';
}

// ─── Analyzer ────────────────────────────────────────────────────────────────

export class InteractionAnalyzer {
  analyze(files: CategorizedFile[]): InteractionEntry[] {
    const result: InteractionEntry[] = [];
    const relevant = files.filter(
      (f) => (f.category === 'page' || f.category === 'component') && !f.isBinary && f.content,
    );

    for (const file of relevant) {
      CLICKABLE_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      let guard = 0;

      while ((match = CLICKABLE_RE.exec(file.content)) !== null) {
        // Guards against pathological loops on huge/minified files.
        if (++guard > 300) break;

        const [, , attrsBefore, expr, attrsAfter, innerText] = match;
        const handlerName = extractHandlerName(expr);
        const label = extractLabel(innerText, `${attrsBefore} ${attrsAfter}`);

        // Nothing confident to say about this click — skip rather than invent.
        if (!label && !handlerName) continue;

        let action: DetectedAction = { callsApi: false, apiHint: '' };
        if (handlerName) {
          const body = findHandlerBody(file.content, handlerName);
          if (body) {
            action = detectAction(body);
          } else if (API_CALL_HINT_RE.test(expr)) {
            action = detectAction(expr);
          }
        } else if (API_CALL_HINT_RE.test(expr)) {
          action = detectAction(expr);
        }

        result.push({
          id: `${file.path}:${match.index}`,
          filePath: file.path,
          module: moduleOf(file.path),
          handlerName,
          label,
          callsApi: action.callsApi,
          apiHint: action.apiHint,
          description: buildDescription(label, handlerName, action),
        });
      }
    }

    return result;
  }
}
