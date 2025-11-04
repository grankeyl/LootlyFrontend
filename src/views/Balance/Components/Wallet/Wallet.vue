<script setup lang="ts">
import { ref } from "vue";
import { obfuscateAddress } from "../../../../utils/useTon";
import { tonConnectUI } from '../../../../hooks/useTonConnect';
import { showErrorToast, showSuccessToast } from "../../../../utils/toastManager";
import { toUserFriendlyAddress } from "ton-ui-vue";

import * as APIWallet from '../../../../api/wallet';

// Icons
import TonIcon from "@/assets/icons/ton.svg";
import CloseIcon from "@/assets/icons/close.svg";
import TonLineIcon from "@/assets/icons/ton-line.svg";
import AddBlackIcon from "@/assets/icons/add-black.svg";
import WalletPrimaryIcon from "@/assets/icons/wallet-primary.svg";
import TelegramModule from "../../../../hooks/useTelegram";

const walletConnected = ref(false);
const walletAddress = ref('...');

const emit = defineEmits<{
  (e: "open-deposit-modal"): void;
}>();

function openDeposit() {
  emit("open-deposit-modal");
}

const openTonWallet = () => {
  tonConnectUI.openModal();
  TelegramModule.useMediumHaptic();

  const interval = setInterval(async () => {
    if (tonConnectUI.connected) {
      clearInterval(interval);
      walletConnected.value = true;
      const walletAddress = getTonWalletAddress() as any;
      const response = await APIWallet.connect(walletAddress);
      if (response && response.WalletAddress) {
        showSuccessToast('Wallet connected');
      } else {
        clearInterval(interval);
        showErrorToast('Wallet not connected');
      }
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

getTonWalletAddress();
checkTonWallet();

setInterval(() => {
  checkTonWallet();
}, 1000);
</script>

<template>
  <div class="wallet">
    <div class="wallet-top">
      <div class="context">
        <img :src="WalletPrimaryIcon" alt="wallet-icon" />
        <h4 v-if="!walletConnected">Wallet not connected</h4>
        <h4 v-if="walletConnected">{{ obfuscateAddress(walletAddress) }}</h4>
      </div>
      <div class="button">
        <button v-if="!walletConnected" @click="openTonWallet">
          <h4>Connect</h4>
          <img class="ton" :src="TonLineIcon" alt="ton-line-icon" />
        </button>
        <button v-if="walletConnected" @click="disconnectTonWallet">
          <img :src="CloseIcon" alt="close-icon" />
        </button>
      </div>
    </div>
    <div class="wallet-blocker">
      <div class="descr">
        <p>Lootly balance</p>
      </div>
      <div class="amount">
        <h4>0</h4>
        <img :src="TonIcon" alt="ton-icon" />
      </div>
      <div class="button">
        <button @click="openDeposit" :disabled="!walletConnected">
          <img :src="AddBlackIcon" alt="add-black-icon" aria-hidden="true" />
          <h4>Deposit</h4>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Wallet.scss" scoped></style>