<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue';
import { showErrorToast, showSuccessToast } from '../../../../utils/toastManager';
import { tonConnectUI } from '../../../../hooks/useTonConnect';
import { beginCell, toNano, Address } from '@ton/core';
import { toUserFriendlyAddress } from 'ton-ui-vue';
import { copyToClipboard } from '../../../../utils/copyToClipboard';
import { useTranslation } from 'i18next-vue';
import { cutNumber } from '../../../../utils/useTon';

import * as APIWallet from '../../../../api/wallet';

// Icons
import CloseIcon from '@/assets/icons/close.svg';
import TonIcon from '@/assets/icons/ton.svg';
import TonWhiteIcon from '@/assets/icons/ton-white.svg';
import TonWhiteRawIcon from '@/assets/icons/ton-white.svg?raw';
import SbpRawIcon from '@/assets/icons/sbp.svg?raw';
import SbpIcon from '@/assets/icons/sbp.svg';
import AddBlackIcon from '@/assets/icons/add-black.svg?raw';
import BackspaceIcon from '@/assets/icons/backspace.svg';
import SwapIcon from '@/assets/icons/swap.svg';
import ScanIcon from '@/assets/icons/scan.svg';
import LinkRawIcon from '@/assets/icons/link.svg?raw';
import CopyRawIcon from '@/assets/icons/copy.svg?raw';
import RubIcon from '@/assets/icons/rub.svg';
import DoneRawIcon from '@/assets/icons/done.svg?raw';
import TelegramModule from '../../../../hooks/useTelegram';
import EqualIcon from '@/assets/icons/equal.svg';

const { t } = useTranslation();

// amountStr — это то, что вводит пользователь в текущей (левой) валюте
const amountStr = ref<string>('5');
const walletAddress = ref('...');
const method = ref<'ton' | 'sbp'>('ton');
const status = ref<string>('');

// priceQuote.rub — курс: RUB за 1 TON
const priceQuote = ref<any>(null);

// false => вводим TON (слева TON, справа RUB)
// true  => вводим RUB (слева RUB, справа TON)
const isReversed = ref(false);

const loadingButton = ref(false);
const depositSbpItem = ref<any>(null);
const depositQrCodeItem = ref<any>(null);
const qrLoading = ref(false);
const qrTimer = ref<number | null>(null);

// Таймер: оставшееся время в секундах
const qrSecondsLeft = ref(0);
const qrTimerText = computed(() => {
  const m = Math.floor(qrSecondsLeft.value / 60)
    .toString()
    .padStart(2, '0');
  const s = (qrSecondsLeft.value % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
});

// фиксируем значения на момент генерации QR (чтобы UI не "прыгал")
const requestedTonStr = ref<string>('');
const requestedRubStr = ref<string>('');

const emit = defineEmits<{
  (e: 'close'): void;
}>();

function normalizeNumStr(v: string) {
  return String(v ?? '').trim().replace(',', '.');
}

function parseNum(v: string) {
  const n = parseFloat(normalizeNumStr(v));
  return Number.isFinite(n) ? n : 0;
}

// Точное преобразование десятичной строки в nano (BigInt) с 9 знаками после точки
function toNanoFromDecimalStr(v: string): bigint {
  const s = normalizeNumStr(v);
  const n = parseFloat(s);
  if (!Number.isFinite(n) || n <= 0) return 0n;

  const [iRaw = '0', fRaw = ''] = s.split('.');
  const i = (iRaw.match(/^\d+/)?.[0] ?? '0');
  const frac = (fRaw + '000000000').slice(0, 9).replace(/\D/g, '0');
  return BigInt(i) * 1_000_000_000n + BigInt(frac);
}

function formatTon(v: number) {
  if (!Number.isFinite(v) || v <= 0) return '0';
  return v.toFixed(2).replace(/\.?0+$/, '');
}

function formatRub(v: number) {
  if (!Number.isFinite(v) || v <= 0) return '0';
  // рубли обычно 2 знака
  return v.toFixed(2).replace(/\.?0+$/, '');
}

const rateRubPerTon = computed(() => {
  const r = Number(priceQuote.value?.rub);
  return Number.isFinite(r) && r > 0 ? r : 0;
});

// Введённая сумма в TON (всегда), пересчитывается из amountStr и isReversed
const tonAmount = computed(() => {
  const r = rateRubPerTon.value;
  const v = parseNum(amountStr.value);
  if (!v) return 0;

  // вводим TON
  if (!isReversed.value) return v;

  // вводим RUB
  if (!r) return 0;
  return v / r;
});

// Введённая сумма в RUB (всегда)
const rubAmount = computed(() => {
  const r = rateRubPerTon.value;
  const v = parseNum(amountStr.value);
  if (!v) return 0;

  // вводим RUB
  if (isReversed.value) return v;

  // вводим TON
  if (!r) return 0;
  return v * r;
});

const rightDisplayText = computed(() => {
  return isReversed.value ? formatTon(tonAmount.value) : formatRub(rubAmount.value);
});

function clearQrTimer() {
  if (qrTimer.value !== null) {
    clearInterval(qrTimer.value);
    qrTimer.value = null;
  }
}

function startQrTimer() {
  clearQrTimer();
  qrSecondsLeft.value = 20 * 60; // 20 минут

  qrTimer.value = window.setInterval(() => {
    if (qrSecondsLeft.value > 0) {
      qrSecondsLeft.value--;
    } else {
      clearQrTimer();
      close();
    }
  }, 1000);
}

function close() {
  clearQrTimer();
  emit('close');
}

function swapCurrencies() {
  const r = rateRubPerTon.value;

  // если курса нет — просто меняем сторону, но правое поле будет 0
  if (!r) {
    isReversed.value = !isReversed.value;
    return;
  }

  if (!isReversed.value) {
    // TON -> RUB
    amountStr.value = formatRub(rubAmount.value);
    isReversed.value = true;
  } else {
    // RUB -> TON
    amountStr.value = formatTon(tonAmount.value);
    isReversed.value = false;
  }
}

function tap(val: number | '.') {
  const s = String(amountStr.value);

  if (val === '.') {
    if (!s) {
      amountStr.value = '0.';
      return;
    }
    if (s.includes('.')) return;
    amountStr.value = s + '.';
    return;
  }

  let next = (s === '0' ? '' : s) + String(val);

  const [int = '', frac = ''] = next.split('.');
  if (frac && frac.length > 2) return; // максимум 2 знака после точки

  if (!frac && int.length > 1 && int.startsWith('0')) {
    next = String(Number(int));
  }
  if (next.length > 20) return;

  amountStr.value = next;
}

function backspace() {
  const s = String(amountStr.value ?? '');
  if (!s) return;
  amountStr.value = s.slice(0, -1) || '0';
}

function openLink(link: string) {
  if (!link) return;
  TelegramModule.useMediumHaptic();
  window.open(link, '_blank');
}

function copyLink(link: string) {
  if (!link) return;
  TelegramModule.useMediumHaptic();
  copyToClipboard(link);
  showSuccessToast(t('extra.linkCopied'));
}

async function depositSbp() {
  if (method.value !== 'sbp') return false;

  if (!rateRubPerTon.value) {
    showErrorToast(t('extra.somethingWentWrong'));
    return false;
  }

  const tonStr = formatTon(tonAmount.value);
  const rubStr = formatRub(rubAmount.value);
  const tonNano = toNanoFromDecimalStr(tonStr);

  if (tonNano <= 0n) return false;

  // фиксируем значения на момент генерации QR
  requestedTonStr.value = tonStr;
  requestedRubStr.value = rubStr;

  loadingButton.value = true;

  // @ts-ignore
  const res = await APIWallet.paymentQr(tonNano.toString(), tonNano.toString());

  if (!res || !res.ok) {
    loadingButton.value = false;
    showErrorToast(t('extra.somethingWentWrong'));
    return false;
  }

  status.value = 'sbp_processed';
  depositSbpItem.value = res;
  loadingButton.value = false;

  // если бэкенд вернул точную сумму в рублях — используем её для отображения
  if (res?.pay_rub != null) {
    requestedRubStr.value = String(res.pay_rub);
  }

  qrLoading.value = true;
  const qrCode = await APIWallet.generateQrCode(res.pay_url);
  if (qrCode) {
    depositQrCodeItem.value = qrCode;
  }

  startQrTimer();
  return true;
}

function onQrLoad() {
  qrLoading.value = false;
}

function onQrError() {
  qrLoading.value = false;
}

async function deposit() {
  // SBP: если уже на QR-экране — кнопка «Оплатил»
  if (method.value === 'sbp' && status.value === 'sbp_processed') {
    iAmPaid();
    return;
  }

  // SBP: генерим QR
  if (method.value === 'sbp') {
    await depositSbp();
    return;
  }

  // TON: обычный депозит
  const n = parseFloat(normalizeNumStr(amountStr.value));
  if (!Number.isFinite(n) || n < 0.1) return;

  const nano = toNanoFromDecimalStr(formatTon(n));

  const res = await APIWallet.deposit(Number(nano));
  if (res) {
    await sendPayment(res.address, res.memo, n);
    showSuccessToast(t('extra.walletConnected'));
  } else {
    showErrorToast(t('extra.walletNotConnected'));
  }
}

function iAmPaid() {
  if (!depositSbpItem.value) return false;
  clearQrTimer();
  TelegramModule.useMediumHaptic();
  showSuccessToast(t('extra.waitingForPayment'));
  close();
}

function isSelf(addr: string) {
  const me = Address.parse(tonConnectUI.account!.address);
  return Address.parse(addr).equals(me);
}

async function sendPayment(receiver: string, memo: string, amountTon: number) {
  if (!tonConnectUI.account) {
    showErrorToast(t('extra.connectWallet'));
    return;
  }

  if (isSelf(receiver)) {
    showErrorToast(t('extra.selfTransferBlocked'));
    return;
  }

  const body = beginCell().storeUint(0, 32).storeStringTail(memo ?? '').endCell();
  await tonConnectUI.sendTransaction({
    validUntil: Math.floor(Date.now() / 1000) + 300,
    messages: [
      {
        address: Address.parse(receiver).toString({ bounceable: false }),
        amount: toNano(amountTon).toString(),
        payload: body.toBoc().toString('base64'),
      },
    ],
  });
}

const getTonWalletAddress = async () => {
  if (!tonConnectUI.account) return;
  const rawAddress = tonConnectUI.account.address;
  const walletAddressString = toUserFriendlyAddress(rawAddress);
  walletAddress.value = walletAddressString;
  if (tonConnectUI.connected) {
    await APIWallet.connect(walletAddress.value);
  }
  return walletAddressString;
};

const getPriceQuote = async () => {
  const res = await APIWallet.priceQuote(5).catch(() => null);
  if (!res) return;
  priceQuote.value = res;
};

getTonWalletAddress();
getPriceQuote();

function clampDecimals(v: string, max = 2) {
  const s = normalizeNumStr(v);
  if (!s.includes('.')) return s;
  const [i, f = ''] = s.split('.');
  if (f.length <= max) return s;
  return `${i}.${f.slice(0, max)}`;
}

watch(
  amountStr,
  (v) => {
    const clamped = clampDecimals(v, 2);
    if (clamped !== v) amountStr.value = clamped;
  },
  { immediate: true },
);

watch(
  () => method.value,
  (v) => {
    // при смене метода сбрасываем состояние
    status.value = '';
    requestedTonStr.value = '';
    requestedRubStr.value = '';
    depositSbpItem.value = null;
    depositQrCodeItem.value = null;
    qrLoading.value = false;
    loadingButton.value = false;
    clearQrTimer();

    // в TON режиме swap не нужен
    if (v === 'ton') isReversed.value = false;
  },
);

onUnmounted(() => {
  clearQrTimer();
});
</script>

<template>
  <div class="sheet">
    <div class="close" @click="close">
      <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
    </div>

    <div class="info">
      <img v-if="method === 'ton'" :src="TonWhiteIcon" alt="ton-icon" aria-hidden="true" />
      <img v-if="method === 'sbp'" :src="SbpIcon" alt="sbp-icon" aria-hidden="true" />

      <h4>{{ $t('balance.modals.deposit.title') }}</h4>

      <p v-if="status !== 'sbp_processed'">{{ $t('balance.modals.deposit.descr') }}</p>
      <span v-else><h4>{{ qrTimerText }}</h4></span>
    </div>

    <div v-if="status !== 'sbp_processed'" class="methods">
      <div class="method" :class="{ active: method === 'ton' }" @click="method = 'ton'">
        <h4>TON</h4>
        <div class="kit-icon" v-html="TonWhiteRawIcon"></div>
      </div>
      <div class="method" :class="{ active: method === 'sbp' }" @click="method = 'sbp'">
        <h4>СБП</h4>
        <div class="kit-icon" v-html="SbpRawIcon"></div>
      </div>
    </div>

    <div v-if="method === 'ton' && status !== 'sbp_processed'" class="inputs">
      <div class="input">
        <div class="inner">
          <div class="amount">
            <h4>{{ amountStr }}</h4>
            <p>TON</p>
          </div>
          <div class="image">
            <img :src="TonIcon" alt="ton-icon" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>

    <div v-if="method === 'sbp' || status === 'sbp_processed'" class="inputs">
      <!-- ЛЕВЫЙ (активный) -->
      <div class="input">
        <div class="inner">
          <div class="amount">
            <!-- после генерации QR показываем зафиксированное значение -->
            <h4 v-if="status === 'sbp_processed'">
              {{ isReversed ? requestedRubStr : requestedTonStr }}
            </h4>
            <h4 v-else>
              {{ amountStr }}
            </h4>
            <p>{{ isReversed ? 'RUB' : 'TON' }}</p>
          </div>
          <div class="image">
            <img :src="isReversed ? RubIcon : TonIcon" alt="currency-icon" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div v-if="!status || status !== 'sbp_processed'" class="swap" @click="rateRubPerTon ? swapCurrencies() : null">
        <img :src="SwapIcon" alt="swap-icon" aria-hidden="true" />
      </div>

      <div v-if="status === 'sbp_processed'" class="swap">
        <img :src="EqualIcon" alt="equal-icon" aria-hidden="true" />
      </div>

      <!-- ПРАВЫЙ (readonly) -->
      <div class="input readonly">
        <div class="inner">
          <div class="amount">
            <h4 v-if="status === 'sbp_processed'">
              {{ isReversed ? requestedTonStr : requestedRubStr }}
            </h4>
            <h4 v-else>
              {{ cutNumber(rightDisplayText) }}
            </h4>
            <p>{{ isReversed ? 'TON' : 'RUB' }}</p>
          </div>
          <div class="image">
            <img :src="isReversed ? TonIcon : RubIcon" alt="currency-icon" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>

    <div v-if="status !== 'sbp_processed'" class="num-pad">
      <button v-for="n in [1, 2, 3, 4, 5, 6, 7, 8, 9]" :key="n" @click="tap(n)">
        {{ n }}
      </button>
      <button @click="tap('.')">.</button>
      <button @click="tap(0)">0</button>
      <button class="back" @click="backspace">
        <img :src="BackspaceIcon" alt="backspace-icon" />
      </button>
    </div>

    <div v-if="status === 'sbp_processed'" class="qr-code">
      <div class="qr">
        <div class="ctx">
          <img :src="ScanIcon" alt="scan-icon" aria-hidden="true" />
          <p>{{ $t('balance.modals.deposit.scan') }}</p>
        </div>
        <div class="qr-image">
          <div v-if="qrLoading" class="qr-loader">
            <div class="spinner"></div>
          </div>
          <img
            v-if="depositQrCodeItem"
            :src="depositQrCodeItem"
            alt="qr-image"
            @load="onQrLoad"
            @error="onQrError"
          />
        </div>
        <div class="link">
          <p>{{ depositSbpItem?.pay_url }}</p>
        </div>
      </div>

      <div class="controls">
        <div @click="openLink(depositSbpItem?.pay_url)" class="control">
          <div class="kit-icon" v-html="LinkRawIcon"></div>
          <h4>{{ $t('balance.modals.deposit.link') }}</h4>
        </div>
        <div @click="copyLink(depositSbpItem?.pay_url)" class="control">
          <div class="kit-icon" v-html="CopyRawIcon"></div>
        </div>
      </div>
    </div>

    <div class="buttons">
      <button v-if="loadingButton" class="loading">
        <div class="spinner"></div>
      </button>

      <button v-else @click="deposit">
        <div v-if="status === 'sbp_processed'" class="kit-icon done" v-html="DoneRawIcon"></div>
        <div v-else class="kit-icon" v-html="AddBlackIcon"></div>

        <h4 v-if="status === 'sbp_processed'">{{ $t('balance.modals.deposit.buttons.paid') }}</h4>
        <h4 v-else>{{ $t('balance.modals.deposit.buttons.deposit') }}</h4>
      </button>
    </div>
  </div>
</template>

<style lang="scss" src="./Deposit.scss" scoped></style>