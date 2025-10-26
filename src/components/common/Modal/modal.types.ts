import type { Component } from 'vue';

export type ModalOptions = {
  clickToClose?: boolean;   // по клику на оверлей
  escToClose?: boolean;     // закрытие по Esc
  noPadding?: boolean;      // для полноэкранных кейсов
  width?: number | string;  // max-width контейнера
  ariaLabel?: string;
};

export type ModalExpose<TResult = any> = {
  close: (payload?: TResult) => void;
  dismiss: (reason?: any) => void;
};

export type ModalAny<TProps = any, TResult = any> = Component<
  TProps & { modalId: number }
>;

export type ModalInstance = {
  id: number;
  component: Component;
  props: Record<string, any>;
  options: ModalOptions;
  resolve?: (v?: any) => void;
  reject?: (v?: any) => void;
};