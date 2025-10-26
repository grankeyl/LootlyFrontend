<script setup lang="ts">
// Icons
import TelegramIcon from "@/assets/icons/telegram.svg";
import MemgiftIcon from "@/assets/icons/memgift.svg";

const props = defineProps<{
  ActiveTab: string
}>()

const emit = defineEmits<{
  (e: 'SwitchTab', tab: string): void
}>()

const CheckActiveTab = (tab: string) => {
  return props.ActiveTab === tab;
}

const SwitchTab = (tab: string) => {
  emit('SwitchTab', tab);
}
</script>

<template>
  <div class="tabs">
    <div class="items">
      <div 
        class="item" 
        @click="SwitchTab('nfts')" 
        :class="{ active: CheckActiveTab('nfts') }"
      >
        <h4>NFTs</h4>
        <img :src="TelegramIcon" alt="telegram icon" />
      </div>
      <!-- <div 
        class="item" 
        @click="SwitchTab('memgifts')" 
        :class="{ active: CheckActiveTab('memgifts') }"
      >
        <h4>Memgifts</h4>
        <img :src="MemgiftIcon" alt="memgift icon" />
      </div> -->
    </div>
  </div>
</template>

<style lang="scss" src="./Tabs.scss" scoped></style>