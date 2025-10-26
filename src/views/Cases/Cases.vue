<script setup lang="ts">
import { ref } from "vue";
import { useModal } from "../../components/common/Modal";

// Components
import LiveWins from "./Components/LiveWins/LiveWins.vue";
import Tabs from "./Components/Tabs/Tabs.vue";
import Cases from "./Components/Cases/Cases.vue";
import Case from "./Components/Modals/Case.vue";

const { open } = useModal();

const ActiveTab = ref('nfts');

const SwitchTab = (tab: string) => {
    ActiveTab.value = tab;
}

async function openCase(payload: any) {
  const choose = open(Case, {
    data: payload,
  });
  const dest = await choose.done.catch(() => null);
  if (!dest) return;
}
</script>

<template>
    <div class="page">
        <LiveWins />
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