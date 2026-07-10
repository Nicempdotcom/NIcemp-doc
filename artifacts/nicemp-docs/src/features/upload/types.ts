// ─── Upload Feature — Types ───────────────────────────────────────────────────
//
// The upload layer only validates the file extension and reads the bytes.
// No size limit is enforced — the only limit is the user's hardware.
// ZIP validation (structure, integrity) is done by the analysis worker.

export type UploadStage =
  | 'idle'       // No file selected
  | 'reading'    // FileReader loading bytes into memory
  | 'completed'  // Buffer ready in state, waiting to be taken by the worker
  | 'error';     // Extension wrong or FileReader failed

export type UploadErrorKind =
  | 'invalid_type'   // Not a .zip file
  | 'read_failed';   // FileReader threw

export interface UploadError {
  kind:    UploadErrorKind;
  message: string;
}

export interface UploadState {
  stage:        UploadStage;
  readProgress: number;            // 0–100 during 'reading'
  fileName:     string;
  fileSize:     number;            // bytes
  zipBuffer:    ArrayBuffer | null; // Cleared by takeBuffer()
  error:        UploadError | null;
}

/** Only the file extension is validated — no size cap. */
export const UPLOAD_CONFIG = {
  accept:     '.zip',
  acceptMime: ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'] as string[],
} as const;
