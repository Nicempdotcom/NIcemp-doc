import React, { useCallback, useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/utils';
import { UPLOAD_CONFIG } from '@/features/upload';

interface FileDropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export default function FileDropZone({ onFile, disabled = false }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (file && !disabled) onFile(file);
    },
    [onFile, disabled],
  );

  // ── Drag events ────────────────────────────────────────────────────────────
  const onDragEnter = (e: React.DragEvent) => { e.preventDefault(); if (!disabled) setIsDragging(true); };
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFile(e.dataTransfer.files[0]);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    handleFile(e.target.files?.[0]);

  const maxMB = UPLOAD_CONFIG.maxSizeBytes / 1024 / 1024;

  return (
    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        'group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-8 py-14 text-center transition-all duration-200',
        isDragging
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-border bg-card hover:border-primary/50 hover:bg-accent/30',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      {/* Icon */}
      <div className={cn(
        'mb-5 flex h-16 w-16 items-center justify-center rounded-2xl transition-colors',
        isDragging ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary',
      )}>
        <UploadCloud className="h-8 w-8" />
      </div>

      {/* Text */}
      <p className="text-base font-semibold text-foreground">
        {isDragging ? 'Solte o arquivo aqui' : 'Arraste seu projeto aqui'}
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground">
        ou{' '}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-primary underline-offset-2 hover:underline font-medium"
        >
          selecione um arquivo
        </button>
      </p>

      {/* Hint */}
      <p className="mt-4 text-xs text-muted-foreground/70">
        Apenas arquivos <span className="font-mono font-medium text-muted-foreground">.zip</span> • máximo {maxMB} MB
      </p>

      {/* Hidden input */}
      <input
        ref={inputRef}
        type="file"
        accept={UPLOAD_CONFIG.accept}
        className="sr-only"
        onChange={onInputChange}
        disabled={disabled}
      />
    </div>
  );
}
