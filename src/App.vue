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
const videoRef = ref<HTMLVideoElement | null>(null);
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

function miniAppTransport(dtx: any) {
  if (dtx && dtx !== 'debug') {
    if (dtx.startsWith('m_')) { 
      const id = dtx.split('m_')[1];
      router.push(`/market/item/${id}`);
    }
    if (dtx.startsWith('gift_')) {
      const giftId = dtx.split('gift_')[1];
      router.push(`/gift/${giftId}`);
    }
    if (dtx.startsWith('u_')) {
      const userId = dtx.split('u_')[1];
      router.push(`/view/${userId}`);
    }
    if (dtx === 'cases') { router.push('/cases'); }
    if (dtx === 'market') { router.push('/market'); }
    if (dtx === 'earn') { router.push('/earn'); }
    if (dtx === 'profile') { router.push('/profile'); }
    if (dtx === 'balance') { router.push('/balance'); }
    if (dtx === 'leaderboard') { router.push('/leaderboard'); }
    if (dtx === 'crash') { router.push('/crash'); }
  }
}

async function initStartApp(startParam?: string) {
  if (!startParam) {
    return;
  }

  const [startApp, startAppType = ''] = (startParam ?? '').split('_');

  switch (startAppType) {
    case 'opener':
      console.log('Opener', startApp);
      break;
    default:
      miniAppTransport(startParam);
  }
};

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
    }, 1500);
  }

  const video = videoRef.value;
  if (video) {
    video.src = LoadingMP4;
    video.play().catch(() => {
      console.warn('Autoplay blocked');
    });
  }
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
        loop
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