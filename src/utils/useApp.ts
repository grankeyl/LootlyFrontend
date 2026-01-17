import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { pluralize as pluralizeRu } from "numeralize-ru";

import * as inflection from "inflection";

import 'dayjs/locale/en';

dayjs.extend(relativeTime);
 
const msToWholeSec = (ms: any) => Math.floor(ms / 1000);

const getUserLanguage = (): 'ru' | 'en' => {
  return navigator.language.startsWith('ru') ? 'ru' : 'en';
};

const unixToDefault = (unix: number) => {
  const date = new Date(unix * 1000);
  const formattedDate = date
    .toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    .replace(/\//g, '.');

  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return `${formattedDate} at ${formattedTime}`;
};

const unixToRelative = (unix: number) => {
  dayjs.locale('ru');
  return dayjs.unix(unix / 1000).fromNow();
};

const randomString = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 10 }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
}

const cleanString = (str: string) => {
  if (!str) return '';
  return str.replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s]/g, '');
}

export const getImageUrl = (nftKey: string) => {
  if (!nftKey) return '';
  const nftKeyCleaned = nftKey.replace('nft_', 'gift_');
  const bucketsLink = import.meta.env.VITE_APP_S3_LINK;
  return `${bucketsLink}/gifts/png/${nftKeyCleaned}.png`;
};

export const getImageUrlSvg = (nftKey: string) => {
  if (!nftKey) return '';
  const nftKeyCleaned = nftKey;
  const bucketsLink = import.meta.env.VITE_APP_S3_LINK;
  return `${bucketsLink}/gifts/${nftKeyCleaned}.svg`;
};

export const obfuscateAddress = (address: string) => {
    const startLength = 3;
    const endLength = 5;
    const str = address.slice(0, startLength) + "..." + address.slice(-endLength);
    if (str.length <= startLength + endLength) return str;
    return `${str.slice(0, startLength)}...${str.slice(-endLength)}`;
};

export const splitCamelCase = (name: string) => {
  return name.replace(/([a-z])([A-Z])/g, '$1 $2');
};

export const pluralizeReferrals = (word: string, count: number, lang: string = 'en') => {
    if (lang === "ru") return pluralizeRu(count, "реферал", "реферала", "рефералов");
    return inflection.inflect(word, count);
};

export const getImgSvg = (uri?: string) => {
  if (!uri || uri.includes('undefined')) {
    return '';
  }

  const bucketsLink = (import.meta.env.VITE_APP_S3_URL || '').replace(/\/$/, '');
  const cleanUri = String(uri).replace(/^\//, '');
  return `${bucketsLink}/${cleanUri}`;
};

export async function waitForFonts(
  families: string[] = ['SFRounded'],
  weights: (number | string)[] = [100,300,400,500,600,700,800,900],
  styles: string[] = ['normal'],
  timeoutMs = 4000
) {
  if (typeof document === 'undefined' || !('fonts' in document)) {
    await new Promise(r => setTimeout(r, 600));
    return;
  }

  const loads: Promise<FontFace[]>[] = [];
  for (const fam of families) {
    for (const w of weights) {
      for (const st of styles) {
        loads.push(document.fonts.load(`${st} ${w} 1rem "${fam}"`));
      }
    }
  }

  const all = Promise.allSettled(loads);
  const t = new Promise<void>(r => setTimeout(r, timeoutMs));
  await Promise.race([all.then(() => undefined), t]);

  try { await (document.fonts as FontFaceSet).ready; } catch {}
}

export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function maskUsername(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return value;
  const hasAt = trimmed.startsWith("@");
  const pure = hasAt ? trimmed.slice(1) : trimmed;
  if (pure.length < 3) return trimmed;
  const start = pure.slice(0, 2);
  const end = pure.slice(-1);
  const stars = "*".repeat(pure.length - 3);
  return (hasAt ? "@" : "") + start + stars + end;
}
const TG_COLORS = [
  ["#4f46e5", "#4338ca"], // indigo
  ["#2563eb", "#1d4ed8"], // blue
  ["#0284c7", "#0369a1"], // sky
  ["#0891b2", "#0e7490"], // cyan
  ["#0d9488", "#0f766e"], // teal
  ["#059669", "#047857"], // green
  ["#65a30d", "#4d7c0f"], // lime
  ["#ca8a04", "#a16207"], // yellow dark
  ["#ea580c", "#c2410c"], // orange
  ["#dc2626", "#b91c1c"], // red
  ["#be185d", "#9d174d"], // pink
  ["#9333ea", "#7e22ce"], // violet
];

function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function telegramAvatarBg(name: string): string {
  const g = TG_COLORS[hashString(name) % TG_COLORS.length];
  return `linear-gradient(135deg, ${g[0]}, ${g[1]})`;
}

export { msToWholeSec, getUserLanguage, unixToDefault, unixToRelative, randomString, cleanString };