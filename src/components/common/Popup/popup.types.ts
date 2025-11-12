import type { Component } from 'vue';

export type PopupOptions = {
  clickToClose?: boolean;   // по клику на оверлей
  escToClose?: boolean;     // закрытие по Esc
  noPadding?: boolean;      // для полноэкранных кейсов
  width?: number | string;  // max-width контейнера
  ariaLabel?: string;
};

export type PopupExpose<TResult = any> = {
  close: (payload?: TResult) => void;
  dismiss: (reason?: any) => void;
};

export type PopupAny<TProps = any> = Component<
  TProps & { popupId: number }
>;

export type PopupInstance = {
  id: number;
  component: Component;
  props: Record<string, any>;
  options: PopupOptions;
  resolve?: (v?: any) => void;
  reject?: (v?: any) => void;
};