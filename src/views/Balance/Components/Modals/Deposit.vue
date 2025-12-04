<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from 'vue' // NEW
import { showErrorToast, showSuccessToast } from '../../../../utils/toastManager';
import { tonConnectUI } from '../../../../hooks/useTonConnect';
import { beginCell, toNano, Address } from '@ton/core';
import { toUserFriendlyAddress } from 'ton-ui-vue';
import { copyToClipboard } from '../../../../utils/copyToClipboard';
import { useTranslation } from 'i18next-vue';

import * as APIWallet from '../../../../api/wallet';

// Icons
import CloseIcon from "@/assets/icons/close.svg";
import TonIcon from "@/assets/icons/ton.svg";
import TonWhiteIcon from "@/assets/icons/ton-white.svg";
import TonWhiteRawIcon from "@/assets/icons/ton-white.svg?raw";
import SbpRawIcon from "@/assets/icons/sbp.svg?raw";
import SbpIcon from "@/assets/icons/sbp.svg";
import AddBlackIcon from "@/assets/icons/add-black.svg?raw";
import BackspaceIcon from "@/assets/icons/backspace.svg";
import SwapIcon from "@/assets/icons/swap.svg";
import ScanIcon from "@/assets/icons/scan.svg";
import LinkRawIcon from "@/assets/icons/link.svg?raw";
import CopyRawIcon from "@/assets/icons/copy.svg?raw";
import RubIcon from "@/assets/icons/rub.svg";
import DoneRawIcon from "@/assets/icons/done.svg?raw";
import TelegramModule from '../../../../hooks/useTelegram';
import EqualIcon from "@/assets/icons/equal.svg";

const { t } = useTranslation();

const amountStr = ref<string>('5');
const walletAddress = ref('...');
const method = ref<string>('ton');
const status = ref<string>('');

const priceQuote = ref<any>(null);

const isReversed = ref(false);
const loadingButton = ref(false);
const depositSbpItem = ref<any>(null);
const depositQrCodeItem = ref<any>(null);
const qrLoading = ref(false);
const qrTimer = ref<number | null>(null);

// NEW: оставшееся время в секундах
const qrSecondsLeft = ref(0);

// NEW: форматируем в MM:SS
const qrTimerText = computed(() => {
  const m = Math.floor(qrSecondsLeft.value / 60).toString().padStart(2, '0');
  const s = (qrSecondsLeft.value % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
});

const emit = defineEmits<{
  (e: 'close'): void;
}>();

function clearQrTimer() {          // NEW
  if (qrTimer.value !== null) {
    clearInterval(qrTimer.value);
    qrTimer.value = null;
  }
}

// NEW: запуск таймера на 20 минут
function startQrTimer() {
  clearQrTimer();
  qrSecondsLeft.value = 20 * 60; // 20 минут

  qrTimer.value = window.setInterval(() => {
    if (qrSecondsLeft.value > 0) {
      qrSecondsLeft.value--;
    } else {
      clearQrTimer();
      // время вышло — закрываем модалку
      close();
    }
  }, 1000);
}

function close() {
  clearQrTimer();                  // NEW — чтобы не текли интервалы
  emit('close');
}

function swapCurrencies() {
  isReversed.value = !isReversed.value;
}

function tap(val: number | '.') {
  const s = String(amountStr.value)

  if (val === '.') {
    if (!s) { amountStr.value = '0.'; return }
    if (s.includes('.')) return
    amountStr.value = s + '.'
    return
  }

  let next = (s === '0' ? '' : s) + String(val)

  const [int = '', frac = ''] = next.split('.')
  if (frac && frac.length > 9) return // максимум 9 знаков после точки

  if (!frac && int.length > 1 && int.startsWith('0')) {
    next = String(Number(int))
  }
  if (next.length > 20) return

  amountStr.value = next
}

function backspace() {
  const s = String(amountStr.value ?? '')
  if (!s) return
  amountStr.value = s.slice(0, -1) || '0'
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
  if (method.value === 'sbp') {
    const amountTon = Number(amountStr.value) + '0'.repeat(9) as any;
    loadingButton.value = true;

    const res = await APIWallet.paymentQr(
      amountTon, amountTon
    );
    if (!res || !res.ok) {
      loadingButton.value = false;
      showErrorToast(t('extra.somethingWentWrong'));
      return false;
    };
    
    if (res.ok) {
      status.value = 'sbp_processed';
      depositSbpItem.value = res;
      loadingButton.value = false;
      isReversed.value = true;

      qrLoading.value = true;
      const qrCode = await APIWallet.generateQrCode(res.pay_url);
      if (qrCode) {
        depositQrCodeItem.value = qrCode;
      }

      startQrTimer();
      
      return true;
    }
  };
}

function onQrLoad() {
  qrLoading.value = false;
}

function onQrError() {
  qrLoading.value = false;
}

async function deposit() {
  if (method.value === 'sbp' && status.value === 'sbp_processed') {
    iAmPaid();
    return;
  }

  if (method.value === 'sbp') {
    depositSbp();
    return;
  };

  const n = parseFloat(amountStr.value.replace(',', '.'));
  if (!Number.isFinite(n) || n < 0.1) return;

  const [i = '0', f = ''] = String(n).split('.');
  const frac = (f + '000000000').slice(0, 9);
  const nano = (BigInt(i) * 1_000_000_000n) + BigInt(frac);

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
  if (!tonConnectUI.account) { showErrorToast(t('extra.connectWallet')); return; }

  if (isSelf(receiver)) {
    showErrorToast(t('extra.selfTransferBlocked'));
    return;
  }

  const body = beginCell().storeUint(0, 32).storeStringTail(memo ?? '').endCell();
  await tonConnectUI.sendTransaction({
    validUntil: Math.floor(Date.now() / 1000) + 300,
    messages: [{
      address: Address.parse(receiver)
        .toString({ bounceable: false }),
      amount: toNano(amountTon).toString(),
      payload: body.toBoc().toString('base64'),
      // bounce: false
    }]
  });
}

const getTonWalletAddress = async () => {
  if (!tonConnectUI.account) return;
  const rawAddress = tonConnectUI.account.address;
  const walletAddressString = toUserFriendlyAddress(rawAddress);
  walletAddress.value = walletAddressString;
  if (tonConnectUI.connected) { await APIWallet.connect(walletAddress.value); }
  return walletAddressString;
}

const getPriceQuote = async () => {
  const res = await APIWallet.priceQuote(1).catch(() => null);
  if (!res) return;
  priceQuote.value = res;
}

getTonWalletAddress();
getPriceQuote();

watch(() => method.value, (v) => {
  if (v === 'sbp') status.value = '';
  if (v === 'ton') status.value = '';
});

// NEW: safety — чистим интервал при размонтировании
onUnmounted(() => {
  clearQrTimer();
});
</script>

<template>
  <div class="sheet">
    <div class="close">
      <img :src="CloseIcon" alt="close-icon" aria-hidden="true" />
    </div>

    <div class="info">
      <img v-if="method === 'ton'" :src="TonWhiteIcon" alt="ton-icon" aria-hidden="true" />
      <img v-if="method === 'sbp'" :src="SbpIcon" alt="ton-icon" aria-hidden="true" />

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
            <h4 v-if="isReversed">{{ depositSbpItem?.pay_rub ?? amountStr }}</h4>
            <h4 v-if="!isReversed">{{ amountStr }}</h4>
            <p>{{ isReversed ? 'RUB' : 'TON' }}</p>
          </div>
          <div class="image">
            <img :src="isReversed ? RubIcon : TonIcon" alt="currency-icon" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div v-if="!status || status !== 'sbp_processed'" class="swap" @click="swapCurrencies">
        <img :src="SwapIcon" alt="swap-icon" aria-hidden="true" />
      </div>

      <div v-if="status === 'sbp_processed'" class="swap">
        <img :src="EqualIcon" alt="swap-icon" aria-hidden="true" />
      </div>

      <div class="input readonly">
        <div v-if="isReversed" class="inner">
          <div class="amount">
            <h4>{{ amountStr }}</h4>
            <p>TON</p>
          </div>
          <div class="image">
            <img :src="TonIcon" alt="currency-icon" aria-hidden="true" />
          </div>
        </div>
        <div v-if="!isReversed" class="inner">
          <div class="amount">
            <h4>{{ depositSbpItem?.pay_rub ?? amountStr }}</h4>
            <p>RUB</p>
          </div>
          <div class="image">
            <img :src="RubIcon" alt="currency-icon" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>

    <div v-if="status !== 'sbp_processed'" class="num-pad">
      <button v-for="n in [1,2,3,4,5,6,7,8,9]" :key="n" @click="tap(n)">{{ n }}</button>
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
          <p>Сканируй через “Камера”</p>
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
          <p>{{ depositSbpItem.pay_url }}</p>
        </div>
      </div>

      <div v-if="status === 'sbp_processed'" class="controls">
        <div @click="openLink(depositSbpItem?.pay_url)" class="control">
          <div class="kit-icon" v-html="LinkRawIcon"></div>
          <h4>Перейти</h4>
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

      <button v-if="!loadingButton" @click="deposit">
        <div v-if="status === 'sbp_processed'" class="kit-icon done" v-html="DoneRawIcon"></div>
        <div v-else class="kit-icon" v-html="AddBlackIcon"></div>

        <h4 v-if="status === 'sbp_processed'">{{ $t('balance.modals.deposit.buttons.paid') }}</h4>
        <h4 v-else>{{ $t('balance.modals.deposit.buttons.deposit') }}</h4>
      </button>
    </div>
  </div>
</template>

<style lang="scss" src="./Deposit.scss" scoped></style>