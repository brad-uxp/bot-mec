import { config } from './config.js';

const log = (level, msg, extra = {}) => {
  console.log(JSON.stringify({ level, msg, t: new Date().toISOString(), ...extra }));
};

async function sendTelegram({ title, text }) {
  const { botToken, chatId } = config.telegram;
  if (!botToken || !chatId) return { skipped: true, channel: 'telegram' };

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: `*${title}*\n${text}`,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, channel: 'telegram', status: res.status, error: errText.slice(0, 300) };
    }
    return { ok: true, channel: 'telegram' };
  } catch (err) {
    return { ok: false, channel: 'telegram', error: err?.message || String(err) };
  }
}

async function sendDiscord({ title, text }) {
  const url = config.discordWebhookUrl;
  if (!url) return { skipped: true, channel: 'discord' };

  const body = { content: `**${title}**\n${text}` };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, channel: 'discord', status: res.status, error: errText.slice(0, 300) };
    }
    return { ok: true, channel: 'discord' };
  } catch (err) {
    return { ok: false, channel: 'discord', error: err?.message || String(err) };
  }
}

export async function notify({ kind, title, text }) {
  log('info', 'alert', { kind, title, text });
  const results = await Promise.all([
    sendTelegram({ title, text }),
    sendDiscord({ title, text }),
  ]);
  for (const r of results) {
    if (r.skipped) continue;
    if (r.ok) log('info', 'notify sent', { channel: r.channel });
    else log('error', 'notify failed', r);
  }
  if (results.every((r) => r.skipped)) {
    log('warn', 'no notification channel configured — set TELEGRAM_BOT_TOKEN+TELEGRAM_CHAT_ID or DISCORD_WEBHOOK_URL');
  }
}
