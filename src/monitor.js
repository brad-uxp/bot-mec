import { config } from './config.js';
import { notify } from './notify.js';

const state = {
  isUp: null,
  lastCheckAt: null,
  lastStatus: null,
  lastError: null,
  lastUpAt: null,
  lastDownAt: null,
  consecutiveFailures: 0,
  consecutiveSuccesses: 0,
  checks: 0,
  recoveredAlertSent: false,
  downAlertSent: false,
};

const log = (level, msg, extra = {}) => {
  console.log(JSON.stringify({ level, msg, t: new Date().toISOString(), ...extra }));
};

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  const startedAt = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'bot-mec/0.1 (uptime-monitor)',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const elapsed = Date.now() - startedAt;
    return {
      ok: res.status <= config.successStatusMax,
      status: res.status,
      elapsedMs: elapsed,
      error: null,
    };
  } catch (err) {
    let error;
    if (err.name === 'AbortError') {
      error = `timeout after ${config.requestTimeoutMs}ms`;
    } else {
      const cause = err.cause;
      const causeMsg = cause?.code || cause?.message || cause?.errno;
      error = causeMsg ? `${err.message} (${causeMsg})` : (err.message || String(err));
    }
    return {
      ok: false,
      status: null,
      elapsedMs: Date.now() - startedAt,
      error,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runOnce() {
  state.checks += 1;
  state.lastCheckAt = new Date().toISOString();
  const result = await probe(config.targetUrl);
  state.lastStatus = result.status;
  state.lastError = result.error;

  if (result.ok) {
    state.consecutiveSuccesses += 1;
    state.consecutiveFailures = 0;
    state.lastUpAt = state.lastCheckAt;
    const wasDown = state.isUp === false;
    const wasUnknown = state.isUp === null;
    state.isUp = true;
    log('info', 'check ok', {
      status: result.status,
      elapsedMs: result.elapsedMs,
      consecutiveSuccesses: state.consecutiveSuccesses,
    });

    if (wasDown && config.alertOnRecovery && !state.recoveredAlertSent) {
      await notify({
        kind: 'up',
        title: 'Sitio ARRIBA',
        text: `Respondió OK (status ${result.status}, ${result.elapsedMs} ms).`,
      });
      state.recoveredAlertSent = true;
      state.downAlertSent = false;
    } else if (wasUnknown && config.alertOnStart) {
      await notify({
        kind: 'up',
        title: 'Monitor iniciado — sitio arriba',
        text: `Primera revisión OK (status ${result.status}, ${result.elapsedMs} ms).`,
      });
    }
  } else {
    state.consecutiveFailures += 1;
    state.consecutiveSuccesses = 0;
    state.lastDownAt = state.lastCheckAt;
    const wasUp = state.isUp === true;
    log('warn', 'check failed', {
      status: result.status,
      error: result.error,
      elapsedMs: result.elapsedMs,
      consecutiveFailures: state.consecutiveFailures,
    });

    const crossedThreshold = state.consecutiveFailures >= config.consecutiveFailuresForDown;
    if (crossedThreshold) {
      const becameDown = state.isUp !== false;
      state.isUp = false;
      if (becameDown) {
        state.recoveredAlertSent = false;
      }
      if (wasUp && config.alertOnDown && !state.downAlertSent) {
        await notify({
          kind: 'down',
          title: 'Sitio CAÍDO',
          text: `No responde. ${result.status ? `Status ${result.status}.` : ''} ${result.error ? `Error: ${result.error}.` : ''}`.trim(),
        });
        state.downAlertSent = true;
      }
    }
  }
}

export function startMonitor() {
  log('info', 'monitor starting', {
    target: config.targetUrl,
    intervalMs: config.checkIntervalMs,
    timeoutMs: config.requestTimeoutMs,
  });
  const tick = () => {
    runOnce().catch((err) => {
      log('error', 'monitor tick threw', { error: err?.message || String(err) });
    });
  };
  tick();
  const interval = setInterval(tick, config.checkIntervalMs);
  interval.unref?.();
}

export function getStatus() {
  return { ...state };
}
