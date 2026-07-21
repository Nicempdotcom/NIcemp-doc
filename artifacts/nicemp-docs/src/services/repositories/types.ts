/**
 * Repository Provider Architecture
 *
 * Every source of project files (ZIP, GitHub, GitLab, Bitbucket, etc.) must
 * implement the RepositoryProvider interface. The analysis pipeline never
 * knows or cares about the origin — it always receives ScannedFile[].
 */

import type { ScannedFile } from '@/services/engine/types';

// ─── Core interface ───────────────────────────────────────────────────────────

export interface RepositoryProvider {
  /** List repositories the authenticated user can access. */
  listRepositories(token: string, page?: number): Promise<RepoListResult>;

  /** List branches for a repository. */
  listBranches(token: string, owner: string, repo: string): Promise<BranchInfo[]>;

  /** Resolve the default branch name for a repository. */
  getDefaultBranch(token: string, owner: string, repo: string): Promise<string>;

  /**
   * Download repository content and convert to ScannedFile[].
   * @param sha  Optional commit SHA. When omitted, HEAD of the branch is used.
   */
  downloadRepository(
    token:  string,
    owner:  string,
    repo:   string,
    branch: string,
    sha?:   string,
    onProgress?: (pct: number, label: string) => void,
  ): Promise<ScannedFile[]>;

  /**
   * High-level convenience: resolve HEAD + download. Equivalent to
   * downloadRepository without a specific sha.
   */
  loadFiles(
    token:  string,
    owner:  string,
    repo:   string,
    branch: string,
    onProgress?: (pct: number, label: string) => void,
  ): Promise<ScannedFile[]>;
}

// ─── Shared data types ────────────────────────────────────────────────────────

export interface RepoInfo {
  id:            number;
  name:          string;          // e.g. "my-app"
  fullName:      string;          // e.g. "acme/my-app"
  owner:         string;          // login / org name
  description:   string | null;
  isPrivate:     boolean;
  defaultBranch: string;
  language:      string | null;   // Primary language
  stargazers:    number;
  updatedAt:     string;          // ISO-8601
  topics:        string[];
  url:           string;
}

export interface RepoListResult {
  repos:      RepoInfo[];
  page:       number;
  hasMore:    boolean;
  totalCount?: number;
}

export interface BranchInfo {
  name:      string;
  sha:       string;       // HEAD commit SHA
  protected: boolean;
}

export interface CommitInfo {
  sha:     string;
  message: string;
  author:  string;
  date:    string;         // ISO-8601
}

// ─── Auth types ───────────────────────────────────────────────────────────────

export interface GitHubUser {
  login:     string;
  name:      string | null;
  avatarUrl: string;
  email:     string | null;
}

export interface GitHubAuthState {
  token:    string;
  user:     GitHubUser;
  provider: 'github';
}

// ─── Error types ─────────────────────────────────────────────────────────────

export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: RepositoryErrorCode,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

export type RepositoryErrorCode =
  | 'TOKEN_INVALID'
  | 'TOKEN_EXPIRED'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'NO_PERMISSION'
  | 'REPO_TOO_LARGE'
  | 'BRANCH_NOT_FOUND'
  | 'COMMIT_NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

// ─── Re-export ScannedFile so callers can import from here ──────────────────

export type { ScannedFile };
