<template>
  <div ref="lottieContainer" :style="{ width: w, height: h }" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, withDefaults, defineProps } from 'vue'
import lottie, { type AnimationItem } from 'lottie-web'

type Renderer = 'svg'|'canvas'|'html'
interface Props {
  path: string | Record<string, unknown>   // URL или импортированный JSON
  loop?: boolean
  autoplay?: boolean
  width?: number | string                  // 80 -> '80px', '100%' как есть
  height?: number | string
  renderer?: Renderer
}

const props = withDefaults(defineProps<Props>(), {
  loop: true,
  autoplay: true,
  renderer: 'svg',
  width: '100%',
  height: '100%',
})

const lottieContainer = ref<HTMLElement|null>(null)
let anim: AnimationItem | null = null

const norm = (v?: number|string) => typeof v === 'number' ? `${v}px` : (v === '0' ? '100%' : (v || '100%'))
const w = computed(() => norm(props.width))
const h = computed(() => norm(props.height))

onMounted(() => {
  if (!lottieContainer.value) return
  const base = { container: lottieContainer.value, renderer: props.renderer, loop: props.loop, autoplay: props.autoplay } as const
  anim = typeof props.path === 'string'
    ? lottie.loadAnimation({ ...base, path: props.path })
    : lottie.loadAnimation({ ...base, animationData: props.path as any }) as any;
})

onUnmounted(() => { anim?.destroy(); anim = null })
</script>