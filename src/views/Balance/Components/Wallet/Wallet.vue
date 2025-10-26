<script setup lang="ts">
import { ref } from "vue";
import { obfuscateAddress } from "../../../../utils/useTon";

// Icons
import TonIcon from "@/assets/icons/ton.svg";
import CloseIcon from "@/assets/icons/close.svg";
import TonLineIcon from "@/assets/icons/ton-line.svg";
import AddBlackIcon from "@/assets/icons/add-black.svg";
import WalletPrimaryIcon from "@/assets/icons/wallet-primary.svg";

const walletConnected = ref(true);
const walletAddress = ref('UQAD0OCSgNZQO8xMsTUWlUSEuZuvvRPxoPn0TvkICk1Suv0D');

const emit = defineEmits<{
  (e: "open-deposit-modal"): void;
}>();

function openDeposit() {
  emit("open-deposit-modal");
}
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
        <button v-if="!walletConnected">
          <h4>Connect</h4>
          <img class="ton" :src="TonLineIcon" alt="ton-line-icon" />
        </button>
        <button v-if="walletConnected">
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