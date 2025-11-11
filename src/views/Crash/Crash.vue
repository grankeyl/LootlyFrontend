<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { msToWholeSec } from "../../utils/useApp";
import { showErrorToast, showSuccessToast } from "../../utils/toastManager";
import { useCacheStore } from "../../stores/pinia-store";
import { tonToNano } from "../../utils/useTon";

import * as APICrash from "./../../api/crash";

import Game from "./Components/Game/Game.vue";
import Tabs from "./Components/Tabs/Tabs.vue";
import Users from "./Components/Users/Users.vue";
import Header from "../../components/common/Header/Header.vue";
import TelegramModule from "../../hooks/useTelegram";

const useCache = useCacheStore() as any;
const pageRef = ref<HTMLElement | null>(null);

const GameStatus = ref<string>("loading");
const GameBettingEtaMs = ref<number>(7);
const GameX = ref<number>(0);
const GameBet = ref<number>(0.1);
const GameBetLoading = ref<boolean>(false);
const GameBetActual = ref<number>(0);
const GameLastCrashes = ref<object>([]);
const GameBets = ref<object>([]);
const GameOnline = ref<number>(2);

const GameAutoX = ref<number>(1.1);
const GameAutoXText = ref<string>('');
const GameAutoWithdraw = ref(false);

const FastBetList = ref<object>([
  { id: 1, price: 1 },
  { id: 2, price: 3 },
  { id: 3, price: 10 },
  { id: 4, price: 30 },
  { id: 5, price: 50 },
]);

let ws: WebSocket | null = null;

onMounted(() => {
  const initData = TelegramModule.initDataRaw()
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const qs = new URLSearchParams({ 'init-data': String(initData) }).toString()

  const url = `${proto}://${location.host}/ws/crash?${qs}`
  ws = new WebSocket(url)

  ws.addEventListener('open', () => {
    // опционально: если сервер ждет ещё "init"-сообщение в payload
    ws?.send(JSON.stringify({ type: 'init' }))
  })

  ws.addEventListener("message", (e: MessageEvent) => {
    if (typeof e.data !== "string") return;
    try {
      const msg = JSON.parse(e.data);
      const msgData = msg;
      // console.log(msg);

      if (msgData.last_crashes) {  GameLastCrashes.value = msgData.last_crashes; }
      if (msgData.bets) {  GameBets.value = msgData.bets; }
      if (msgData.online) {  GameOnline.value = msgData.online; }

      if (msgData.phase && msgData.multiplier) {
        if (GameStatus.value !== 'playing') { GameStatus.value = 'playing'; };
        GameX.value = msgData.multiplier;
      }
      if (msgData.phase && msgData.phase === 'countdown') {
        GameStatus.value = 'prepare';
        GameX.value = 0;
        GameBettingEtaMs.value = msToWholeSec(msgData.left_ms);
      }
      if (msgData.phase && msgData.phase === 'round_end') {
        GameStatus.value = 'completed';
        GameX.value = msgData.crash_at;
        GameBetActual.value = 0;
      }
    } catch {}
  });

  ws.addEventListener("error", (err) => {
    console.error("WS error", err);
  });

  ws.addEventListener("close", () => {
    ws = null;
  });
});

onBeforeUnmount(() => {
  ws?.close(1000, "page-unmount");
  ws = null;
});

function toBigInt(v: unknown): bigint {
  return typeof v === 'bigint' ? v : BigInt(String(v ?? 0));
}

async function placeBit(payload: any) {
  const initData = TelegramModule.initData() as any;

  if (!payload) return;
  const bet = Number(payload.bet);

  if (!Number.isFinite(bet) || bet < 0.1) {
    showErrorToast('Minimum bet is 0.1');
    return;
  }

  const betNano = tonToNano(bet);
  const current = toBigInt(useCache.UserData.BalanceNano);

  if (current < betNano) {
    showErrorToast('Not enough TON');
    return;
  }

  if (GameBetLoading.value) return;
  GameBetLoading.value = true;

  const autoCashout = GameAutoWithdraw.value ? GameAutoX.value : 0;
  const res = await APICrash.bet(
    initData.user.id,
    bet,
    autoCashout
  );
  if (res?.status !== 'ok') return;
  if (res.bet) {
    useCache.UserData.BalanceNano = current - betNano;
    GameBetActual.value += bet;
    GameBetLoading.value = false;
    showSuccessToast('Placed bit');
  }
}

function setGameBetActual(value: number) {
  GameBetActual.value = value;
}
</script>

<template>
  <div class="page" ref="pageRef">
    <Header />

    <div class="content">
      <Game
        @SetGameX="GameX = $event"

        :GameStatus="GameStatus"
        :GameBettingEtaMs="GameBettingEtaMs"
        :GameX="GameX"
        :GameOnline="GameOnline"
      />
      <Tabs 
        @SetFastBet="GameBet = $event"
        @SetGameBetActual="setGameBetActual"
        @PlaceBit="placeBit"

        :GameX="GameX"
        :GameBet="GameBet"
        :GameBetActual="GameBetActual"
        :GameStatus="GameStatus"
        :GameLastCrashes="GameLastCrashes"

        @SetGameAutoX="GameAutoX = $event"
        @SetGameAutoXText="GameAutoXText = $event"
        @SetGameAutoWithdraw="GameAutoWithdraw = $event"

        :GameAutoX="GameAutoX"
        :GameAutoXText="GameAutoXText"
        :GameAutoWithdraw="GameAutoWithdraw"

        :FastBetList="FastBetList"
      />
      <Users
        :GameBets="GameBets"
      />
    </div>
  </div>
</template>

<style lang="scss" src="./Crash.scss" scoped></style>