// Keyboard and mouse state in canvas pixel coordinates, with one-shot key edges per frame.
const GAME_KEYS = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space']);
export function createInput(canvas) {
  const keys = new Set();
  const pendingPresses = new Set();
  let framePresses = new Set();
  let pendingClick = false;
  let frameClick = false;
  const mouse = { x: 0, y: 0, down: false };
  Object.defineProperty(mouse, 'clicked', { enumerable: true, get() { const clicked = frameClick; frameClick = false; return clicked; } });
  const point = (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  };
  const onDown = (event) => { if (!keys.has(event.code)) pendingPresses.add(event.code); keys.add(event.code); if (GAME_KEYS.has(event.code)) event.preventDefault(); };
  const onUp = (event) => { keys.delete(event.code); if (GAME_KEYS.has(event.code)) event.preventDefault(); };
  const onBlur = () => { keys.clear(); pendingPresses.clear(); framePresses.clear(); frameClick = false; mouse.down = false; };
  const onPointerDown = (event) => { point(event); mouse.down = true; pendingClick = true; };
  const onPointerMove = (event) => point(event);
  const onPointerUp = () => { mouse.down = false; };
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  return {
    keys, mouse,
    beginFrame() { framePresses = new Set(pendingPresses); pendingPresses.clear(); frameClick = pendingClick; pendingClick = false; },
    down(code) { return keys.has(code); },
    pressed(code) { return this.wasPressed(code); },
    wasPressed(code) { if (!framePresses.has(code)) return false; framePresses.delete(code); return true; },
    axisX() { return (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0); },
    axisY() { return (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0); },
    destroy() {
      window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur); window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerdown', onPointerDown); canvas.removeEventListener('pointermove', onPointerMove);
    },
  };
}
