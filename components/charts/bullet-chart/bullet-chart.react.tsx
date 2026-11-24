import { makeChart } from '../core/react';
import { render } from './bullet-chart';

/** React wrapper: <BulletChart data={…} options={{ title: '…' }} />. */
export const BulletChart = makeChart(render, 'BulletChart');
