import test from 'node:test';
import assert from 'node:assert/strict';
import {LastRound, layoutFor, normalizeSeed, RULES} from '../last-round-rules.mjs';
const origin = {x: 47.65, z: 28.19};
const create = (blocked) => new LastRound(layoutFor(280926, origin), blocked);
const advance = (g, seconds, hz = 60) => {for (let i = 0; i < seconds * hz; i++) g.step(1 / hz);};
function aimAt(g, a, held = 0) {
  const goal = g.layout.goal, d = Math.hypot(a.x - goal.x, a.z - goal.z);
  const dx = (goal.x - a.x) / d, dz = (goal.z - a.z) / d;
  return g.shoot({x: a.x - dx * 3.5, z: a.z - dz * 3.5, dx, dz, held});
}
test('share seeds are deterministic and reject malformed or unbounded inputs', () => {
  assert.deepEqual(layoutFor(42, origin), layoutFor('42', origin));
  assert.notDeepEqual(layoutFor(42, origin), layoutFor(43, origin));
  for (const x of [-1, NaN, Infinity, 'hello', 1000000, 4.1]) assert.equal(normalizeSeed(x), 280926);
});
test('pause freezes timer, actors and cooldown; resuming continues the same round', () => {
  const g = create(); g.start(); aimAt(g, g.actors[0]); advance(g, .5);
  g.pause(); const snapshot = JSON.stringify(g); g.step(60); assert.equal(JSON.stringify(g), snapshot);
  assert.equal(aimAt(g, g.actors[0]), null); g.resume(); g.step(1); assert.ok(g.remaining < 89);
});
test('basic shots work with zero energy; charged shots pay exactly once and cooldown blocks spam', () => {
  const g = create(); g.start(); g.energy = 0;
  assert.equal(aimAt(g, g.actors[0], 1).charged, false);
  const shots = g.shots; assert.equal(aimAt(g, g.actors[0]), null); assert.equal(g.shots, shots);
  advance(g, .5); g.energy = 80;
  assert.equal(aimAt(g, g.actors[1], 1).charged, true); assert.equal(g.energy, 45);
});
test('shots cannot hit through a building or at the wrong elevation', () => {
  const g = create(() => true); g.start(); assert.equal(aimAt(g, g.actors[0]).target, null);
  const h = create(); h.start(); const a = h.actors[0];
  assert.equal(h.shoot({x: a.x, z: a.z + 3, y: 1.68, dx: 0, dz: -.2, dy: .98}).target, null);
});
test('one impulse can chain through a bin into a fan without repeatedly scoring the same contact', () => {
  const g = create(); g.start(); g.actors.forEach(a => a.active = false);
  const bin = g.actors.find(a => a.kind === 'bin'), fan = g.actors[0];
  Object.assign(bin, {active: true, x: 30, z: 34}); Object.assign(fan, {active: true, x: 30, z: 31});
  g.shoot({x: 30, z: 38, dx: 0, dz: -1, dy: -.12, held: 1}); advance(g, 1.5);
  assert.ok(g.bestChain >= 2); assert.ok(fan.shot > 0);
  const chainEvents = g.drainEvents().filter(e => e.type === 'chain'); assert.equal(chainEvents.length, 1);
});
test('all three fans activate the boss; the complete round is winnable with actual shots', () => {
  const g = create(); g.start(); let attempts = 0;
  while (g.phase === 'playing' && attempts++ < 100) {
    const a = g.actors.find(a => a.active && a.kind !== 'bin');
    aimAt(g, a, g.energy >= 40 ? .5 : 0); advance(g, .65);
  }
  assert.equal(g.phase, 'won'); assert.equal(g.captured, 4); assert.ok(g.score > 1000);
  assert.ok(g.remaining > 0); assert.ok(g.drainEvents().some(e => e.type === 'boss'));
});
test('timeout ends once, a retry resets all scoring and actors, and no shot can change a finished result', () => {
  const g = create(); g.start(); g.step(90); assert.equal(g.phase, 'lost');
  const score = g.score; assert.equal(aimAt(g, g.actors[0]), null); g.step(90); assert.equal(g.score, score);
  assert.equal(g.drainEvents().filter(e => e.type === 'finish').length, 1);
  g.start(); assert.equal(g.remaining, RULES.duration); assert.equal(g.score, 0); assert.equal(g.captured, 0);
  assert.equal(g.actors.find(a => a.kind === 'boss').active, false);
});
test('30 and 120 fps give the same time budget and nearly identical travel distance', () => {
  const a = create(), b = create(); a.start(); b.start(); aimAt(a, a.actors[0]); aimAt(b, b.actors[0]);
  advance(a, 2, 30); advance(b, 2, 120);
  assert.ok(Math.abs(a.remaining - b.remaining) < .0001);
  assert.ok(Math.hypot(a.actors[0].x - b.actors[0].x, a.actors[0].z - b.actors[0].z) < .15);
});
