import { reactive, markRaw, readonly } from 'vue';

export type ModalInstance = {
  id: number;
  component: any;
  props: Record<string, any>;
  options: Record<string, any>;
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
};

type State = { stack: ModalInstance[] };
const state: State = reactive({ stack: [] });

let idSeed = 0;

export function useModal() {
  function open(component: any, props?: any, options: any = {}) {
    const id = ++idSeed;
    const layer = state.stack.length;                // 👈 позиция в стеке
    const inst: ModalInstance = {
      id,
      component: markRaw(component),
      props: { ...(props ?? {}), _layer: layer },    // 👈 прокинули
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

  function update(id: number, patch: Record<string, any>) {
    const inst = state.stack.find(m => m.id === id);
    if (inst) Object.assign(inst.props as any, patch);
  }

  return {
    state: readonly(state),
    open,
    close,
    dismiss,
    update,
  };
}