import assert from 'node:assert/strict';
import { deployOnly, isFunctionsRuntime } from '../scripts/deploy-scope.mjs';

assert.equal(isFunctionsRuntime('functions/og.js'), true);
assert.equal(isFunctionsRuntime('functions/index.js'), true);
assert.equal(isFunctionsRuntime('functions/package.json'), true);
assert.equal(isFunctionsRuntime('functions/package-lock.json'), true);
assert.equal(isFunctionsRuntime('functions/test-link-preview.mjs'), false);
assert.equal(isFunctionsRuntime('functions/test-deploy-scope.mjs'), false);
assert.equal(isFunctionsRuntime('app.js'), false);
assert.equal(isFunctionsRuntime('functions/.env.example'), false);

assert.deepEqual(deployOnly(['functions/og.js'], false), ['hosting', 'functions']);
assert.deepEqual(deployOnly(['functions/index.js'], false), ['hosting', 'functions']);
assert.deepEqual(deployOnly(['functions/package-lock.json'], false), ['hosting', 'functions']);
assert.deepEqual(deployOnly(['functions/test-link-preview.mjs'], false), ['hosting']);
assert.deepEqual(deployOnly(['functions/test-og.mjs', 'app.js'], false), ['hosting']);
assert.deepEqual(deployOnly(['app.js', 'sw.js'], false), ['hosting']);
assert.deepEqual(deployOnly(['database.rules.json'], false), ['hosting', 'database']);
assert.deepEqual(deployOnly(['storage.rules'], false), ['hosting', 'storage']);
assert.deepEqual(deployOnly(['functions/og.js', 'database.rules.json'], false), ['hosting', 'functions', 'database']);
assert.deepEqual(deployOnly([], true), ['hosting', 'functions', 'database', 'storage']);
assert.deepEqual(deployOnly(['functions/test-link-preview.mjs'], true), ['hosting', 'functions', 'database', 'storage']);

console.log('PASS: functions runtime files deploy functions; tests alone do not.');
