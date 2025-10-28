import { TonConnectUI, THEME } from '@tonconnect/ui';

const url = import.meta.env.VITE_APP_URL;

export const tonConnectUI = new TonConnectUI({
  manifestUrl: `${url}/tonconnect-manifest.json`,
});

tonConnectUI.uiOptions = {
  language: 'en',
  uiPreferences: {
    theme: THEME.DARK,
  },
};