const env = process.env;

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const bool = (v, fallback) => {
  if (v === undefined) return fallback;
  return /^(1|true|yes|on)$/i.test(v);
};

export const config = {
  targetUrl: env.TARGET_URL || 'https://bpmgob.mec.gub.uy/',
  checkIntervalMs: num(env.CHECK_INTERVAL_MS, 60_000),
  requestTimeoutMs: num(env.REQUEST_TIMEOUT_MS, 15_000),
  successStatusMax: num(env.SUCCESS_STATUS_MAX, 399),
  port: num(env.PORT, 3000),

  alertOnRecovery: bool(env.ALERT_ON_RECOVERY, true),
  alertOnDown: bool(env.ALERT_ON_DOWN, true),
  alertOnStart: bool(env.ALERT_ON_START, false),
  consecutiveFailuresForDown: num(env.CONSECUTIVE_FAILURES_FOR_DOWN, 2),

  telegram: {
    botToken: env.TELEGRAM_BOT_TOKEN || '',
    chatId: env.TELEGRAM_CHAT_ID || '',
  },
  discordWebhookUrl: env.DISCORD_WEBHOOK_URL || '',
  resend: {
    apiKey: env.RESEND_API_KEY || '',
    from: env.RESEND_FROM || 'onboarding@resend.dev',
    to: env.RESEND_TO || '',
  },
};
