export const wrapAngle = a => ((a + 180) % 360 + 360) % 360 - 180;

// Auto aim changes the camera only. Push direction remains the actual shot ray.
export function steerAim(look, player, target, dt, manual = false) {
  if (manual || !target || !(dt > 0)) return null;
  const d = Math.hypot(target.x - player.x, target.z - player.z);
  if (d < .6 || d > 24) return null;
  const yaw = Math.atan2(player.x - target.x, player.z - target.z) * 180 / Math.PI;
  const pitch = Math.atan2((target.kind === 'boss' ? 1.8 : 1.3) - (player.y ?? 1.68), d) * 180 / Math.PI;
  const smooth = 1 - Math.exp(-dt * 10), limit = dt * 150;
  const turn = Math.max(-limit, Math.min(limit, wrapAngle(yaw - look.yaw) * smooth));
  return {yaw: look.yaw + turn, pitch: look.pitch + (pitch - look.pitch) * smooth};
}

export function chooseAimTarget(player, forward, actors, visible = () => true, lockedId = null) {
  const candidates = actors.filter(a => a.active && a.kind !== 'bin').map(a => {
    const dx = a.x - player.x, dz = a.z - player.z, distance = Math.hypot(dx, dz);
    const dot = (dx * forward.x + dz * forward.z) / Math.max(.001, distance * Math.hypot(forward.x, forward.z));
    return {a, distance, dot};
  }).filter(v => v.distance > .6 && v.distance < 24 && visible(player.x, player.z, v.a.x, v.a.z));
  const locked = candidates.find(v => v.a.id === lockedId && v.dot > -.2);
  if (locked) return locked.a;
  return candidates.filter(v => v.dot > Math.cos(35 * Math.PI / 180)).sort((a, b) => b.dot - a.dot || a.distance - b.distance)[0]?.a || null;
}

export function pushGuide(player, actor, goal, blocked = () => false) {
  if (!actor) return null;
  const distance = Math.hypot(goal.x - actor.x, goal.z - actor.z) || 1;
  const gx = (goal.x - actor.x) / distance, gz = (goal.z - actor.z) / distance;
  const playerDistance = Math.hypot(actor.x - player.x, actor.z - player.z) || .001;
  const px = (actor.x - player.x) / playerDistance, pz = (actor.z - player.z) / playerDistance;
  const tolerance = Math.max(.5, goal.radius - (actor.radius ?? .65) * .2 - .3);
  const pointsIntoGoal = (dx, dz) => dx * gx + dz * gz > 0 && Math.abs(gx * dz - gz * dx) * distance < tolerance;
  let stance = null;
  for (const radius of [3.4, 2.5, 1.7]) {
    for (const degrees of [0, 15, -15, 30, -30, 45, -45]) {
      const a = degrees * Math.PI / 180, dx = -gx * Math.cos(a) + gz * Math.sin(a), dz = -gx * Math.sin(a) - gz * Math.cos(a);
      const x = actor.x + dx * radius, z = actor.z + dz * radius;
      if (pointsIntoGoal(-dx, -dz) && !blocked(x, z)) {stance = {x, z}; break;}
    }
    if (stance) break;
  }
  const alignment = px * gx + pz * gz;
  return {stance, alignment, good: pointsIntoGoal(px, pz) && playerDistance > 1.05 && playerDistance < 15,
    pushX: px, pushZ: pz, playerDistance};
}
