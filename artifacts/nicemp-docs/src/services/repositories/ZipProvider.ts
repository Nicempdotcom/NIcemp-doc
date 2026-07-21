/**
 * ZipProvider
 *
 * Thin adapter implementing RepositoryProvider for local ZIP files.
 * The actual parsing still happens in runAnalysisPipeline — this class
 * is a placeholder that satisfies the interface contract and documents
 * where the ZIP path sits in the architecture.
 */

import type { RepositoryProvider, RepoListResult, BranchInfo } from './types';
import { RepositoryError } from './types';
import type { ScannedFile } from '@/services/engine/types';

export class ZipProvider implements RepositoryProvider {
  listRepositories(_token: string, _page?: number): Promise<RepoListResult> {
    return Promise.resolve({ repos: [], page: 1, hasMore: false });
  }

  listBranches(_token: string, _owner: string, _repo: string): Promise<BranchInfo[]> {
    return Promise.resolve([]);
  }

  getDefaultBranch(_token: string, _owner: string, _repo: string): Promise<string> {
    return Promise.resolve('main');
  }

  downloadRepository(): Promise<ScannedFile[]> {
    throw new RepositoryError(
      'Use o fluxo de upload de ZIP em vez deste provider.',
      'UNKNOWN',
    );
  }

  loadFiles(): Promise<ScannedFile[]> {
    throw new RepositoryError(
      'Use o fluxo de upload de ZIP em vez deste provider.',
      'UNKNOWN',
    );
  }
}

export const zipProvider = new ZipProvider();
