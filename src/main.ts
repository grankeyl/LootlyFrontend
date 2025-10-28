import { Buffer } from 'buffer';
import process from 'process';

(globalThis as any).Buffer ??= Buffer;
(globalThis as any).process ??= process;
(globalThis as any).global ??= globalThis;

import { createApp } from "vue";
import { createPinia } from "pinia";

import router from "./router/index";
import App from "./App.vue";

import "@/assets/styles/base.scss";

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");