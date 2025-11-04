import { Buffer } from 'buffer';
import process from 'process';

(globalThis as any).Buffer ??= Buffer;
(globalThis as any).process ??= process;
(globalThis as any).global ??= globalThis;

import { createApp } from "vue";
import { createPinia } from "pinia";
import { localization } from './localization/localization';

import router from "./router/index";
import App from "./App.vue";
import i18next from 'i18next';
import I18NextVue from 'i18next-vue';

import "@/assets/styles/base.scss";

i18next.init({
  lng: 'ru',
  interpolation: {
    escapeValue: false
  },
  fallbackLng: 'en',
  resources: {
    en: { translation: localization.ru },
  },
});

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(I18NextVue, {i18next});
app.mount("#app");