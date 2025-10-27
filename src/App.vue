<script setup lang="ts">
import { ModalHost } from './components/common/Modal';
import Header from "./components/common/Header/Header.vue";
import Menu from "./components/common/Menu/Menu.vue";
import TelegramModule from './hooks/useTelegram';

import * as APIUser from './api/user';

import { onMounted, onBeforeUnmount, nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useCacheStore } from './stores/pinia-store';

import LoadingMP4 from './assets/images/load.mp4';

const router = useRouter();
const loading = ref(true);
const videoRef = ref<HTMLVideoElement|null>(null);
const useCache = useCacheStore();

let removeHook: (() => void) | undefined;

function scrollTopSmooth() {
  const scroller = document.getElementById('scroller') as HTMLElement | null;
  const target: any = scroller ?? document.scrollingElement ?? document.documentElement;

  try {
    target.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  } catch {
    target.scrollTop = 0;
  }
}

onMounted(() => {
  removeHook = router.afterEach(async () => {
    await nextTick();
    requestAnimationFrame(scrollTopSmooth);
  });
  requestAnimationFrame(scrollTopSmooth);
});

onBeforeUnmount(() => {
  removeHook?.();
});

onMounted(async () => {
  const initData = TelegramModule.initDataRaw() as any;
  const init = await APIUser.init(initData);
  if (init) {
    useCache.UserData = { ...init.user };
    console.log(useCache.UserData);
    setTimeout(() => {
      loading.value = false;
    }, 1000);
  }

  await nextTick();
  const v = videoRef.value;
  if (v) {
    v.setAttribute('muted', '');
    v.muted = true;
    v.setAttribute('playsinline', '');
    (v as any).setAttribute?.('webkit-playsinline', '');

    v.preload = 'auto';
    v.autoplay = true;

    v.src = LoadingMP4;

    const tryPlay = () => v.play().catch(() => {});
    v.addEventListener('canplay', tryPlay, { once: true });
    v.addEventListener('loadeddata', tryPlay, { once: true });
  }

  setTimeout(() => (loading.value = false), 1000);
});
</script>

<template>
  <div id="scroller">
    <div v-if="!loading" class="page">
      <Header />
      <ModalHost />
      <RouterView />
      <Menu />
    </div>

    <div v-else class="page load">
      <video
        ref="videoRef"
        muted
        playsinline
        webkit-playsinline
        autoplay
        preload="auto"
        disableRemotePlayback
        data-wf-ignore="true"
      />
    </div>
  </div>
</template>

<style lang="scss">

</style>