import { makeChart } from '../core/react';
import { render } from './cohort-grid';

/** React wrapper: <CohortGrid data={…} options={{ title: '…' }} />. */
export const CohortGrid = makeChart(render, 'CohortGrid');
