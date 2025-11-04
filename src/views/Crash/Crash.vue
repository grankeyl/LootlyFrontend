<script setup lang="ts">
import { ref } from "vue";

import Game from "./Components/Game/Game.vue";
import Tabs from "./Components/Tabs/Tabs.vue";

const pageRef = ref<HTMLElement|null>(null);
</script>

<template>
    <div class="page" ref="pageRef">
        <div class="content">
            <Game 
                :force-crash-at="11.81"
            />
            <Tabs />
        </div>
    </div>
</template>

<style lang="scss" src="./Crash.scss" scoped></style>