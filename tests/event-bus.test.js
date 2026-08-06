import test from 'node:test';
import assert from 'node:assert/strict';
import { EventBus } from '../src/core/event-bus.js';

const TYPES = ['alpha', 'beta'];

test('event bus emits ordered immutable events and bounded history', () => {
  const bus = new EventBus({ allowedTypes: TYPES, historyLimit: 2 });
  const received = [];
  bus.on('alpha', (event) => received.push(event));

  const first = bus.emit('alpha', { value: 1 });
  const second = bus.emit('beta', { value: 2 });
  const third = bus.emit('alpha', { value: 3 });

  assert.equal(first.sequence, 1);
  assert.equal(second.sequence, 2);
  assert.equal(third.sequence, 3);
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.payload));
  assert.deepEqual(received.map((event) => event.sequence), [1, 3]);
  assert.deepEqual(bus.getHistory().map((event) => event.sequence), [2, 3]);
});

test('once, off, and listener counts behave deterministically', () => {
  const bus = new EventBus({ allowedTypes: TYPES });
  let persistentCalls = 0;
  let onceCalls = 0;
  const persistent = () => { persistentCalls += 1; };

  const unsubscribe = bus.on('alpha', persistent);
  bus.once('alpha', () => { onceCalls += 1; });
  assert.equal(bus.listenerCount('alpha'), 2);

  bus.emit('alpha');
  bus.emit('alpha');
  assert.equal(persistentCalls, 2);
  assert.equal(onceCalls, 1);
  assert.equal(bus.listenerCount('alpha'), 1);

  assert.equal(unsubscribe(), true);
  assert.equal(bus.listenerCount('alpha'), 0);
});

test('listener failures are isolated from later listeners and emit callers', () => {
  const failures = [];
  const calls = [];
  const bus = new EventBus({
    allowedTypes: TYPES,
    onListenerError: (error, event) => failures.push({ message: error.message, type: event.type }),
  });

  bus.on('alpha', () => { throw new Error('listener failed'); });
  bus.on('alpha', () => calls.push('second-listener-ran'));

  assert.doesNotThrow(() => bus.emit('alpha', { safe: true }));
  assert.deepEqual(calls, ['second-listener-ran']);
  assert.deepEqual(failures, [{ message: 'listener failed', type: 'alpha' }]);
});

test('event bus rejects unknown types and invalid payloads', () => {
  const bus = new EventBus({ allowedTypes: TYPES });
  assert.throws(() => bus.on('unknown', () => {}), /not allowed/);
  assert.throws(() => bus.emit('unknown'), /not allowed/);
  assert.throws(() => bus.emit('alpha', null), /payload must be an object/);
  assert.throws(() => bus.emit('alpha', []), /payload must be an object/);
});
