import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseAimTarget, steerAim, pushGuide, wrapAngle} from '../last-round-controls.mjs';
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
test('auto aim acquires what is in view and never pulls through walls or toward an inactive fan', () => {
  const p = {x: 0, z: 6}, forward = {x: 0, z: -1};
  const side = {...fan, id: 'side', x: 5, z: 3};
  assert.equal(chooseAimTarget(p, forward, [side, fan]), fan);
  assert.equal(chooseAimTarget(p, forward, [fan], () => false), null);
  assert.equal(chooseAimTarget(p, forward, [{...fan, active: false}]), null);
  assert.equal(chooseAimTarget(p, forward, [side]), null);
  assert.equal(chooseAimTarget(p, forward, [side, fan], () => true, 'side'), side);
  assert.equal(chooseAimTarget(p, {x: 0, z: 1}, [fan], () => true, 'fan'), null);
});
test('manual look immediately overrides auto aim, and smooth turning crosses the angle seam correctly', () => {
  const look = {yaw: 179, pitch: 0}, p = {x: -.05, y: 1.68, z: -5};
  assert.equal(steerAim(look, p, fan, 1 / 60, true), null);
  assert.equal(steerAim(look, p, null, 1 / 60), null);
  const result = steerAim(look, p, fan, 1 / 60);
  assert.ok(result.yaw > 179 && result.yaw - 179 < 2.5);
  assert.ok(result.pitch < 0); assert.equal(wrapAngle(-359), 1);
});
test('auto aim keeps a fan centered while the player circles it from every direction', () => {
  for (let degree = -180; degree < 180; degree += 30) {
    const rad = degree * Math.PI / 180, p = {x: Math.sin(rad) * 4, y: 1.68, z: Math.cos(rad) * 4};
    let look = {yaw: degree - 25, pitch: 0};
    for (let i = 0; i < 90; i++) look = steerAim(look, p, fan, 1 / 60);
    assert.ok(Math.abs(wrapAngle(look.yaw - degree)) < .001);
    assert.ok(Math.abs(look.pitch - Math.atan2(1.3 - p.y, 4) * 180 / Math.PI) < .001);
  }
});
