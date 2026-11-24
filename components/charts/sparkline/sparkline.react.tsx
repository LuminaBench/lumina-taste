import { useMemo } from 'react';
import { sparkSvg, type SparkOptions } from './sparkline';
import '../core/charts.css';

/** Inline sparkline. Renders static SVG markup, so it is cheap enough for every table row. */
export function Sparkline({ values, ...opts }: { values: number[] } & SparkOptions) {
  const html = useMemo(() => sparkSvg(values, opts).outerHTML, [values, JSON.stringify(opts)]);
  // Generated from numbers only, never from user strings.
  return <span className="lt-spark-host" dangerouslySetInnerHTML={{ __html: html }} />;
}
