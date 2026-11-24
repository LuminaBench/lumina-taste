import { combine, emit, on, type Cleanup } from '../../_shared/dom';

const fileIcon = '<svg class="lt-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-10Z"/><path d="M14 3.5v5h5"/></svg>';
const xIcon = '<svg class="lt-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
export const formatBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

/** File dropzone over a native file input: drag highlight, file list with sizes, remove buttons. */
export function enhance(root: HTMLElement): Cleanup {
  const input = root.querySelector<HTMLInputElement>('input[type="file"]')!;
  const listEl = root.querySelector<HTMLElement>('[data-part="files"]')!;
  let files: File[] = [];
  let depth = 0;
  const render = () => {
    listEl.innerHTML = '';
    files.forEach((f, i) => {
      const li = document.createElement('li');
      li.innerHTML = `${fileIcon}<span></span><small>${formatBytes(f.size)}</small><button type="button">${xIcon}</button>`;
      li.querySelector('span')!.textContent = f.name;
      const btn = li.querySelector('button')!;
      btn.setAttribute('aria-label', `Remove ${f.name}`);
      btn.addEventListener('click', () => { files.splice(i, 1); render(); emit(root, { files }); });
      listEl.append(li);
    });
  };
  const add = (list: FileList | null) => {
    if (!list) return;
    files = [...files, ...[...list].filter((f) => !files.some((x) => x.name === f.name && x.size === f.size))];
    render();
    emit(root, { files });
  };
  return combine(
    on(input, 'change', () => { add(input.files); input.value = ''; }),
    on(root, 'dragenter', (e: DragEvent) => { e.preventDefault(); depth++; root.setAttribute('data-dragging', ''); }),
    on(root, 'dragover', (e: DragEvent) => e.preventDefault()),
    on(root, 'dragleave', () => { if (--depth <= 0) { depth = 0; root.removeAttribute('data-dragging'); } }),
    on(root, 'drop', (e: DragEvent) => { e.preventDefault(); depth = 0; root.removeAttribute('data-dragging'); add(e.dataTransfer?.files ?? null); }),
  );
}
