// ─── Upload Feature — Types ───────────────────────────────────────────────────

/** Pipeline stages shown to the user. */
export type UploadStage =
  | 'idle'       // Aguardando — nenhum arquivo selecionado
  | 'reading'    // Lendo — carregando bytes do arquivo
  | 'analyzing'  // Analisando — validando estrutura do ZIP
  | 'completed'  // Concluído — ZIP carregado em memória com sucesso
  | 'error';     // Erro — falha em qualquer etapa

export type UploadErrorKind =
  | 'invalid_type'    // Não é um arquivo .zip
  | 'too_large'       // Excede o tamanho máximo
  | 'invalid_zip'     // Não é um ZIP válido (corrompido ou vazio)
  | 'empty_zip'       // ZIP não contém nenhum arquivo
  | 'read_failed';    // Falha de leitura do FileReader

/** A single file entry extracted from inside the ZIP (metadata only, not content). */
export interface ZipEntry {
  path: string;       // Caminho relativo dentro do ZIP
  size: number;       // Tamanho descomprimido em bytes
  isDir: boolean;     // true se for uma pasta
  ext: string;        // Extensão do arquivo (ex: '.ts')
}

/** The loaded ZIP held in memory — never persisted to disk. */
export interface LoadedZip {
  name: string;           // Nome do arquivo original
  sizeByes: number;       // Tamanho total do arquivo .zip
  entries: ZipEntry[];    // Lista de todos os arquivos dentro do ZIP
  fileCount: number;      // Total de arquivos (excluindo pastas)
  dirCount: number;       // Total de pastas
  loadedAt: string;       // ISO timestamp
}

export interface UploadError {
  kind: UploadErrorKind;
  message: string;        // Mensagem amigável em português
}

/** Full state of the upload pipeline. */
export interface UploadState {
  stage: UploadStage;
  progress: number;           // 0–100
  zip: LoadedZip | null;      // Populated only when stage === 'completed'
  /**
   * The raw ZIP bytes kept in memory so the engine can consume them.
   * Set to null after takeBuffer() is called — effectively "deleting" the ZIP.
   */
  zipBuffer: ArrayBuffer | null;
  error: UploadError | null;
}

/** Configuration limits. */
export const UPLOAD_CONFIG = {
  maxSizeBytes: 50 * 1024 * 1024,  // 50 MB
  accept: '.zip',
  acceptMime: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
} as const;
