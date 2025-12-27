type UseTasksPollingOpts = {
  fetchAndReplace: () => Promise<boolean>;
  isDone: (t: any) => boolean | undefined;
  getTasks: () => any[];
  setTasks: (tasks: any[]) => void;
  onCacheSync?: () => void;
  intervalMs?: number;
};

export function useTasksPolling(opts: UseTasksPollingOpts) {
  const intervalMs = opts.intervalMs ?? 2000;

  let timer: number | null = null;
  let inFlight = false;

  function stop() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function shouldContinue() {
    const tasks = opts.getTasks() || [];
    const anyLoading = tasks.some((t: any) => !!t?.loading);
    const allDone = tasks.length > 0 && tasks.every((t: any) => !!opts.isDone(t));
    return anyLoading && !allDone;
  }

  async function loop() {
    if (inFlight) return;
    inFlight = true;

    try {
      await opts.fetchAndReplace();

      // once backend reports done=true, drop loading
      opts.setTasks(
        (opts.getTasks() || []).map((t: any) => ({
          ...t,
          loading: opts.isDone(t) ? false : !!t?.loading,
        }))
      );

      opts.onCacheSync?.();

      if (!shouldContinue()) {
        stop();
        return;
      }

      timer = window.setTimeout(loop, intervalMs);
    } finally {
      inFlight = false;
    }
  }

  function start() {
    if (timer !== null) return;
    timer = window.setTimeout(loop, 0);
  }

  return { start, stop };
}