// import confetti from 'canvas-confetti';

// const createFullScreenCanvas = () => {
//   const canvas = document.createElement('canvas');
//   canvas.style.position = 'fixed';
//   canvas.style.top = '0';
//   canvas.style.left = '0';
//   canvas.style.width = '100vw';
//   canvas.style.height = '100vh';
//   canvas.style.pointerEvents = 'none';
//   canvas.style.zIndex = '999999';
//   canvas.setAttribute('id', 'confetti-canvas');
//   document.body.appendChild(canvas);
//   return canvas;
// };

// let existingCanvas = document.getElementById('confetti-canvas') as HTMLCanvasElement;
// if (!existingCanvas) {
//   existingCanvas = createFullScreenCanvas();
// }

// existingCanvas.width = window.innerWidth;
// existingCanvas.height = window.innerHeight;

// window.addEventListener('resize', () => {
//   existingCanvas.width = window.innerWidth;
//   existingCanvas.height = window.innerHeight;
// });

// const customConfetti = confetti.create(existingCanvas, {
//   resize: false,
//   useWorker: true
// });

// const defaults = {
//   spread: 360,
//   ticks: 50,
//   gravity: 0,
//   decay: 0.94,
//   startVelocity: 30,
//   colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8']
// };

// function shootConfetti() {
//   customConfetti({
//     ...defaults,
//     particleCount: 40,
//     scalar: 1.2,
//     shapes: ['star']
//   });

//   customConfetti({
//     ...defaults,
//     particleCount: 10,
//     scalar: 0.75,
//     shapes: ['circle']
//   });
// }

// const fireCircle = () => {
//   const particleCount = 12;
//   const angleStep = 360 / particleCount;

//   for (let i = 0; i < particleCount; i++) {
//     customConfetti({
//       angle: i * angleStep,
//       spread: 35,
//       startVelocity: 40,
//       gravity: 0.5,
//       decay: 0.9,
//       scalar: 0.9,
//       particleCount: 15,
//       origin: { x: 0.5, y: 0.5 },
//       colors: ['#8A2BE2', '#FF69B4', '#6495ED', '#DA70D6', '#BA55D3'],
//     });
//   }
// };

// const fireFromBottom = () => {
//   customConfetti({
//     particleCount: 100,
//     angle: 90,
//     spread: 90,
//     startVelocity: 45,
//     gravity: 0.6,
//     decay: 0.9,
//     scalar: 1,
//     origin: {
//       x: 0.5,
//       y: 1
//     },
//     colors: ['#00FFFF', '#7FFFD4', '#00CED1', '#40E0D0', '#5F9EA0'],
//     shapes: ['circle']
//   });
// };

// export { shootConfetti, fireCircle, fireFromBottom };