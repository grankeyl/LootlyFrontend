// @ts-ignore
import confetti from 'canvas-confetti';

const createFullScreenCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '999999';
  canvas.setAttribute('id', 'confetti-canvas');
  document.body.appendChild(canvas);
  return canvas;
};

let existingCanvas = document.getElementById('confetti-canvas') as HTMLCanvasElement;
if (!existingCanvas) {
  existingCanvas = createFullScreenCanvas();
}

existingCanvas.width = window.innerWidth;
existingCanvas.height = window.innerHeight;

window.addEventListener('resize', () => {
  existingCanvas.width = window.innerWidth;
  existingCanvas.height = window.innerHeight;
});

const customConfetti = confetti.create(existingCanvas, {
  resize: false,
  useWorker: true
});

const defaults = {
  spread: 360,
  ticks: 50,
  gravity: 0,
  decay: 0.94,
  startVelocity: 30,
  colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8']
};

existingCanvas.style.visibility = 'hidden';

const show = () => (existingCanvas.style.visibility = 'visible');
const hide = () => (existingCanvas.style.visibility = 'hidden');

export async function shootConfetti() {
  show();
  await customConfetti({ ...defaults, particleCount: 40, scalar: 1.2, shapes: ['star'] });
  await customConfetti({ ...defaults, particleCount: 10, scalar: 0.75, shapes: ['circle'] });
  hide();
}