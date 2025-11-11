<script setup lang="ts">
import { ModalHost } from './components/common/Modal';
import { onMounted, onBeforeUnmount, nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useCacheStore } from './stores/pinia-store';
import * as APIUser from './api/user';

import Header from "./components/common/Header/Header.vue";
import Menu from "./components/common/Menu/Menu.vue";
import TelegramModule from './hooks/useTelegram';

// Images
import LogotypeImage from './assets/images/logotype.svg';
import BlockBgImage from './assets/images/cases-pg/block-bg.png';

const router = useRouter();
const loading = ref(true);
const useCache = useCacheStore();

let removeHook: (() => void) | undefined;

const IMAGES_TO_PRELOAD: string[] = [
  LogotypeImage,
  BlockBgImage,

  'https://lootly.codes/s3/rewards/ton.webp',
  'https://lootly.codes/s3/cases/covers/Pink_Case.webp',
  'https://lootly.codes/s3/cases/covers/Lotus.webp',
  'https://lootly.codes/s3/cases/covers/Time_to_Play.webp',
  'https://lootly.codes/s3/cases/covers/Freeze.webp',
  'https://lootly.codes/s3/cases/covers/Racer.webp',
  'https://lootly.codes/s3/cases/covers/Investor.webp',
  'https://lootly.codes/s3/cases/covers/Dengi.webp',
  'https://lootly.codes/s3/cases/covers/Lucky_Gem.webp',
];

/** Предзагрузка изображений (в браузерный кэш) */
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    img.referrerPolicy = 'no-referrer'; // безопасно по умолчанию
    img.onload = () => resolve();
    img.onerror = () => resolve();      // не блокируем старт из-за ошибки
    img.src = src;
    if (img.complete) resolve();        // мгновенно, если уже в кэше
  });
}
async function preloadImages(list: string[]) {
  await Promise.all(list.map(preloadImage));
}

function scrollTopSmooth() {
  const scroller = document.getElementById('scroller') as HTMLElement | null;
  const target: any = scroller ?? document.scrollingElement ?? document.documentElement;
  try { target.scrollTo({ top: 0, left: 0, behavior: 'smooth' }); }
  catch { target.scrollTop = 0; }
}

function miniAppTransport(dtx: any) {
  if (dtx && dtx !== 'debug') {
    if (dtx.startsWith('m_')) router.push(`/market/item/${dtx.split('m_')[1]}`);
    if (dtx.startsWith('p_')) router.push(`/profile/item/${dtx.split('p_')[1]}`);
    if (dtx === 'cases') router.push('/cases');
    if (dtx === 'market') router.push('/market');
    if (dtx === 'earn') router.push('/earn');
    if (dtx === 'profile') router.push('/profile');
    if (dtx === 'balance') router.push('/balance');
    if (dtx === 'leaderboard') router.push('/leaderboard');
    if (dtx === 'crash') router.push('/crash');
  }
}

async function initStartApp(startParam?: string) {
  if (!startParam) return;
  const [startApp, startAppType = ''] = (startParam ?? '').split('_');
  switch (startAppType) {
    case 'opener':
      console.log('Opener', startApp);
      break;
    default:
      miniAppTransport(startParam);
  }
}

onMounted(() => {
  removeHook = router.afterEach(async () => {
    await nextTick();
    requestAnimationFrame(scrollTopSmooth);
  });
  requestAnimationFrame(scrollTopSmooth);
});

onBeforeUnmount(() => { removeHook?.(); });

onMounted(async () => {
  const initDataRaw = TelegramModule.initDataRaw() as any;
  const initData = TelegramModule.initData() as any;

  const init = await APIUser.init(initDataRaw);
  if (init) {
    useCache.UserData = { ...init.user };
    initStartApp(initData.start_param);

    // ⬇️ ждём кэш изображений перед показом приложения
    await preloadImages(IMAGES_TO_PRELOAD);

    // маленькая задержка для плавности
    setTimeout(() => { loading.value = false; }, 300);
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
      <div class="center">
        <div class="logotype">
          <img :src="LogotypeImage" alt="logotype">
        </div>
        <div class="context">
          <div class="spinner" role="status" aria-label="Loading"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">

</style>