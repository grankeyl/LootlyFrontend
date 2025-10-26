<script setup lang="ts">
// Icons
import CheckIcon from "@/assets/icons/check.svg";
import FriendsIcon from "@/assets/icons/friends.svg";

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
        @click="SwitchTab('tasks')" 
        :class="{ active: CheckActiveTab('tasks') }"
      >
        <h4>Tasks</h4>
        <img :src="CheckIcon" alt="check-icon" />
      </div>
      <div 
        class="item" 
        @click="SwitchTab('invites')" 
        :class="{ active: CheckActiveTab('invites') }"
      >
        <h4>Invite & Loot</h4>
        <img :src="FriendsIcon" alt="friends-icon" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Tabs.scss" scoped></style>