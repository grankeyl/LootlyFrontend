<script setup lang="ts">
import { ModalHost } from "./components/common/Modal";
import { PopupHost } from "./components/common/Popup";
import { onMounted, onBeforeUnmount, nextTick, ref } from "vue";
import { useRouter } from "vue-router";
import { useCacheStore } from "./stores/pinia-store";
import { waitForFonts } from "./utils/useApp";
import { useTranslation } from "i18next-vue";

import * as APIUser from "./api/user";

import Header from "./components/common/Header/Header.vue";
import Menu from "./components/common/Menu/Menu.vue";
import TelegramModule from "./hooks/useTelegram";
import Lottie from "./components/Lottie.vue";

// Images (локальные)
import LogotypeImage from "./assets/images/logotype.svg";
import BlockBgImage from "./assets/images/cases-pg/block-bg.png";
import RocketImage from "./assets/images/crash-pg/rocket.png";

import Slide1LogoImage from "@/assets/images/logo.svg";
import Slide1Symbols from "@/assets/images/onboard-pg/slide1/symbols.webp";
import Slide1BluredImage from "@/assets/images/onboard-pg/slide1/blured.webp";
import Slide1GiftsImage from "@/assets/images/onboard-pg/slide1/gifts.webp";

const { i18next } = useTranslation();
const router = useRouter();
const useCache = useCacheStore();

const loading = ref(true);
const appReady = ref(false);

let removeHook: (() => void) | undefined;

const IMAGES_TO_PRELOAD: string[] = [
  LogotypeImage,
  BlockBgImage,
  RocketImage,
  "https://lootly.codes/s3/free/FreeCase1.png",
  "https://lootly.codes/s3/free/FreeCase2.png",
  "https://lootly.codes/s3/cases/covers/Pink_Case.webp",
  "https://lootly.codes/s3/cases/covers/Lotus.webp",
  "https://lootly.codes/s3/cases/covers/Time_to_Play.webp",
];

const IMAGES_TO_PRELOAD_SLIDES: string[] = [
  Slide1LogoImage,
  Slide1Symbols,
  Slide1BluredImage,
  Slide1GiftsImage,
];

/** preload img в кэш */
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.referrerPolicy = "no-referrer";
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
  const scroller = document.getElementById("scroller") as HTMLElement | null;
  const target: any = scroller ?? document.scrollingElement ?? document.documentElement;
  try {
    target.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  } catch {
    target.scrollTop = 0;
  }
}

const checkPageOpener = () => {
  if (location.pathname.startsWith("/tech-works")) {
    TelegramModule.readyMiniApp();
    appReady.value = true;
    loading.value = false;
  }
};

function miniAppTransport(dtx: any) {
  if (!dtx || dtx === "debug") return;

  if (dtx.startsWith("m_")) router.push(`/market/item/${dtx.split("m_")[1]}`);
  if (dtx.startsWith("p_")) router.push(`/profile/item/${dtx.split("p_")[1]}`);
  if (dtx === "onboard") router.push("/onboard");
  if (dtx === "cases") router.push("/cases");
  if (dtx === "earn") router.push("/earn");
  if (dtx === "profile") router.push("/profile");
  if (dtx === "balance") router.push("/balance");
  if (dtx === "leaderboard") router.push("/leaderboard");
  if (dtx === "crash") router.push("/crash");
  if (dtx === "fortunetap") router.push("/fortune-tap");
  if (dtx === "chicken") router.push("/chicken");
}

async function initStartApp(startParam?: string) {
  if (!startParam) return;
  const [, startAppType = ""] = (startParam ?? "").split("_");
  switch (startAppType) {
    case "opener":
      // твоя логика
      break;
    default:
      miniAppTransport(startParam);
  }
}

function runInIdle(task: () => Promise<void>, timeout = 2000) {
  const ric = (window as any).requestIdleCallback as
    | ((cb: () => void, opts?: { timeout?: number }) => void)
    | undefined;

  if (ric) {
    ric(() => void task(), { timeout });
  } else {
    setTimeout(() => void task(), 0);
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
  checkPageOpener();
  
  const initDataRaw = TelegramModule.initDataRaw() as any;
  const initData = TelegramModule.initData() as any;

  const init = await APIUser.init(initDataRaw);
  console.log(init);
  if (!init) return;
  if (init.code === 503) {
    appReady.value = true;
    loading.value = false;

    await router.replace("/tech-works");
    return;
  }

  useCache.UserData = { ...init.user };
  useCache.UserDataMeta = { ...init.meta };
  i18next.changeLanguage(init.user.Language);

  const target = !init.user.OnBoarding ? "/onboard" : null;

  if (target) await router.replace(target);
  else await initStartApp(initData.start_param);

  appReady.value = true;
  loading.value = false;

  runInIdle(async () => {
    try {
      await preloadImages(IMAGES_TO_PRELOAD);
      await waitForFonts(["SFRounded"], [400, 500, 600, 700, 800, 900], ["normal"], 4500);

      if (!init.user.OnBoarding) {
        await preloadImages(IMAGES_TO_PRELOAD_SLIDES);
      }
    } catch (e) {
      console.warn("idle preload failed", e);
    }
  }, 2000);
});

const CURRENT = import.meta.env.VITE_BUILD_ID;

async function checkUpdate() {
  try {
    const res = await fetch("/version.json", { cache: "no-store" });
    const { v } = await res.json();
    if (v && v !== CURRENT) location.reload();
  } catch {}
}

setInterval(checkUpdate, 30_000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) checkUpdate();
});
</script>

<template>
  <div id="scroller">
    <div class="page">
      <Header />

      <div v-if="appReady" class="app">
        <ModalHost />
        <PopupHost />
        <RouterView />
        <Menu />
      </div>

      <!-- Лоадер в DOM, плавно скрывается -->
      <div class="pg-load" :class="{ hide: !loading }" :aria-hidden="!loading">
        <div class="logotype">
          <!-- Важно: SVG Lottie иногда не даёт LCP.
               Можно добавить реальный img как LCP-кандидат -->
          <Lottie
            path="/animations/logotype.json"
            :loop="true"
            renderer="svg"
            width="100%"
            height="100%"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.page {
  position: relative;
  min-height: 100vh;
}

.pg-load {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  z-index: 9999;

  opacity: 1;
  transform: translateZ(0);
  transition: opacity 260ms ease, visibility 260ms ease;

  &.hide {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }

  .logotype {
    width: 140px;
    height: 140px;
    position: relative;
  }

  /* LCP-кандидат (можно сделать opacity:0.001 чтобы не мешал визуально) */
  .lcp {
    position: absolute;
    inset: 0;
    width: 140px;
    height: 140px;
    opacity: 0.001;
    pointer-events: none;
  }
}
</style>