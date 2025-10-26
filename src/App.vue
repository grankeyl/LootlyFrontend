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
    <div v-if="loading" class="page load">
      <video :src="LoadingMP4" autoplay loop muted></video>
    </div>
  </div>
</template>

<style lang="scss">

</style>