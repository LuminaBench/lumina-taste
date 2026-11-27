// A chart's title says what it shows, from the numbers themselves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trendFinding, shareFinding } from '../../engine/compose/finding.mjs';

test('a series says its change, its peak or that it held steady', () => {
  assert.equal(trendFinding('Monthly revenue', [40, 41, 43, 42, 44, 46, 47, 49, 48, 51, 52, 54]), 'Monthly revenue up 35% in 12 weeks');
  assert.equal(trendFinding('Accounts', [10, 12, 15, 19, 22, 20, 18, 16, 15, 15, 14, 14]), 'Accounts peaked in week 5, then eased');
  assert.equal(trendFinding('Orders', [50, 51, 50, 49, 50, 51]), 'Orders held steady over 6 weeks');
  assert.equal(trendFinding('Churn', [0.021, 0.02, 0.019, 0.018, 0.018, 0.017], { rate: true }), 'Churn down 0.4 points in 6 weeks');
  assert.equal(trendFinding('Visits', [5, 6]), 'Visits', 'too short to say anything');
});

test('a breakdown says which part leads', () => {
  assert.equal(shareFinding('accounts', [{ label: 'Active', value: 9 }, { label: 'Paused', value: 5 }, { label: 'Archived', value: 2 }]), 'Most accounts are active (9 of 16)');
  assert.equal(shareFinding('orders', [{ label: 'Web', value: 6 }, { label: 'Phone', value: 3 }, { label: 'Shop', value: 3 }]), 'Web leads: 50% of orders');
  assert.equal(shareFinding('tickets', [{ label: 'Billing', value: 5 }, { label: 'Login', value: 4 }, { label: 'Other', value: 3 }]), 'Billing and login lead, close together');
  assert.equal(shareFinding('things', [{ label: 'One', value: 3 }]), null);
});
