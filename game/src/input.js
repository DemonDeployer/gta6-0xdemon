// Neon Bay — keyboard and mouse input.
// Holds the live key set plus one-shot queues (pressed keys, mouse clicks)
// that the game consumes once per frame, so a single tap never fires twice.
export function createInput(canvas) {
  const input = {
    keys: new Set(),       // currently held key codes, lower-cased
    pressed: [],           // key codes tapped since last consume
    mouse: { x: 0, y: 0, down: false, clicked: false, worldX: 0, worldY: 0 },
    anyKey: false,         // set on any keydown (used to unlock audio)
  };

  const norm = (e) => e.key.toLowerCase();

  window.addEventListener('keydown', (e) => {
    const k = norm(e);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (!e.repeat) input.pressed.push(k);
    input.keys.add(k);
    input.anyKey = true;
  });
  window.addEventListener('keyup', (e) => input.keys.delete(norm(e)));
  window.addEventListener('blur', () => input.keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = e.clientX - r.left;
    input.mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { input.mouse.down = true; input.mouse.clicked = true; }
    input.anyKey = true;
  });
  window.addEventListener('mouseup', () => { input.mouse.down = false; });

  // Touch fallback: one finger drag steers/walks, tap = interact.
  let touchStart = null;
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
    input.anyKey = true;
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!touchStart) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
    input.keys.delete('w'); input.keys.delete('a'); input.keys.delete('s'); input.keys.delete('d');
    if (dy < -24) input.keys.add('w');
    if (dy > 24) input.keys.add('s');
    if (dx < -24) input.keys.add('a');
    if (dx > 24) input.keys.add('d');
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    touchStart = null;
    for (const k of ['w', 'a', 's', 'd']) input.keys.delete(k);
    input.pressed.push('e');
  }, { passive: false });

  return input;
}

export function isDown(input, ...keys) {
  return keys.some((k) => input.keys.has(k));
}

// True once for a key tapped since the last frame; consumes it.
export function wasPressed(input, key) {
  const i = input.pressed.indexOf(key);
  if (i === -1) return false;
  input.pressed.splice(i, 1);
  return true;
}

// True once for a mouse click since the last frame; consumes it.
export function wasClicked(input) {
  if (!input.mouse.clicked) return false;
  input.mouse.clicked = false;
  return true;
}

// Clear the one-shot queues at the end of a frame.
export function endFrame(input) {
  input.pressed.length = 0;
  input.mouse.clicked = false;
}
