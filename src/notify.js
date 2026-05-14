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
    text: `*${title}*\n${config.targetUrl}\n${text}`,
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

async function sendResend({ kind, title, text }) {
  const { apiKey, from, to } = config.resend;
  if (!apiKey || !to) return { skipped: true, channel: 'resend' };

  const emoji = kind === 'up' ? '✅' : kind === 'down' ? '🔴' : 'ℹ️';
  const subject = `${emoji} ${title}`;
  const url = config.targetUrl;
  const urlEsc = escapeHtml(url);
  const action = kind === 'up' ? 'Entra al sitio:' : 'Sitio monitoreado:';
  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.5;color:#111"><h2 style="margin:0 0 16px">${emoji} ${escapeHtml(title)}</h2><p style="margin:0 0 8px">${action}</p><p style="margin:0 0 20px;font-size:17px"><a href="${urlEsc}" style="color:#0a66c2;word-break:break-all">${urlEsc}</a></p><p style="margin:0 0 16px;color:#444">${escapeHtml(text)}</p><p style="margin:0;color:#888;font-size:12px">Enviado por bot-mec · ${new Date().toISOString()}</p></div>`;
  const plain = `${title}\n\n${action} ${url}\n\n${text}`;

  const recipients = to.split(',').map((s) => s.trim()).filter(Boolean);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
        text: plain,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return { ok: false, channel: 'resend', status: res.status, error: errText.slice(0, 300) };
    }
    return { ok: true, channel: 'resend' };
  } catch (err) {
    return { ok: false, channel: 'resend', error: err?.message || String(err) };
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendDiscord({ title, text }) {
  const url = config.discordWebhookUrl;
  if (!url) return { skipped: true, channel: 'discord' };

  const body = { content: `**${title}**\n${config.targetUrl}\n${text}` };
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
    sendResend({ kind, title, text }),
    sendTelegram({ title, text }),
    sendDiscord({ title, text }),
  ]);
  for (const r of results) {
    if (r.skipped) continue;
    if (r.ok) log('info', 'notify sent', { channel: r.channel });
    else log('error', 'notify failed', r);
  }
  if (results.every((r) => r.skipped)) {
    log('warn', 'no notification channel configured — set RESEND_API_KEY+RESEND_TO, TELEGRAM_BOT_TOKEN+TELEGRAM_CHAT_ID, or DISCORD_WEBHOOK_URL');
  }
}
