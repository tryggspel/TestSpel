// Engine-independent rules for the existing Karlstad City scene.
export const RULES = Object.freeze({version: '1.0', duration: 90, chargeCost: 40, chargeSeconds: .38, cooldown: .38});
export function normalizeSeed(value) {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 && n <= 999999 ? n : 280926;
}
export function layoutFor(seed, origin) {
  let state = normalizeSeed(seed);
  const random = () => {state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296;};
  // Keep the whole court north of the existing south-block collision box.
  const cx = origin.x - 16, cz = origin.z - 3;
  return {
    bounds: {minX: cx - 12, maxX: cx + 12, minZ: cz - 13, maxZ: cz + 13},
    goal: {x: cx, z: cz - 9, radius: 4.1},
    spawn: {x: cx, z: cz + 11},
    guard: {x: cx + 11, z: cz + 6},
    chargers: [{x: cx - 9, z: cz + 7}, {x: cx + 9, z: cz - 5}],
    actors: [
      {id: 'fredde', name: 'Förlängnings-Fredde', x: cx - 5, z: cz - 1},
      {id: 'valle', name: 'VAR-Valle', x: cx + (random() - .5) * 2, z: cz - 3},
      {id: 'bosse', name: 'Borta-Bosse', x: cx + 5, z: cz + 1},
      {id: 'bin', name: 'Soptunnan', x: cx + 5, z: cz + 5, kind: 'bin'},
      {id: 'captain', name: 'Kapten Övertid', x: cx, z: cz + 5, kind: 'boss'}
    ].map((a, i) => ({...a, x: a.x + (random() - .5) * .7, phase: i * 1.7}))
  };
}

export class LastRound {
  constructor(layout, blocked = () => false) {
    this.layout = layout;
    this.blocked = blocked;
    this.reset();
  }
  reset() {
    this.phase = 'ready'; this.remaining = RULES.duration; this.elapsed = 0;
    this.score = 0; this.energy = 60; this.shots = 0; this.hitShots = 0;
    this.captured = 0; this.bestChain = 0; this.cooldown = 0; this.events = [];
    this.chains = new Map(); this.chargerTimes = [0, 0]; this.contactCooldown = 0;
    this.actors = this.layout.actors.map(a => ({...a, kind: a.kind || 'fan', radius: a.kind === 'boss' ? .95 : .65,
      mass: a.kind === 'boss' ? 1.6 : a.kind === 'bin' ? .85 : 1,
      active: a.kind !== 'boss', captured: false, vx: 0, vz: 0, shot: 0, touchTime: -100}));
  }
  start() {this.reset(); this.phase = 'playing';}
  pause() {if (this.phase === 'playing') this.phase = 'paused';}
  resume() {if (this.phase === 'paused') this.phase = 'playing';}
  drainEvents() {const events = this.events; this.events = []; return events;}
  visible(x, z, tx, tz) {
    const n = Math.ceil(Math.hypot(tx - x, tz - z) / .45);
    for (let i = 1; i < n; i++) if (this.blocked(x + (tx - x) * i / n, z + (tz - z) * i / n)) return false;
    return true;
  }
  shoot({x, z, y = 1.68, dx, dz, dy = 0, held = 0, assist = false}) {
    if (this.phase !== 'playing' || this.cooldown > 0) return null;
    const horizontal = Math.hypot(dx, dz);
    if (horizontal < .05) return null;
    const nx = dx / horizontal, nz = dz / horizontal;
    const charged = held >= RULES.chargeSeconds && this.energy >= RULES.chargeCost;
    if (charged) this.energy -= RULES.chargeCost;
    this.cooldown = RULES.cooldown; this.shots++;
    const shot = this.shots;
    this.chains.set(shot, new Set());
    const range = charged ? 18 : 15;
    const candidates = this.actors.filter(a => {
      if (!a.active) return false;
      const ax = a.x - x, az = a.z - z, along = ax * nx + az * nz;
      const side = Math.abs(ax * nz - az * nx), hitY = y + dy * along / horizontal;
      return along > .1 && along < range && side < a.radius + (assist ? .32 + along * .025 : .18)
        && hitY > -.2 && hitY < (a.kind === 'boss' ? 3.5 : a.kind === 'bin' ? 1.65 : 2.55)
        && this.visible(x, z, a.x, a.z);
    }).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
    const target = candidates[0];
    if (target) {
      this.hitShots++;
      this.impulse(target, nx, nz, charged ? 25 : 17, shot);
      this.energy = Math.min(100, this.energy + 5);
    }
    this.events.push({type: 'shot', charged, hit: !!target, name: target?.name});
    return {charged, target: target?.id || null};
  }
  impulse(actor, dx, dz, strength, shot) {
    const chain = this.chains.get(shot);
    if (!chain || chain.has(actor.id)) return;
    chain.add(actor.id); actor.shot = shot; actor.touchTime = this.elapsed;
    actor.vx = dx * strength / actor.mass; actor.vz = dz * strength / actor.mass;
    this.score += actor.kind === 'bin' ? 10 : 25;
    if (chain.size > 1) {
      this.score += 125 * (chain.size - 1);
      this.events.push({type: 'chain', count: chain.size});
    }
    this.bestChain = Math.max(this.bestChain, chain.size);
  }
  step(dt, player) {
    if (this.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    const total = Math.min(dt, this.remaining);
    let left = total;
    while (left > .00001 && this.phase === 'playing') {
      const h = Math.min(left, 1 / 60); left -= h;
      this.elapsed += h; this.remaining = Math.max(0, RULES.duration - this.elapsed);
      this.cooldown = Math.max(0, this.cooldown - h);
      this.contactCooldown = Math.max(0, this.contactCooldown - h);
      this.chargerTimes = this.chargerTimes.map(t => Math.max(0, t - h));
      for (const a of this.actors) {
        if (!a.active) continue;
        const speed = Math.hypot(a.vx, a.vz);
        // Shuffling is deliberately small; hits never reset an actor to its spawn.
        const shuffle = speed < .12 && a.kind !== 'bin' ? Math.sin(this.elapsed * 1.1 + a.phase) * .38 : 0;
        const nx = a.x + (a.vx + shuffle) * h, nz = a.z + a.vz * h;
        const b = this.layout.bounds;
        if (nx > b.minX + a.radius && nx < b.maxX - a.radius && !this.blocked(nx, a.z)) a.x = nx;
        else a.vx *= -.4;
        if (nz > b.minZ + a.radius && nz < b.maxZ - a.radius && !this.blocked(a.x, nz)) a.z = nz;
        else a.vz *= -.4;
        const drag = Math.exp(-2.15 * h); a.vx *= drag; a.vz *= drag;
        const goal = this.layout.goal;
        if (a.kind !== 'bin' && a.shot && Math.hypot(a.x - goal.x, a.z - goal.z) < goal.radius - a.radius * .2) {
          a.active = false; a.captured = true; this.captured++;
          this.score += a.kind === 'boss' ? 700 : 300;
          this.events.push({type: 'capture', name: a.name, boss: a.kind === 'boss'});
          if (this.captured === 3) {
            const boss = this.actors.find(e => e.kind === 'boss'); boss.active = true;
            this.events.push({type: 'boss'});
          } else if (this.captured === 4) this.finish(true);
        }
        if (player && a.kind !== 'bin' && a.active && this.contactCooldown === 0 && Math.hypot(player.x - a.x, player.z - a.z) < a.radius + .5) {
          this.contactCooldown = 2; this.energy = Math.max(0, this.energy - 8);
          this.score = Math.max(0, this.score - 15); this.events.push({type: 'bump'});
        }
      }
      for (let i = 0; i < this.actors.length; i++) {
        const a = this.actors[i]; if (!a.active) continue;
        for (let j = i + 1; j < this.actors.length; j++) {
          const b = this.actors[j]; if (!b.active) continue;
          const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
          if (d >= a.radius + b.radius || d < .001) continue;
          const as = Math.hypot(a.vx, a.vz), bs = Math.hypot(b.vx, b.vz);
          if (as > 2.4 && a.shot) this.impulse(b, dx / d, dz / d, as * .93, a.shot);
          else if (bs > 2.4 && b.shot) this.impulse(a, -dx / d, -dz / d, bs * .93, b.shot);
        }
      }
      if (player) this.layout.chargers.forEach((c, i) => {
        if (this.chargerTimes[i] === 0 && Math.hypot(player.x - c.x, player.z - c.z) < 1.3 && this.energy < 100) {
          this.energy = Math.min(100, this.energy + 35); this.chargerTimes[i] = 12;
          this.events.push({type: 'energy'});
        }
      });
    }
    // Old chains cannot collide again once all their actors have stopped.
    for (const [shot] of this.chains) if (!this.actors.some(a => a.shot === shot && Math.hypot(a.vx, a.vz) > .2)) this.chains.delete(shot);
    if (this.phase === 'playing' && this.remaining < .0001) this.finish(false);
  }
  finish(won) {
    if (this.phase !== 'playing') return;
    this.phase = won ? 'won' : 'lost';
    this.timeBonus = won ? Math.ceil(this.remaining) * 12 : 0;
    this.accuracy = this.shots ? Math.round(this.hitShots / this.shots * 100) : 0;
    this.score += this.timeBonus + (won ? this.accuracy * 2 : 0);
    this.events.push({type: 'finish', won});
  }
}
