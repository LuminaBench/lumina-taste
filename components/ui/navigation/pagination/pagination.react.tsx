import { Icon } from '../../_shared/Icon';
import { cx, useEnhance } from '../../_shared/react';
import { enhance } from './pagination';
import './pagination.css';

export function Pagination({ total, page = 1, perPage = 25, rows, onPageChange, className }: { total: number; page?: number; perPage?: number; rows?: number; onPageChange?: (page: number) => void; className?: string }) {
  const ref = useEnhance<HTMLElement, { page: number }>(enhance, (d) => onPageChange?.(d.page), [total]);
  return (
    <nav ref={ref} className={cx('lt-pagination', className)} data-page={page} data-total={total} data-per-page={perPage} data-rows={rows} aria-label="Pagination">
      <button type="button" data-part="prev"><Icon name="chevron-left" /><span>Previous</span></button>
      <ol data-part="pages" />
      <button type="button" data-part="next"><span>Next</span><Icon name="chevron-right" /></button>
      <p data-part="summary" aria-live="polite" />
    </nav>
  );
}
