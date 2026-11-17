// Keyboard and mouse, read by the world each step. The mouse steers the shield
// by angle; the arrow keys (or A/D) swing it too; click or Space dashes.
// Edge-triggered actions (start, restart, pause, mute) are queued here and
// consumed once by the main loop, so a single press never fires twice.
export function createInput(canvas) {
  const input = {
    mouseX: 0,
    mouseY: 0,
    mouseSeen: false,
    left: false,
    right: false,
    dashQueued: false,
    startQueued: false,
    restartQueued: false,
    pauseQueued: false,
    muteQueued: false,
  };

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  canvas.addEventListener('pointermove', (event) => {
    const p = toLogical(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.mouseSeen = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const p = toLogical(event);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.mouseSeen = true;
    input.dashQueued = true;
    input.startQueued = true;
  });
  window.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') input.left = true;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') input.right = true;
    if (event.code === 'Space') {
      input.dashQueued = true;
      event.preventDefault();
    }
    if (event.code === 'Enter') input.startQueued = true;
    if (event.code === 'KeyR') input.restartQueued = true;
    if (event.code === 'KeyP') input.pauseQueued = true;
    if (event.code === 'KeyM') input.muteQueued = true;
  });
  window.addEventListener('keyup', (event) => {
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') input.left = false;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') input.right = false;
  });
  // Keep the keys honest when the window loses focus mid-press.
  window.addEventListener('blur', () => {
    input.left = false;
    input.right = false;
  });

  return input;
}

// The shield angle the pointer asks for, or null when the mouse has never moved.
export function mouseAngle(input, cx, cy) {
  if (!input.mouseSeen) return null;
  return Math.atan2(input.mouseY - cy, input.mouseX - cx);
}
