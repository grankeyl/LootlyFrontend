<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCacheStore } from "../../../stores/pinia-store";
import { cutNumberNano } from "../../../utils/useTon";
import { useTranslation } from "i18next-vue";

import * as APIUser from "../../../api/user";

// Images
import Logo from "@/assets/images/logo.svg";

// Icons
import Ton from "@/assets/icons/ton.svg";
import SupportIcon from "@/assets/icons/support.svg?raw";
import TelegramModule from "../../../hooks/useTelegram";

const { i18next } = useTranslation();

const route = useRoute();
const router = useRouter();
const useCache = ref(useCacheStore()) as any;
const currentLang = ref(i18next.language);

const CheckActiveMenu = () => {
  if (route.path === '/onboard') return true;
  if (route.path === '/balance/onboard') return true;
  if (route.path === '/earn') return true;
  if (route.path === '/balance') return true;
  if (route.path === '/leaderboard') return true;
  if (route.path === '/crash') return true;
  if (route.path === '/crash1') return true;
  return false;
}

const ShowLanguage = () => {
  if (route.path === '/profile') return true;
  return false;
}

const ShowSupport = () => {
  if (route.path === '/profile') return true;
  return false;
}

const OpenBalance = () => {
  TelegramModule.useLightHaptic();
  if (useCache.value.UserData.OnBoardingBalance) {
    router.push('/balance');
  } else {
    router.push('/balance/onboard');
  }
}

function OpenSupport() {
  TelegramModule.useLightHaptic();
  TelegramModule.useLink('https://t.me/LootlySupport');
}

async function SetLang() {
  const lng = currentLang.value === 'en' ? 'ru' : 'en';
  const res = await APIUser.langue(lng);
  if (!res.ok) return;
  if (res.ok) {
    i18next.changeLanguage(lng);
    currentLang.value = lng;
  }
}
</script>

<template>
  <div class="header" :class="{ dth: !CheckActiveMenu() }">
    <div  class="logo">
      <img :src="Logo" alt="logo" />
    </div>
    <div class="flexed">
      <div v-if="ShowLanguage()" @click="SetLang" class="language">
        <h4 v-if="currentLang && currentLang === 'en'">Rus</h4>
        <h4 v-if="currentLang && currentLang === 'ru'">Eng</h4>
      </div>
      <div v-if="ShowSupport()" @click="OpenSupport" class="support">
        <div class="kit-icon" v-html="SupportIcon"></div>
      </div>
      <div @click="OpenBalance()" class="balance">
        <div class="context">
          <h4>{{ cutNumberNano(useCache?.UserData?.BalanceNano ?? 0n, 2) }}</h4>
          <img :src="Ton" alt="ton" />
        </div>
        <div class="action">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.0003 4.16675V15.8334M4.16699 10.0001H15.8337" stroke="#1E1E1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Header.scss" scoped></style>