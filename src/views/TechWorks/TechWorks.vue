<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

// Icons
import LogotypeRawIcon from "@/assets/images/logotype.svg?raw";

// Images
import BluredImage from "@/assets/images/onboard-pg/slide1/blured.webp";
import TelegramModule from "../../hooks/useTelegram";

const router = useRouter();
const loaded = ref(false);
const imgSrc = ref<string | null>(null);

onMounted(async () => {
  TelegramModule.useBackButton(() => router.back());

  const img = new Image();
  img.decoding = 'async';
  img.src = BluredImage;
  try { /* @ts-ignore */ if (typeof img.decode === 'function') await img.decode(); } catch {}
  imgSrc.value = Backdrop;
  loaded.value = true;
});
</script>

<template>
    <div class="page" ref="pageRef">
        <div class="content">
            <div class="backdrop" :class="{ loaded }">
                <img v-if="BluredImage" :src="BluredImage" alt="backdrop" />
            </div>
            <div class="image">
                <div class="kit-icon" v-html="LogotypeRawIcon"></div>
            </div>
            <div class="text">
                <h4>{{ $t('techWorks.title') }}</h4>
            </div>
        </div>
    </div>
</template>

<style lang="scss" src="./TechWorks.scss" scoped></style>