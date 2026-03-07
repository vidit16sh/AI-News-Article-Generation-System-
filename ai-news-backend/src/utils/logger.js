const LEVELS = new Set(['INFO', 'WARN', 'ERROR']);

export const logEvent = (service, event, data = {}, level = 'INFO') => {
  const normalizedLevel = LEVELS.has(level) ? level : 'INFO';
  const payload = {
    ts: new Date().toISOString(),
    level: normalizedLevel,
    service,
    event,
    ...data,
  };

  const line = JSON.stringify(payload);
  if (normalizedLevel === 'ERROR') {
    console.error(line);
    return;
  }
  if (normalizedLevel === 'WARN') {
    console.warn(line);
    return;
  }
  console.log(line);
};
