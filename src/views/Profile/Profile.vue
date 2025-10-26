<script setup lang="ts">
import { ref } from 'vue';
import { useModal } from './../../components/common/Modal';

// Components
import User from "./Components/User/User.vue";
import Actions from "./Components/Actions/Actions.vue";
import Gifts from "./Components/Gifts/Gifts.vue";
import WithdrawGiftsModal from './Components/Modals/WithdrawGifts.vue';
import GiftModal from './Components/Modals/Gift.vue';
import WithdrawGiftModal from './Components/Modals/WithdrawGift.vue';

// Images
import Backdrop from "@/assets/images/profile-pg/bg-blured.png";
import { useCacheStore } from '../../stores/pinia-store';

const { open } = useModal();

const useCache = useCacheStore();
const pageRef = ref<HTMLElement|null>(null);

const inventoryCount = ref(0);

async function openWithdrawGifts() {
  const choose = open(WithdrawGiftsModal);
  const dest = await choose.done.catch(() => null);
  if (!dest) return;
}

async function openGift() {
  const choose = open(GiftModal, {
    onOpenModalWithdrawGift: () => open(WithdrawGiftModal),
  });
  await choose.done.catch(() => null);
}
</script>

<template>
    <div class="backdrop">
        <img :src="Backdrop" alt="backdrop" />
    </div>

    <div class="page" ref="pageRef">
        <User
            :photo="useCache.UserData.Photo"
            :name="useCache.UserData.Name"
        />
        <Actions 
            :inventoryCount="inventoryCount"
            @open-modal-withdraw-gifts="openWithdrawGifts"
        />
        <Gifts
            :scroll-el="PageRef"
            @open-modal="openGift"
            @inventory-count="inventoryCount = $event"
        />
    </div>
</template>

<style lang="scss" src="./Profile.scss" scoped></style>