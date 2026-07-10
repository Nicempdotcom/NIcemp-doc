import React, { createContext, useContext, useCallback, useState } from 'react';
import JSZip from 'jszip';
import type { UploadState, UploadStage, LoadedZip, ZipEntry, UploadError } from './types';
import { UPLOAD_CONFIG } from './types';

// ─── Context ──────────────────────────────────────────────────────────────────

interface UploadContextValue extends UploadState {
  processFile: (file: File) => Promise<void>;
  /**
   * Returns the ZIP ArrayBuffer and immediately sets it to null in state,
   * effectively "deleting" the ZIP from the app's memory.
   * The engine should consume the buffer synchronously after taking it.
   */
  takeBuffer: () => ArrayBuffer | null;
  reset: () => void;
}

const UploadContext = createContext<UploadContextValue | undefined>(undefined);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isZipMime(file: File): boolean {
  if (file.name.toLowerCase().endsWith('.zip')) return true;
  return UPLOAD_CONFIG.acceptMime.includes(file.type as never);
}

function friendly(kind: UploadError['kind'], extra?: string): UploadError {
  const messages: Record<UploadError['kind'], string> = {
    invalid_type:  'Apenas arquivos .zip são aceitos. Selecione um arquivo ZIP válido.',
    too_large:     `O arquivo excede o tamanho máximo de ${UPLOAD_CONFIG.maxSizeBytes / 1024 / 1024} MB.`,
    invalid_zip:   'O arquivo está corrompido ou não é um ZIP válido.',
    empty_zip:     'O arquivo ZIP está vazio. Adicione arquivos ao projeto antes de enviar.',
    read_failed:   extra ?? 'Não foi possível ler o arquivo. Tente novamente.',
  };
  return { kind, message: messages[kind] };
}

function readFileAsArrayBuffer(file: File, onProgress: (pct: number) => void): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 60));
    };
    reader.onload  = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('FileReader error'));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const INITIAL: UploadState = {
  stage: 'idle', progress: 0, zip: null, zipBuffer: null, error: null,
};

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UploadState>(INITIAL);

  const setStage = (stage: UploadStage, progress = 0) =>
    setState((s) => ({ ...s, stage, progress }));

  const processFile = useCallback(async (file: File) => {
    // ── 1. Validate type ─────────────────────────────────────────────────────
    if (!isZipMime(file)) {
      setState({ ...INITIAL, stage: 'error', error: friendly('invalid_type') });
      return;
    }

    // ── 2. Validate size ─────────────────────────────────────────────────────
    if (file.size > UPLOAD_CONFIG.maxSizeBytes) {
      setState({ ...INITIAL, stage: 'error', error: friendly('too_large') });
      return;
    }

    // ── 3. Read bytes ─────────────────────────────────────────────────────────
    setStage('reading', 5);

    let buffer: ArrayBuffer;
    try {
      buffer = await readFileAsArrayBuffer(file, (pct) =>
        setState((s) => ({ ...s, progress: pct })),
      );
    } catch {
      setState({ ...INITIAL, stage: 'error', error: friendly('read_failed') });
      return;
    }

    // ── 4. Parse ZIP to validate ──────────────────────────────────────────────
    setStage('analyzing', 65);

    let jszip: JSZip;
    try {
      jszip = await JSZip.loadAsync(buffer);
    } catch {
      setState({ ...INITIAL, stage: 'error', error: friendly('invalid_zip') });
      return;
    }

    // ── 5. Validate structure ─────────────────────────────────────────────────
    setState((s) => ({ ...s, progress: 80 }));

    const rawEntries = Object.entries(jszip.files);
    if (rawEntries.length === 0) {
      setState({ ...INITIAL, stage: 'error', error: friendly('empty_zip') });
      return;
    }

    setState((s) => ({ ...s, progress: 90 }));

    const entries: ZipEntry[] = rawEntries.map(([path, f]) => ({
      path,
      size:  (f as any)._data?.uncompressedSize ?? 0,
      isDir: f.dir,
      ext:   f.dir ? '' : ('.' + path.split('.').pop()!.toLowerCase()),
    }));

    const fileCount = entries.filter((e) => !e.isDir).length;
    const dirCount  = entries.filter((e) =>  e.isDir).length;

    const loadedZip: LoadedZip = {
      name:      file.name,
      sizeByes:  file.size,
      entries,
      fileCount,
      dirCount,
      loadedAt:  new Date().toISOString(),
    };

    // ── 6. Done — keep buffer for the engine ──────────────────────────────────
    setState({
      stage:     'completed',
      progress:  100,
      zip:       loadedZip,
      zipBuffer: buffer,   // ← retained for engine; cleared by takeBuffer()
      error:     null,
    });
  }, []);

  /**
   * Returns the buffer and immediately wipes it from state.
   * After this call the ZIP no longer exists in React state — GC can collect it
   * once the engine finishes processing and drops its own reference.
   */
  const takeBuffer = useCallback((): ArrayBuffer | null => {
    let buf: ArrayBuffer | null = null;
    setState((s) => {
      buf = s.zipBuffer;
      return { ...s, zipBuffer: null };
    });
    return buf;
  }, []);

  const reset = useCallback(() => setState(INITIAL), []);

  return (
    <UploadContext.Provider value={{ ...state, processFile, takeBuffer, reset }}>
      {children}
    </UploadContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUpload(): UploadContextValue {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error('useUpload must be used within UploadProvider');
  return ctx;
}
