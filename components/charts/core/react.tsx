import { useEffect, useRef } from 'react';
import type { ChartInstance, ChartOptions } from './frame';
import './charts.css';

export type Renderer<D, O extends ChartOptions> = (host: HTMLElement, data: D, opts?: O) => ChartInstance<D>;

/** Turn any chart engine into a React component: <LineChart data={…} options={{ title: '…' }} />. */
export function makeChart<D, O extends ChartOptions>(render: Renderer<D, O>, displayName: string) {
  function Chart({ data, options, className }: { data: D; options?: O; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const inst = useRef<ChartInstance<D> | null>(null);
    const key = JSON.stringify(options ?? {});
    useEffect(() => {
      inst.current = render(ref.current!, data, options);
      return () => { inst.current?.destroy(); inst.current = null; };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    useEffect(() => { inst.current?.update(data); }, [data]);
    return <div ref={ref} className={className} />;
  }
  Chart.displayName = displayName;
  return Chart;
}
