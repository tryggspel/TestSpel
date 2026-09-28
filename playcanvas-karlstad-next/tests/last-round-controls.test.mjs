import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseAimTarget, pushGuide} from '../last-round-controls.mjs';
const fan = {id: 'fan', kind: 'fan', x: 0, z: 0, active: true, radius: .65};
const goal = {x: 0, z: -10, radius: 4.1};
test('the stance stays behind a fan relative to the goal, regardless of the player viewpoint', () => {
  for (let degree = 0; degree < 360; degree += 15) {
    const rad = degree * Math.PI / 180, p = {x: Math.sin(rad) * 4, z: Math.cos(rad) * 4};
    const guide = pushGuide(p, fan, goal);
    assert.deepEqual(guide.stance, {x: 0, z: 3.4});
    assert.equal(pushGuide(guide.stance, fan, goal).good, true);
    assert.ok(Math.abs(Math.hypot(guide.pushX, guide.pushZ) - 1) < 1e-8);
  }
  assert.equal(pushGuide({x: 0, z: -4}, fan, goal).good, false);
  assert.equal(pushGuide({x: 4, z: 0}, fan, goal).good, false);
});
test('a green direction really intersects the goal; distance and obstacle fallbacks are respected', () => {
  assert.equal(pushGuide({x: 0, z: 20}, fan, goal).good, false);
  assert.equal(pushGuide({x: 0, z: .3}, fan, goal).good, false);
  const distantGoal = {...goal, z: -20};
  assert.equal(pushGuide({x: 1.3, z: 4}, fan, distantGoal).good, false);
  const blocked = (x, z) => Math.abs(x) < .3 && z > 3;
  const alternate = pushGuide({x: 5, z: 0}, fan, goal, blocked);
  assert.ok(alternate.stance); assert.equal(blocked(alternate.stance.x, alternate.stance.z), false);
  assert.equal(pushGuide(alternate.stance, fan, goal).good, true);
  assert.equal(pushGuide({x: 0, z: 5}, fan, goal, () => true).stance, null);
});
test('the target marker selects what is in view and never pulls through walls or toward an inactive fan', () => {
  const p = {x: 0, z: 6}, forward = {x: 0, z: -1};
  const side = {...fan, id: 'side', x: 5, z: 3};
  assert.equal(chooseAimTarget(p, forward, [side, fan]), fan);
  assert.equal(chooseAimTarget(p, forward, [fan], () => false), null);
  assert.equal(chooseAimTarget(p, forward, [{...fan, active: false}]), null);
  assert.equal(chooseAimTarget(p, forward, [side]), null);
  assert.equal(chooseAimTarget(p, forward, [side, fan], () => true, 'side'), side);
  assert.equal(chooseAimTarget(p, {x: 0, z: 1}, [fan], () => true, 'fan'), null);
});
