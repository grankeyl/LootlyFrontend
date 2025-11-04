<script setup lang="ts">
import { ref } from "vue";
import { useModal } from "../../components/common/Modal";

// Components
import LiveWins from "./Components/LiveWins/LiveWins.vue";
import Block from "./Components/Block/Block.vue";
import Tabs from "./Components/Tabs/Tabs.vue";
import Cases from "./Components/Cases/Cases.vue";
import Case from "./Components/Modals/Case.vue";
import NotEnoght from "./Components/Modals/NotEnoght.vue";

const { open } = useModal();

const ActiveTab = ref('nfts');

const SwitchTab = (tab: string) => {
    ActiveTab.value = tab;
}

async function openCase(payload: any) {
  const choose = open(Case, {
    data: payload,
    onNotEnough: (p: any) => openNotEnough(p),
  });
  const dest = await choose.done.catch(() => null);
  if (!dest) return;
}

async function openNotEnough(payload: any) {
  const choose = open(NotEnoght, {
    data: payload,
  });
  const dest = await choose.done.catch(() => null);
  if (!dest) return;
}
</script>

<template>
    <div class="page">
        <LiveWins />
        <!-- <Block /> -->
        <Tabs
            @SwitchTab="SwitchTab"
            :ActiveTab="ActiveTab"
        />
        <Cases 
            @open-case="openCase"
            :ActiveTab="ActiveTab"
        />
    </div>
</template>

<style lang="scss" src="./Cases.scss" scoped></style>