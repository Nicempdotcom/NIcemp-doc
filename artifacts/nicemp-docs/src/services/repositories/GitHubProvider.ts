/**
 * GitHubProvider
 *
 * Implements RepositoryProvider for the GitHub REST API (v3).
 * Uses Personal Access Tokens (PAT) or OAuth tokens — both work identically
 * with this implementation.
 *
 * Designed to be extended for GitHub Device Flow OAuth:
 * set VITE_GITHUB_CLIENT_ID in the environment and call initiateDeviceFlow() /
 * pollDeviceFlow() to exchange a device code for an access token.
 *
 * Extensible for GitLab/Bitbucket/Azure DevOps without modifying the pipeline.
 */

import type {
  RepositoryProvider,
  RepoInfo,
  RepoListResult,
  BranchInfo,
  GitHubUser,
} from './types';
import { RepositoryError } from './types';
import type { ScannedFile } from '@/services/engine/types';
import { isExcludedPath } from '@/services/engine/pathExclusions';

const BASE = 'https://api.github.com';
const PER_PAGE = 30;

// ─── Binary extension set (mirrors runAnalysisPipeline.ts) ───────────────────

const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.tiff', '.avif',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.mp4', '.mp3', '.wav', '.ogg', '.avi', '.mov', '.mkv', '.webm',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.pyc', '.class', '.o', '.a', '.db', '.sqlite', '.sqlite3',
  '.lock',
]);

const MAX_TEXT = 200_000; // bytes per file — mirrors runAnalysisPipeline.ts

// ─── In-memory download cache (keyed by sha) ─────────────────────────────────
// Prevents re-downloading the same commit within a session.

const downloadCache = new Map<string, ScannedFile[]>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept:        'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function apiFetch<T>(
  token:    string,
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${endpoint}`, {
      ...options,
      headers: { ...headers(token), ...(options?.headers ?? {}) },
    });
  } catch {
    throw new RepositoryError(
      'Falha na conexão com o GitHub. Verifique sua internet.',
      'NETWORK_ERROR',
    );
  }

  if (res.status === 401) {
    throw new RepositoryError(
      'Token inválido ou expirado. Gere um novo Personal Access Token no GitHub.',
      'TOKEN_INVALID',
      401,
    );
  }
  if (res.status === 403) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    const isRateLimit = res.headers.get('x-ratelimit-remaining') === '0'
      || (body.message ?? '').toLowerCase().includes('rate limit');
    if (isRateLimit) {
      const reset = Number(res.headers.get('x-ratelimit-reset') ?? 0);
      const mins  = Math.ceil(Math.max(0, reset * 1000 - Date.now()) / 60_000);
      throw new RepositoryError(
        `Limite de requisições do GitHub atingido. Tente novamente em ${mins} minuto${mins !== 1 ? 's' : ''}.`,
        'RATE_LIMITED',
        403,
      );
    }
    throw new RepositoryError(
      'Sem permissão para acessar este repositório.',
      'NO_PERMISSION',
      403,
    );
  }
  if (res.status === 404) {
    throw new RepositoryError(
      'Repositório, branch ou commit não encontrado.',
      'NOT_FOUND',
      404,
    );
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new RepositoryError(
      body.message ?? `Erro inesperado do GitHub (HTTP ${res.status}).`,
      'UNKNOWN',
      res.status,
    );
  }

  return res.json() as Promise<T>;
}

// ─── GitHubProvider ───────────────────────────────────────────────────────────

export class GitHubProvider implements RepositoryProvider {

  // ── User info ───────────────────────────────────────────────────────────────

  async getUser(token: string): Promise<GitHubUser> {
    const data = await apiFetch<{
      login: string;
      name:  string | null;
      avatar_url: string;
      email: string | null;
    }>(token, '/user');
    return {
      login:     data.login,
      name:      data.name,
      avatarUrl: data.avatar_url,
      email:     data.email,
    };
  }

  // ── List repositories ───────────────────────────────────────────────────────

  async listRepositories(token: string, page = 1): Promise<RepoListResult> {
    type GHRepo = {
      id:               number;
      name:             string;
      full_name:        string;
      owner:            { login: string };
      description:      string | null;
      private:          boolean;
      default_branch:   string;
      language:         string | null;
      stargazers_count: number;
      updated_at:       string;
      topics:           string[];
      html_url:         string;
    };

    const data = await apiFetch<GHRepo[]>(
      token,
      `/user/repos?per_page=${PER_PAGE}&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
    );

    const repos: RepoInfo[] = data.map((r) => ({
      id:            r.id,
      name:          r.name,
      fullName:      r.full_name,
      owner:         r.owner.login,
      description:   r.description,
      isPrivate:     r.private,
      defaultBranch: r.default_branch,
      language:      r.language,
      stargazers:    r.stargazers_count,
      updatedAt:     r.updated_at,
      topics:        r.topics ?? [],
      url:           r.html_url,
    }));

    return { repos, page, hasMore: data.length === PER_PAGE };
  }

  // ── List branches ───────────────────────────────────────────────────────────

  async listBranches(token: string, owner: string, repo: string): Promise<BranchInfo[]> {
    type GHBranch = {
      name:      string;
      commit:    { sha: string };
      protected: boolean;
    };
    const data = await apiFetch<GHBranch[]>(
      token,
      `/repos/${owner}/${repo}/branches?per_page=100`,
    );
    return data.map((b) => ({
      name:      b.name,
      sha:       b.commit.sha,
      protected: b.protected,
    }));
  }

  // ── Default branch ──────────────────────────────────────────────────────────

  async getDefaultBranch(token: string, owner: string, repo: string): Promise<string> {
    const data = await apiFetch<{ default_branch: string }>(
      token,
      `/repos/${owner}/${repo}`,
    );
    return data.default_branch;
  }

  // ── Download repository via tree + blob API ─────────────────────────────────

  async downloadRepository(
    token:      string,
    owner:      string,
    repo:       string,
    branch:     string,
    sha?:       string,
    onProgress?: (pct: number, label: string) => void,
  ): Promise<ScannedFile[]> {
    // Resolve HEAD SHA if not provided
    let commitSha = sha;
    if (!commitSha) {
      const branch_ = (await this.listBranches(token, owner, repo))
        .find((b) => b.name === branch);
      if (!branch_) {
        throw new RepositoryError(
          `Branch '${branch}' não encontrada em ${owner}/${repo}.`,
          'BRANCH_NOT_FOUND',
        );
      }
      commitSha = branch_.sha;
    }

    // Check in-memory cache
    const cacheKey = `${owner}/${repo}/${commitSha}`;
    if (downloadCache.has(cacheKey)) {
      onProgress?.(100, 'Usando cache do commit anterior…');
      return downloadCache.get(cacheKey)!;
    }

    onProgress?.(5, 'Obtendo árvore de arquivos…');

    // Get recursive tree
    type GHTree = {
      sha:       string;
      truncated: boolean;
      tree:      Array<{
        path: string;
        type: 'blob' | 'tree';
        sha:  string;
        size?: number;
      }>;
    };

    const treeData = await apiFetch<GHTree>(
      token,
      `/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`,
    );

    if (treeData.truncated) {
      throw new RepositoryError(
        `O repositório ${owner}/${repo} é muito grande para análise via API. ` +
        'Tente um repositório menor ou faça download do ZIP manualmente.',
        'REPO_TOO_LARGE',
      );
    }

    // Filter to source files only
    const blobs = treeData.tree.filter((entry) => {
      if (entry.type !== 'blob') return false;
      if (isExcludedPath(entry.path)) return false;
      return true;
    });

    if (blobs.length === 0) {
      throw new RepositoryError(
        'Nenhum arquivo de código-fonte encontrado no repositório.',
        'NOT_FOUND',
      );
    }

    onProgress?.(10, `${blobs.length} arquivos encontrados. Baixando…`);

    // Build ScannedFile[] — fetch text blobs in concurrent batches
    const BATCH = 20;
    const scanned: ScannedFile[] = [];

    for (let i = 0; i < blobs.length; i += BATCH) {
      const batch = blobs.slice(i, i + BATCH);

      const results = await Promise.all(batch.map(async (entry) => {
        const nameParts = entry.path.split('/');
        const name      = nameParts[nameParts.length - 1];
        const dotIdx    = name.lastIndexOf('.');
        const ext       = dotIdx >= 0 ? name.slice(dotIdx).toLowerCase() : '';
        const isBinary  = BINARY_EXT.has(ext);
        const size      = entry.size ?? 0;

        let content = '';

        if (!isBinary) {
          try {
            type GHBlob = { content: string; encoding: string; size: number };
            const blob = await apiFetch<GHBlob>(
              token,
              `/repos/${owner}/${repo}/git/blobs/${entry.sha}`,
            );

            if (blob.encoding === 'base64') {
              // Decode base64 → bytes → UTF-8 string
              const raw = atob(blob.content.replace(/\n/g, ''));
              content = raw.length > MAX_TEXT
                ? raw.slice(0, MAX_TEXT) + '\n/* [truncated] */'
                : raw;
            }
          } catch {
            // Treat as binary if fetch/decode fails
          }
        }

        return { path: entry.path, name, ext, size, content, isBinary } satisfies ScannedFile;
      }));

      scanned.push(...results);

      const pct = Math.round(10 + ((i + BATCH) / blobs.length) * 50);
      onProgress?.(
        Math.min(pct, 60),
        `Baixando arquivos… ${Math.min(i + BATCH, blobs.length)} / ${blobs.length}`,
      );
    }

    onProgress?.(60, 'Download concluído. Iniciando análise…');

    // Store in cache
    downloadCache.set(cacheKey, scanned);

    return scanned;
  }

  // ── loadFiles (convenience wrapper) ────────────────────────────────────────

  async loadFiles(
    token:      string,
    owner:      string,
    repo:       string,
    branch:     string,
    onProgress?: (pct: number, label: string) => void,
  ): Promise<ScannedFile[]> {
    return this.downloadRepository(token, owner, repo, branch, undefined, onProgress);
  }
}

// ─── GitHub Device Flow (optional — requires VITE_GITHUB_CLIENT_ID) ──────────
// When a client_id is configured, initiateDeviceFlow() starts the OAuth handshake.
// The user visits a URL and enters a code; pollDeviceFlow() returns the token.

export interface DeviceFlowStart {
  deviceCode:      string;
  userCode:        string;   // e.g. "ABCD-1234"
  verificationUrl: string;   // e.g. "https://github.com/login/device"
  expiresIn:       number;   // seconds
  interval:        number;   // polling interval in seconds
}

export async function initiateDeviceFlow(): Promise<DeviceFlowStart> {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined;
  if (!clientId) {
    throw new RepositoryError(
      'GitHub OAuth App não configurado. Defina VITE_GITHUB_CLIENT_ID.',
      'TOKEN_INVALID',
    );
  }

  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, scope: 'repo read:user' }),
  });
  if (!res.ok) throw new RepositoryError('Falha ao iniciar autenticação OAuth.', 'UNKNOWN');

  const data = await res.json() as {
    device_code: string;
    user_code:   string;
    verification_uri: string;
    expires_in:  number;
    interval:    number;
  };

  return {
    deviceCode:      data.device_code,
    userCode:        data.user_code,
    verificationUrl: data.verification_uri,
    expiresIn:       data.expires_in,
    interval:        data.interval,
  };
}

export async function pollDeviceFlow(
  deviceCode: string,
  interval:   number,
): Promise<string> {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined;
  if (!clientId) throw new RepositoryError('GitHub OAuth App não configurado.', 'TOKEN_INVALID');

  for (;;) {
    await new Promise((r) => setTimeout(r, interval * 1000));

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:   clientId,
        device_code: deviceCode,
        grant_type:  'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });
    const data = await res.json() as {
      access_token?: string;
      error?:        string;
      interval?:     number;
    };

    if (data.access_token) return data.access_token;
    if (data.error === 'authorization_pending') continue;
    if (data.error === 'slow_down') {
      interval = (data.interval ?? interval) + 5;
      continue;
    }
    if (data.error === 'expired_token') {
      throw new RepositoryError('Código expirado. Tente novamente.', 'TOKEN_EXPIRED');
    }
    throw new RepositoryError(`Erro OAuth: ${data.error ?? 'desconhecido'}`, 'UNKNOWN');
  }
}

// ─── Singleton instance ───────────────────────────────────────────────────────

export const gitHubProvider = new GitHubProvider();
