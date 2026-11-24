import { makeChart } from '../core/react';
import { render } from './annotated-line-chart';

/** React wrapper: <AnnotatedLineChart data={…} options={{ annotations: [{ at: '2026-10-01', label: 'v4.0' }] }} />. */
export const AnnotatedLineChart = makeChart(render, 'AnnotatedLineChart');
