<script setup lang="ts">
// Components
import { useModal } from './../../components/common/Modal';
import { ref } from "vue";

import Balance from "./Components/Balance/Balance.vue";
import Tabs from "./Components/Tabs/Tabs.vue";
import Tasks from "./Components/Tasks/Tasks.vue";
import Invites from "./Components/Invites/Invites.vue";
import Button from "./Components/Button/Button.vue";
import ChooseDestinationModal from './Components/Modals/ChooseDestination.vue';
import WithdrawModal from './Components/Modals/Withdraw.vue';

// Images
import Backdrop from "@/assets/images/earn-pg/bg-blured.png";
import Header from '../../components/common/Header/Header.vue';

const { open } = useModal();

const ActiveTab = ref('tasks');
const PageRef = ref<HTMLElement|null>(null);
const SwitchTab = (tab: string) => { ActiveTab.value = tab; }

async function openWithdrawReferrals() {
  const choose = open(ChooseDestinationModal, {
    onOpenModalWithdrawBalance: () => open(WithdrawModal),
  });
  const dest = await choose.done.catch(() => null);
  if (!dest) return;
}
</script>

<template>
    <div class="page" ref="PageRef">
        <Header />

        <div class="backdrop">
            <img :src="Backdrop" alt="backdrop" />
        </div>

        <div class="blur"></div>

        <div class="content">
            <Balance
            />
            <Tabs
                @SwitchTab="SwitchTab"
                :ActiveTab="ActiveTab"
            />
            <Tasks 
                v-if="ActiveTab === 'tasks'"
            />
            <Invites
            v-if="ActiveTab === 'invites'"
            :scroll-el="PageRef"
            @open-modal-withdraw-referrals="openWithdrawReferrals"
            />
        </div>
    </div>
    
    <Button
        :ActiveTab="ActiveTab"
    />
</template>

<style lang="scss" src="./Earn.scss" scoped></style>