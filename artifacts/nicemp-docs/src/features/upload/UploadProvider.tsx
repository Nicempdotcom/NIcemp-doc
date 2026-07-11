import React, { createContext, useContext, useCallback, useState } from 'react';
import type { UploadState, UploadStage, UploadError } from './types';
import { UPLOAD_CONFIG } from './types';

// ─── Context ──────────────────────────────────────────────────────────────────

interface UploadContextValue extends UploadState {
  processFile: (file: File) => Promise<void>;
  /**
   * Returns the ZIP ArrayBuffer and immediately removes it from state.
   * The caller (worker) owns the buffer after this — GC can collect it
   * once the worker is done and drops its reference.
   */
  takeBuffer: () => ArrayBuffer | null;
  reset: () => void;
}

const UploadContext = createContext<UploadContextValue | undefined>(undefined);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isZip(file: File): boolean {
  if (file.name.toLowerCase().endsWith('.zip')) return true;
  return UPLOAD_CONFIG.acceptMime.includes(file.type);
}

function friendly(kind: UploadError['kind']): UploadError {
  const messages: Record<UploadError['kind'], string> = {
    invalid_type: 'Apenas arquivos .zip são aceitos. Selecione um arquivo ZIP do seu projeto.',
    read_failed:  'Não foi possível ler o arquivo. Verifique as permissões e tente novamente.',
  };
  return { kind, message: messages[kind] };
}

function readAsBuffer(
  file: File,
  onProgress: (pct: number) => void,
): Promise<ArrayBuffer> {
  console.log('[DEBUG] readAsBuffer: promise executor start');
  return new Promise((resolve, reject) => {
    const reader    = new FileReader();
    reader.onprogress = (e) => {
      console.log('[DEBUG] reader.onprogress fired', e.lengthComputable, e.loaded, e.total);
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    reader.onload  = () => {
      console.log('[DEBUG] reader.onload fired, byteLength=', (reader.result as ArrayBuffer)?.byteLength);
      resolve(reader.result as ArrayBuffer);
    };
    reader.onerror = () => {
      console.log('[DEBUG] reader.onerror fired', reader.error);
      reject(new Error('FileReader failed'));
    };
    console.log('[DEBUG] calling reader.readAsArrayBuffer(file)');
    reader.readAsArrayBuffer(file);
    console.log('[DEBUG] reader.readAsArrayBuffer(file) call returned (async)');
  });
}

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL: UploadState = {
  stage: 'idle', readProgress: 0, fileName: '', fileSize: 0,
  zipBuffer: null, error: null,
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UploadState>(INITIAL);

  const processFile = useCallback(async (file: File): Promise<void> => {
    console.log('[DEBUG] processFile called', { name: file.name, size: file.size });
    // ── Validate extension (only check — no size limit) ───────────────────
    console.log('[DEBUG] isZip result=', isZip(file));
    if (!isZip(file)) {
      setState({ ...INITIAL, stage: 'error', error: friendly('invalid_type') });
      return;
    }

    // ── Start reading ─────────────────────────────────────────────────────
    console.log('[DEBUG] setState reading called');
    setState({
      ...INITIAL,
      stage:    'reading',
      fileName: file.name,
      fileSize: file.size,
    });

    let buffer: ArrayBuffer;
    try {
      buffer = await readAsBuffer(file, (pct) =>
        setState((s) => ({ ...s, readProgress: pct })),
      );
      console.log('[DEBUG] buffer pronto, size=', buffer.byteLength);
    } catch (err) {
      console.log('[DEBUG] catch around readAsBuffer, err=', err);
      setState({ ...INITIAL, stage: 'error', error: friendly('read_failed') });
      return;
    }

    // ── Buffer ready — worker will consume it via takeBuffer() ────────────
    setState((s) => ({
      ...s,
      stage:        'completed',
      readProgress: 100,
      zipBuffer:    buffer,
    }));
  }, []);

  /**
   * Returns the buffer and wipes it from state immediately.
   * After this call the ZIP bytes exist only in the worker thread.
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
