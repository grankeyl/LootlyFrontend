<script setup lang="ts">
import { useModal } from './../../components/common/Modal';
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router"; // ← добавили

import Balance from "./Components/Balance/Balance.vue";
import Tabs from "./Components/Tabs/Tabs.vue";
import Tasks from "./Components/Tasks/Tasks.vue";
import Invites from "./Components/Invites/Invites.vue";
import Button from "./Components/Button/Button.vue";
import ChooseDestinationModal from './Components/Modals/ChooseDestination.vue';
import WithdrawModal from './Components/Modals/Withdraw.vue';
import BalanceAboutModal from './Components/Modals/BalanceAbout.vue';

import Backdrop from "@/assets/images/earn-pg/bg-blured.png";
import Header from '../../components/common/Header/Header.vue';

const { open } = useModal();

const route = useRoute();
const allowedTabs = ['tasks', 'invites'] as const;
const defaultTab = 'tasks';

const initialSection = route.query.section;
const ActiveTab = ref<string>(
  typeof initialSection === 'string' && allowedTabs.includes(initialSection as any)
    ? initialSection
    : defaultTab
);

const PageRef = ref<HTMLElement|null>(null);
const SwitchTab = (tab: string) => { ActiveTab.value = tab; }

async function openWithdrawReferrals() {
  const choose = open(ChooseDestinationModal, {
    onOpenModalWithdrawBalance: () => open(WithdrawModal),
  });
  const dest = await choose.done.catch(() => null);
  if (!dest) return;
}

async function openBalanceAbout() {
  const choose = open(BalanceAboutModal, {});
  const dest = await choose.done.catch(() => null);
  if (!dest) return;
}

// === плавное появление задника ===
const loaded = ref(false);
const imgSrc = ref<string | null>(null);

onMounted(async () => {
  const img = new Image();
  img.decoding = 'async';
  img.src = Backdrop;
  try { // ждём полной декодировки, чтобы не было «дорисовки»
    // @ts-ignore
    if (typeof img.decode === 'function') await img.decode();
  } catch { /* no-op */ }
  imgSrc.value = Backdrop;
  loaded.value = true;
});
</script>

<template>
  <div class="page" ref="PageRef">
    <Header />

    <div class="backdrop" :class="{ loaded }">
      <img v-if="imgSrc" :src="imgSrc" alt="backdrop" />
    </div>

    <div class="blur"></div>

    <div class="content">
      <Balance
        @open-modal-balance-about="openBalanceAbout"
      />
      <Tabs @SwitchTab="SwitchTab" :ActiveTab="ActiveTab" />
      <Tasks v-if="ActiveTab === 'tasks'" />
      <Invites
        v-if="ActiveTab === 'invites'"
        :scroll-el="PageRef"
        @open-modal-withdraw-referrals="openWithdrawReferrals"
      />
    </div>
  </div>

  <Button :ActiveTab="ActiveTab" />
</template>

<style lang="scss" src="./Earn.scss" scoped></style>
<style scoped lang="scss">
.backdrop {
  opacity: 0;
  transition: opacity 0.6s ease;
  &.loaded { opacity: 1; }
}
</style>