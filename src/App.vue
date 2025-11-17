<script setup lang="ts">
import { ModalHost } from './components/common/Modal';
import { PopupHost } from './components/common/Popup';
import { onMounted, onBeforeUnmount, nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useCacheStore } from './stores/pinia-store';
import { waitForFonts } from './utils/useApp';

import * as APIUser from './api/user';

import Header from "./components/common/Header/Header.vue";
import Menu from "./components/common/Menu/Menu.vue";
import TelegramModule from './hooks/useTelegram';
import Lottie from './components/Lottie.vue';

// Images
import LogotypeImage from './assets/images/logotype.svg';
import BlockBgImage from './assets/images/cases-pg/block-bg.png';
import RocketImage from "./assets/images/crash-pg/rocket.png";

import Slide1LogoImage from "@/assets/images/logo.svg";
import Slide1Symbols from "@/assets/images/onboard-pg/slide1/symbols.png";
import Slide1BluredImage from "@/assets/images/onboard-pg/slide1/blured.png";
import Slide1GiftsImage from "@/assets/images/onboard-pg/slide1/gifts.png";

const router = useRouter();
const loading = ref(true);
const useCache = useCacheStore();

let removeHook: (() => void) | undefined;

const IMAGES_TO_PRELOAD: string[] = [
  LogotypeImage,
  BlockBgImage,
  RocketImage,

  Slide1LogoImage,
  Slide1Symbols,
  Slide1BluredImage,
  Slide1GiftsImage,

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
    img.referrerPolicy = 'no-referrer';
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
    if (img.complete) resolve();
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
    if (dtx === 'onboard') router.push('/onboard');
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

    // router.push('/onboard');

    await Promise.all([
      preloadImages(IMAGES_TO_PRELOAD),
      waitForFonts(['SFRounded'], [100,300,400,500,600,700,800,900], ['normal'], 4500),
    ]);

    setTimeout(() => { loading.value = false; }, 470);
  }
});
</script>

<template>
  <div id="scroller">
    <div v-if="!loading" class="page">
      <Header />
      <ModalHost />
      <PopupHost />
      <RouterView />
      <Menu />
    </div>

    <div v-else class="page load">
      <div class="center">
        <div class="logotype">
          <Lottie
            path="/animations/logotype.json"
            :loop="true"
            renderer="svg"
            width="100%"
            height="100%"
          />
          <!-- <img :src="LogotypeImage" alt="logotype"> -->
        </div>
        <!-- <div class="context">
          <div class="spinner" role="status" aria-label="Loading"></div>
        </div> -->
      </div>
    </div>
  </div>
</template>

<style lang="scss">

</style>