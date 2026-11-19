// Neon Bay — keyboard + mouse input. Tracks held keys, edge presses, mouse pos.
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set(); // edge-triggered, cleared each frame by endFrame()
    this.mouse = { x: 0, y: 0, down: false };
    this._onKeyDown = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) this.pressed.add(k);
      this.keys.add(k);
    };
    this._onKeyUp = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.keys.delete(k);
    };
    this._onMouse = (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; };
    this._onMouseDown = (e) => { this.mouse.down = true; this._onMouse(e); };
    this._onMouseUp = () => { this.mouse.down = false; };
  }
  attach() {
    addEventListener('keydown', this._onKeyDown);
    addEventListener('keyup', this._onKeyUp);
    addEventListener('mousemove', this._onMouse);
    addEventListener('mousedown', this._onMouseDown);
    addEventListener('mouseup', this._onMouseUp);
  }
  held(...names) { return names.some((n) => this.keys.has(n)); }
  wasPressed(...names) { return names.some((n) => this.pressed.has(n)); }
  endFrame() { this.pressed.clear(); }
  // Steering / throttle as -1..1, from WASD or arrows.
  steer() { return (this.held('a', 'ArrowLeft') ? -1 : 0) + (this.held('d', 'ArrowRight') ? 1 : 0); }
  throttle() { return (this.held('w', 'ArrowUp') ? 1 : 0) + (this.held('s', 'ArrowDown') ? -1 : 0); }
  moveX() { return this.steer(); }
  moveY() { return (this.held('w', 'ArrowUp') ? -1 : 0) + (this.held('s', 'ArrowDown') ? 1 : 0); }
}
