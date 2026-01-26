<script setup lang="ts">
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useTranslation } from "i18next-vue";

// Icons
import CasesIcon from "@/assets/icons/case.svg";
import TicketsIcon from "@/assets/icons/tickets.svg";
import ProfileIcon from "@/assets/icons/profile.svg";

const route = useRoute();
const router = useRouter();
const ActiveMenu = ref('cases');

const { t } = useTranslation();

const menuItems = [
  { id: 'cases', name: t('menu.cases'), icon: CasesIcon, path: '/' },
  { id: 'earn', name: t('menu.earn'), icon: TicketsIcon, path: '/earn' },
  { id: 'profile', name: t('menu.profile'), icon: ProfileIcon, path: '/profile' },
];

const CheckDisabledMenu = () => {
  if (route.path === '/onboard') return true;
  if (route.path === '/balance/onboard') return true;
  if (route.path === '/tech-works') return true;
  return false;
}

const SwitchMenu = (menu: any) => {
  ActiveMenu.value = menu.id;
  router.push(menu.path);
}

const CheckActiveMenu = (menu: any) => {
  if (route.path === menu.path) return true;
}
</script>

<template>
  <div v-if="!CheckDisabledMenu()" class="menu">
    <div class="items">
      <div 
        v-for="item in menuItems"
        :key="item.name"
        @click="SwitchMenu(item)"
        class="item"
        :class="{ active: CheckActiveMenu(item) }"
      >
        <img :src="item.icon" alt="icon" />
        <h4>{{ $t('menu.' + item.id) }}</h4>
      </div>
    </div>
  </div>
</template>

<style lang="scss" src="./Menu.scss" scoped></style>