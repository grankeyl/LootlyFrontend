import { Buffer } from 'buffer';
import process from 'process';

(globalThis as any).Buffer ??= Buffer;
(globalThis as any).process ??= process;
(globalThis as any).global ??= globalThis;

import { createApp } from "vue";
import { createPinia } from "pinia";
import { localization } from './localization/localization';
import { Confirm } from 'notiflix'

import router from "./router/index";
import App from "./App.vue";
import i18next from 'i18next';
import I18NextVue from 'i18next-vue';

import VueToast from 'vue-toast-notification'
import 'vue-toast-notification/dist/theme-sugar.css';

import "@/assets/styles/base.scss";

Confirm.init({ zindex: 10000 })
i18next.init({
  lng: 'ru',
  interpolation: {
    escapeValue: false
  },
  fallbackLng: 'en',
  resources: {
    ru: { translation: localization.ru },
    en: { translation: localization.en },
  },
});

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(I18NextVue, {i18next});
app.use(VueToast, {
  position: 'top-right',
  duration: 300000,
  zIndex: 10001,
});
app.mount("#app");