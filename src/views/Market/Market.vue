<script setup lang="ts">
import { ref } from 'vue';

// Components
import Actions from "./Components/Actions/Actions.vue";
import Gifts from "./Components/Gifts/Gifts.vue";

// Images
import Backdrop from "@/assets/images/profile-pg/bg-blured.png";

const pageRef = ref<HTMLElement|null>(null);
</script>

<template>
    <div class="backdrop">
        <img :src="Backdrop" alt="backdrop" />
    </div>

    <div class="page" ref="pageRef">
        <Actions />
        <Gifts
            :scroll-el="pageRef"
        />
    </div>
</template>

<style lang="scss" src="./Market.scss" scoped></style>