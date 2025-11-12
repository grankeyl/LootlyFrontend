import { reactive, markRaw, readonly } from 'vue';

export type PopupInstance = {
  id: number;
  component: any;
  props: Record<string, any>;
  options: Record<string, any>;
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
};

type State = { stack: PopupInstance[] };
const state: State = reactive({ stack: [] });

let idSeed = 0;

export function usePopup() {
  function open(component: any, props?: any, options: any = {}) {
    const id = ++idSeed;
    const layer = state.stack.length;
    const inst: PopupInstance = {
      id,
      component: markRaw(component),
      props: { ...(props ?? {}), _layer: layer },
      options,
      resolve: undefined as any,
      reject: undefined as any,
    };
    const done = new Promise((resolve, reject) => { inst.resolve = resolve; inst.reject = reject; });
    state.stack.push(inst);
    return { id, done };
  }

  function close(id: number, payload?: any) {
    const i = state.stack.findIndex(m => m.id === id);
    if (i !== -1) {
      const inst = state.stack[i];
      state.stack.splice(i, 1);
      inst.resolve?.(payload);
    }
  }

  function dismiss(id: number, reason?: any) {
    const i = state.stack.findIndex(m => m.id === id);
    if (i !== -1) {
      const inst = state.stack[i];
      state.stack.splice(i, 1);
      inst.reject?.(reason);
    }
  }

  // 👇 Новое: закрыть все сразу (resolve) или отклонить все (reject)
  function closeAll(payload?: any) {
    if (!state.stack.length) return;
    const all = state.stack.splice(0, state.stack.length);
    for (const inst of all) inst.resolve?.(payload);
  }

  function dismissAll(reason?: any) {
    if (!state.stack.length) return;
    const all = state.stack.splice(0, state.stack.length);
    for (const inst of all) inst.reject?.(reason ?? 'force-dismiss-all');
  }

  // (по желанию) закрыть только верхнюю
  function closeTop(payload?: any) {
    const top = state.stack[state.stack.length - 1];
    if (top) close(top.id, payload);
  }
  function dismissTop(reason?: any) {
    const top = state.stack[state.stack.length - 1];
    if (top) dismiss(top.id, reason);
  }

  return {
    state: readonly(state),
    open,
    close,
    dismiss,
    update(id: number, patch: Record<string, any>) {
      const inst = state.stack.find(m => m.id === id);
      if (inst) Object.assign(inst.props as any, patch);
    },
    closeAll,
    dismissAll,
    closeTop,
    dismissTop,
  };
}