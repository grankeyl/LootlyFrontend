<script setup lang="ts">
import { useModal } from "../../components/common/Modal";

// Components
import Wallet from "./Components/Wallet/Wallet.vue";
import Button from "./Components/Button/Button.vue";

import DepositModal from './Components/Modals/Deposit.vue';

const { open } = useModal();

async function openDeposit() {
  const choose = open(DepositModal);
  const dest = await choose.done.catch(() => null);
  if (!dest) return;
}
</script>

<template>
    <div class="page">
      <Wallet 
        @open-deposit-modal="openDeposit"
      />
      <Button />
    </div>
</template>

<style lang="scss" src="./Balance.scss" scoped></style>