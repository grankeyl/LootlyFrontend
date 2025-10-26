<script setup lang="ts">
import { onMounted, ref } from "vue";
import { gsap } from "gsap";

const size = 400;           // область графика
const samples = 240;        // точность кривой
const pathRef = ref<SVGPathElement|null>(null);
const dotRef  = ref<SVGCircleElement|null>(null);

onMounted(() => {
  const ease = gsap.parseEase("expo.in");

  // 1) строим путь из функции easing
  let d = `M 0 ${size}`;
  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const x = t * size;
    const y = (1 - ease(t)) * size;
    d += ` L ${x} ${y}`;
  }
  pathRef.value!.setAttribute("d", d);

  // 2) длина пути и штрихи для «рисования»
  const len = pathRef.value!.getTotalLength();
  pathRef.value!.style.strokeDasharray = `${len}`;
  pathRef.value!.style.strokeDashoffset = `${len}`;

  const state = { p: 0 };
  gsap.to(state, {
    p: 1,
    duration: 2.5,
    ease: "none",          // время линейное — форма в самом пути
    onUpdate: () => {
      const l = len * state.p;
      pathRef.value!.style.strokeDashoffset = `${len - l}`;
      const pt = pathRef.value!.getPointAtLength(l);
      gsap.set(dotRef.value, { cx: pt.x, cy: pt.y });
    },
  });
});
</script>

<template>
  <div class="stage">
    <svg :width="size" :height="size" class="graph">
      <!-- оси -->
      <line x1="0" :y1="size" :x2="size" :y2="size" stroke="#333"/>
      <line x1="0" y1="0" x2="0" :y2="size" stroke="#333"/>
      <!-- кривая и точка -->
      <path ref="pathRef" stroke="#9cff70" fill="none" stroke-width="3"/>
      <circle ref="dotRef" r="6" fill="#9cff70"/>
    </svg>
  </div>
</template>

<style scoped lang="scss">
.stage { width: 400px; height: 400px; background:#101114; border-radius:12px; display:grid; place-items:center; }
.graph { overflow: visible; }
</style>