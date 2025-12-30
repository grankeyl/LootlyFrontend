<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

// Images
import Backdrop from "@/assets/images/earn-pg/bg-blured.png";
import Info from "./Components/Info/Info.vue";
import Top from "./Components/Top/Top.vue";
import TelegramModule from "../../hooks/useTelegram";

const router = useRouter();
const pageRef = ref<HTMLElement|null>(null);

/* === плавное появление задника === */
const loaded = ref(false);
const imgSrc = ref<string | null>(null);

onMounted(async () => {
  TelegramModule.useBackButton(() => router.back());

  const img = new Image();
  img.decoding = 'async';
  img.src = Backdrop;
  try { /* @ts-ignore */ if (typeof img.decode === 'function') await img.decode(); } catch {}
  imgSrc.value = Backdrop;
  loaded.value = true;
});
</script>

<template>
    <div class="page" ref="pageRef">
        <div class="backdrop" :class="{ loaded }">
            <img v-if="imgSrc" :src="imgSrc" alt="backdrop" />
        </div>

        <div class="blur"></div>

        <div class="content">
            <Info />
            <Top 
                :scroll-el="pageRef"
            />
        </div>
    </div>
</template>

<style lang="scss" src="./Leaderboard.scss" scoped></style>