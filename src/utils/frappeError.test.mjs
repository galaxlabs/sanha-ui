import test from 'node:test';
import assert from 'node:assert/strict';
import { frappeErrorMessage } from './frappeError.js';
test('provider validation explains the model mismatch', () => {
  const body = { exc_type: 'ValidationError', _server_messages: JSON.stringify([JSON.stringify({ message: '<strong>Choose a compatible model</strong>' })]) };
  assert.equal(frappeErrorMessage(body, 417), 'Choose a compatible model');
});
test('standard message and malformed fallback remain usable', () => {
  assert.equal(frappeErrorMessage({ message: 'Not permitted' }, 403), 'Not permitted');
  assert.equal(frappeErrorMessage({ exc_type: 'ValidationError', _server_messages: 'invalid' }, 417), 'ValidationError');
});
