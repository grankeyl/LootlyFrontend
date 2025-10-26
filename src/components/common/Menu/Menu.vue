<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";

// Icons
import CasesIcon from "@/assets/icons/case.svg";
import MarketIcon from "@/assets/icons/market.svg";
import TicketsIcon from "@/assets/icons/tickets.svg";
import ProfileIcon from "@/assets/icons/profile.svg";

const route = useRoute();
const router = useRouter();
const ActiveMenu = ref('cases');
const menuItems = [
  { id: 'cases', name: 'Cases', icon: CasesIcon, path: '/' },
  { id: 'market', name: 'Market', icon: MarketIcon, path: '/market' },
  { id: 'earn', name: 'Earn', icon: TicketsIcon, path: '/earn' },
  { id: 'profile', name: 'Profile', icon: ProfileIcon, path: '/profile' },
];

const SwitchMenu = (menu: any) => {
  ActiveMenu.value = menu.id;
  router.push(menu.path);
}

const CheckActiveMenu = (menu: any) => {
  if (route.path === menu.path) return true;
}
</script>

<template>
  <div class="menu">
    <div class="items">
      <div 
        v-for="item in menuItems"
        :key="item.name"
        @click="SwitchMenu(item)"
        class="item"
        :class="{ active: CheckActiveMenu(item) }"
      >
        <img :src="item.icon" alt="icon" />
        <h4>{{ item.name }}</h4>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Menu.scss" scoped></style>