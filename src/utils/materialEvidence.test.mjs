import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFinalDecision, materialFieldStyle } from './materialEvidence.js';

test('only existing final decision states are usable references', () => {
  for (const workflow_state of ['Approved', 'Halal', 'Rejected', 'Haram', ' approved ']) assert.equal(isFinalDecision({ workflow_state }), true);
  for (const workflow_state of ['Draft', 'Submitted', 'Submitted to SB', 'Hold', 'Returned', 'Doubtful', 'Delisted', 'Under Review', '']) assert.equal(isFinalDecision({ workflow_state }), false);
});

test('field colors preserve the actual E-NUMBERS Client Script rules', () => {
  assert.equal(materialFieldStyle('Sugar', { status: ' HALAL ' }).backgroundColor, '#d4edda');
  assert.equal(materialFieldStyle('Material', { status: 'Haram' }).backgroundColor, '#f8d7da');
  assert.equal(materialFieldStyle('Material', { status: 'Doubtful' }).backgroundColor, '#fff3cd');
  assert.equal(materialFieldStyle('Unknown material', null).backgroundColor, '#ffeeba');
  assert.deepEqual(materialFieldStyle(' ', { status: 'Halal' }), {});
});

test('a previous approval does not turn an unmatched E-NUMBER field green', () => {
  const previous = { workflow_state: 'Approved' };
  assert.equal(isFinalDecision(previous), true);
  assert.equal(materialFieldStyle('Material', previous).backgroundColor, '#ffeeba');
});
