<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, nextTick, computed } from 'vue';
import { useModal } from './useModal';
import type { ModalOptions } from './modal.types';

const props = defineProps<{
  id: number;
  component: any;
  props?: Record<string, any>;
  options?: ModalOptions;
}>();

const { close: closeRaw, dismiss: dismissRaw } = useModal();

const isActive = ref(false);
const isClosing = ref(false);

const layer  = computed(() => props.props?._layer ?? 0);
const baseZ  = computed(() => 1000 + layer.value * 2);

const overlay = ref<HTMLElement | null>(null);
const panel   = ref<HTMLElement | null>(null);

const opts: ModalOptions = {
  clickToClose: true,
  escToClose: true,
  width: 560,
  ariaLabel: 'Modal dialog',
  ...props.options,
};

function onKey(e: KeyboardEvent) {
  if (opts.escToClose && e.key === 'Escape') requestDismiss('esc');
}

function onOverlayClick(e?: MouseEvent) {
  if (!e) return;
  if (!opts.clickToClose) return;
  if (e.target === e.currentTarget) requestDismiss('overlay');
}

// двойной rAF — надёжно разводит кадры
function nextFrame(): Promise<void> {
  return new Promise((res: any) => requestAnimationFrame(() => requestAnimationFrame(res)));
}

onMounted(async () => {
  document.addEventListener('keydown', onKey);

  await nextTick();                 // DOM вставлен
  // форсим рефлоу, чтобы зафиксировать стартовые стили (opacity:0 / translateY(100%))
  panel.value?.offsetHeight;
  await nextFrame();                // ждём кадр
  isActive.value = true;            // включаем класс -> плавный вход
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
});

// ждём окончания выхода по transform панели (самая длинная анимация)
function waitForLeave(): Promise<void> {
  return new Promise((resolve) => {
    const el = panel.value;
    if (!el) return resolve();

    const onEnd = (evt: TransitionEvent) => {
      if (evt.target === el) {
        el.removeEventListener('transitionend', onEnd);
        resolve();
      }
    };
    el.addEventListener('transitionend', onEnd);
    // запасной таймер (должен быть >= суммарной длительности transition)
    setTimeout(resolve, 600);
  });
}

async function animateThen(cb: () => void) {
  if (isClosing.value) return;
  isClosing.value = true;

  // запускаем уход (убираем .active)
  isActive.value = false;

  await waitForLeave();
  cb();
}

function requestClose(payload?: any) {
  animateThen(() => closeRaw(props.id, payload));
}
function requestDismiss(reason?: any) {
  animateThen(() => dismissRaw(props.id, reason));
}

function exposeToChild() {
  return {
    modalId: props.id,
    close: (payload?: any) => requestClose(payload),
    dismiss: (reason?: any) => requestDismiss(reason),
  };
}
</script>

<template>
  <div
    class="m-overlay"
    :class="{ active: isActive }"
    :style="{ zIndex: baseZ }"
    role="presentation"
    @click="onOverlayClick"
    ref="overlay"
  />
  
  <div
    class="m-panel"
    :class="{ active: isActive }"
    :style="{
      zIndex: baseZ + 1,
      maxWidth: typeof opts.width === 'number' ? opts.width + 'px' : (opts.width || '')
    }"
    ref="panel"
  >
    <component
      :is="component"
      v-bind="{ ...(props?.props||{}), ...exposeToChild() }"
      @close="requestClose()"
      @dismiss="requestDismiss()"
    />
  </div>
</template>

<style lang="scss" src="./modal.scss" scoped></style>