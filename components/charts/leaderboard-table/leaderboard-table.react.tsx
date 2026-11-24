import { makeChart } from '../core/react';
import { render } from './leaderboard-table';

/** React wrapper: <LeaderboardTable data={…} options={{ title: '…' }} />. */
export const LeaderboardTable = makeChart(render, 'LeaderboardTable');
