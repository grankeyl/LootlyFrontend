<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { tonConnectUI } from '../../../../hooks/useTonConnect';
import { showErrorToast, showSuccessToast } from "../../../../utils/toastManager";
import { toUserFriendlyAddress } from "ton-ui-vue";

import * as APIWallet from '../../../../api/wallet';

// Icons
import CloseIcon from "@/assets/icons/close.svg";
import TonWhiteIcon from "@/assets/icons/ton-white.svg";
import WalletIcon from "@/assets/icons/wallet.svg?raw";
import TonLineIcon from "@/assets/icons/ton-line.svg";

// Images
import LootlyBalanceBlur from "@/assets/images/earn-pg/bg-blured-lootly-balance.png";
import TelegramModule from '../../../../hooks/useTelegram';
import { obfuscateAddress } from '../../../../utils/useTon';

const emit = defineEmits<{
  (e: "open-modal-withdraw-balance"): void;
}>();

const walletConnected = ref(false);
const walletAddress = ref('...');
const walletCheckInterval = ref();

function chooseWallet() {
  emit('open-modal-withdraw-balance');
}

const openTonWallet = () => {
  tonConnectUI.openModal();
  TelegramModule.useMediumHaptic();

  const interval = setInterval(async () => {
    if (tonConnectUI.connected) {
      clearInterval(interval);
      walletConnected.value = true;
      setTimeout(async () => {
        const response = await APIWallet.connect(walletAddress.value);
        console.log('response', response);
        if (response) {
          showSuccessToast('Wallet connected');
        } else {
          clearInterval(interval);
          showErrorToast('Wallet not connected');
        }
      }, 1000);
    }
  }, 1000);
}

const checkTonWallet = () => {
  const isTonWallet = tonConnectUI.connected;
  walletConnected.value = isTonWallet;
}

const getTonWalletAddress = async () => {
  if (!tonConnectUI.account) return;
  const rawAddress = tonConnectUI.account.address;
  const walletAddressString = toUserFriendlyAddress(rawAddress);
  walletAddress.value = walletAddressString;
  if (tonConnectUI.connected) { await APIWallet.connect(walletAddress.value); }
  return walletAddressString;
}

const disconnectTonWallet = () => {
  walletConnected.value = false;
  tonConnectUI.disconnect();
}

walletCheckInterval.value = setInterval(() => {
  checkTonWallet();
}, 1000) as unknown as number;

onMounted(() => {
  getTonWalletAddress();
  checkTonWallet();
});

onBeforeUnmount(() => {
  clearInterval(walletCheckInterval.value);
  walletCheckInterval.value = null;
});
</script>

<template>
  <div class="sheet">
    <div class="close">
      <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
    </div>
    <div class="info">
      <img :src="TonWhiteIcon" alt="ton-icon" aria-hidden="true" />
      <h4>{{ $t('earn.modals.chooseDestination.title') }}</h4>
      <p>{{ $t('earn.modals.chooseDestination.descr') }}</p>
    </div>
    <div class="wallet">
      <div class="icon">
        <div v-html="WalletIcon"></div>
      </div>
      <div class="text">
        <p v-if="!walletConnected">{{ $t('balance.wallet.notConnected') }}</p>
        <p v-if="walletConnected">{{ obfuscateAddress(walletAddress) }}</p>
      </div>
      <div class="button">
        <div v-if="!walletConnected" class="context" @click="openTonWallet">
          <h4>{{ $t('balance.wallet.connect') }}</h4>
          <img class="ton-line" :src="TonLineIcon" alt="ton-line-icon" />
        </div>
        <div v-if="walletConnected" class="context" @click="disconnectTonWallet">
          <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
        </div>
      </div>
    </div>
    <div class="selectors">
      <div class="item" @click="chooseWallet" :class="{ disabled: !walletConnected }">
        <div class="top">
          <p v-if="walletConnected">{{ obfuscateAddress(walletAddress) }}</p>
          <p v-if="!walletConnected">{{ $t('earn.modals.chooseDestination.needConnect') }}</p>
        </div>
        <div class="context">
          <div v-html="WalletIcon"></div>
          <h4>{{ $t('earn.modals.chooseDestination.wallet') }}</h4>
        </div>
      </div>
      <div class="item">
        <div class="blur">
          <img :src="LootlyBalanceBlur" alt="blur" />
        </div>
        <div class="context">
          <h4>{{ $t('earn.modals.chooseDestination.lootlyBalance') }}</h4>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./ChooseDestination.scss" scoped></style>