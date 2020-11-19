export function bindHeartBeat(
  _lastread_timestamp: number, 
  _lastwrite_timestamp: number, 
  time: number, 
  callback: () => Promise<void>
) {
  if (time > 0) {
    const timer = setInterval(() => {
      const now = Date.now();
      const timeout = time * 3;
      const rt = now - _lastread_timestamp;
      const wt = now - _lastwrite_timestamp;
      if (rt > timeout && wt > timeout) {
  
      }
    }, time);
    
  }
}