<script setup lang="ts">
import { ref } from "vue";

// Images
import Backdrop from "@/assets/images/earn-pg/bg-blured.png";
import Info from "./Components/Info/Info.vue";
import Top from "./Components/Top/Top.vue";

const pageRef = ref<HTMLElement|null>(null);
</script>

<template>
    <div class="page" ref="pageRef">
        <div class="backdrop">
            <img :src="Backdrop" alt="backdrop" />
        </div>

        <div class="blur"></div>

        <div class="content">
            <Info />
            <Top 
                :scroll-el="pageRef"
            />
        </div>
    </div>
</template>

<style lang="scss" src="./Leaderboard.scss" scoped></style>