import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './file-dropzone';
import './file-dropzone.css';

export interface FileDropzoneProps { accept?: string; multiple?: boolean; hint?: string; onFiles?: (files: File[]) => void; className?: string }

export function FileDropzone({ accept, multiple = true, hint = 'Up to 25 MB each', onFiles, className }: FileDropzoneProps) {
  const ref = useEnhance<HTMLDivElement, { files: File[] }>(enhance, (d) => onFiles?.(d.files));
  return (
    <div ref={ref} className={cx('lt-dropzone', className)}>
      <label data-part="zone">
        <input type="file" multiple={multiple} accept={accept} />
        <span data-part="icon" aria-hidden="true"><Icon name="upload" size={20} /></span>
        <span data-part="title"><strong>Drop files here</strong> or <u>browse</u></span>
        <span data-part="meta">{hint}</span>
      </label>
      <ul data-part="files" aria-label="Selected files" />
    </div>
  );
}
