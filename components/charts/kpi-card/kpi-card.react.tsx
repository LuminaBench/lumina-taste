import { useEffect, useRef } from 'react';
import { render, type KpiData, type KpiOptions } from './kpi-card';
import '../core/charts.css';

export function KpiCard({ data, options }: { data: KpiData; options?: KpiOptions }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const inst = render(ref.current!, data, options); return () => inst.destroy(); }, [data, JSON.stringify(options)]);
  return <div ref={ref} />;
}
