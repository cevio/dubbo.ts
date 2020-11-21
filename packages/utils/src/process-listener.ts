export function createProcessListener(
  exitHandler: (signal: string) => Promise<void>, 
  errorHandler: (e: any) => unknown
) {
  let closing = false;
  return {
    get closing() {
      return closing;
    },
    addProcessListener() {
      const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT', 'exit'];
      signals.forEach(signal => {
        process.on(signal as any, () => {
          if (closing) return;
          closing = true;
          exitHandler(signal)
            .catch(e => errorHandler(e))
            .finally(() => process.nextTick(() => process.exit(0)));
        })
      })
    }
  };
}