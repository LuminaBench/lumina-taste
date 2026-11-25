import { cx } from '../../_shared/react';
import './invoice-sheet.css';

export interface InvoiceLine { item: string; detail?: string; qty: string; rate: string; amount: string }
export interface InvoiceTotal { label: string; amount: string }

/** A document set like one: who it is from, a number and status, three facts, lines with figures in one column, one total. */
export function InvoiceSheet({ from, address, title, status, state = 'due', meta, lines, totals, total, note, className }: {
  from: string; address?: string; title: string; status?: string; state?: 'due' | 'paid' | 'overdue' | 'draft';
  meta: Array<{ label: string; value: string }>; lines: InvoiceLine[]; totals?: InvoiceTotal[]; total: InvoiceTotal; note?: string; className?: string;
}) {
  return (
    <article className={cx('lt-invoice', className)} aria-label={title}>
      <header>
        <div><p data-part="from">{from}</p>{address && <p data-part="addr">{address}</p>}</div>
        <div data-part="id"><h3>{title}</h3>{status && <span data-part="status" data-state={state}>{status}</span>}</div>
      </header>
      <dl data-part="meta">{meta.map((m) => <div key={m.label}><dt>{m.label}</dt><dd>{m.value}</dd></div>)}</dl>
      <table>
        <thead><tr><th scope="col">Item</th><th scope="col" data-num="">Qty</th><th scope="col" data-num="">Rate</th><th scope="col" data-num="">Amount</th></tr></thead>
        <tbody>{lines.map((l) => <tr key={l.item}><th scope="row">{l.item}{l.detail && <span>{l.detail}</span>}</th><td>{l.qty}</td><td>{l.rate}</td><td>{l.amount}</td></tr>)}</tbody>
        <tfoot>
          {(totals ?? []).map((t) => <tr key={t.label}><th scope="row" colSpan={3}>{t.label}</th><td>{t.amount}</td></tr>)}
          <tr data-part="total"><th scope="row" colSpan={3}>{total.label}</th><td>{total.amount}</td></tr>
        </tfoot>
      </table>
      {note && <footer><p>{note}</p></footer>}
    </article>
  );
}
