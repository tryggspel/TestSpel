export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const wrapYaw = n => ((n + 180) % 360 + 360) % 360 - 180;

// Relative touch look, independent of movement, weapons and targets.
export class FpsLook {
  constructor({sensitivity = 1, mode = 'drag', span = 390} = {}) {
    this.sensitivity = sensitivity; this.mode = mode; this.span = span; this.reset();
  }
  reset() {this.pointer = null; this.dx = this.dy = this.sx = this.sy = 0;}
  begin(id, x, y) {
    if (this.pointer !== null) return false;
    this.pointer = id; this.ox = this.x = x; this.oy = this.y = y; return true;
  }
  move(id, x, y) {
    if (id !== this.pointer) return;
    if (this.mode === 'stick') {
      const axis = d => {const a = Math.min(1, Math.abs(d) / 56); return Math.sign(d) * Math.max(0, (a - .1) / .9);};
      this.sx = axis(x - this.ox); this.sy = axis(y - this.oy);
    } else {
      const scale = 300 / Math.max(280, this.span);
      this.dx += (x - this.x) * scale; this.dy += (y - this.y) * scale * .65;
    }
    this.x = x; this.y = y;
  }
  end(id) {if (id === this.pointer) {this.pointer = null; this.sx = this.sy = 0;}}
  consume(dt) {
    const s = clamp(this.sensitivity, .45, 1.8);
    const result = {x: (this.dx + this.sx * 225 * dt) * s, y: (this.dy + this.sy * 115 * dt) * s};
    this.dx = this.dy = 0; return result;
  }
}
