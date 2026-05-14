# bot-mec

Monitor de disponibilidad para `https://bpmgob.mec.gub.uy/`. Hace polling cada minuto y envía una notificación (email vía Resend, Telegram, o Discord) cuando el sitio vuelve a estar arriba, y cuando se cae después de haber estado arriba.

Stack: Node.js 22 (ESM), sin dependencias, listo para Railway.

## Variables de entorno

Ver `.env.example`. Las mínimas para que avise por algún canal son:

- `RESEND_API_KEY` + `RESEND_TO` (email), **o**
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`, **o**
- `DISCORD_WEBHOOK_URL`

Si no configuras ninguna, el bot funciona igual pero solo escribe a stdout (visible en los logs de Railway).

## Local

```bash
pnpm install
cp .env.example .env   # editar y poner tus tokens si quieres notificaciones reales
export $(grep -v '^#' .env | xargs) && pnpm start
```

Healthcheck local: http://localhost:3000/health

## Deploy en Railway

1. Crea un proyecto nuevo en Railway → "Deploy from GitHub repo" (sube este repo primero).
2. Railway detecta `railway.json` y `package.json` automáticamente. Builder: Nixpacks. Start: `pnpm start`. Healthcheck: `/health`.
3. En **Variables** del servicio, agrega al menos uno de los canales:
   - `RESEND_API_KEY` + `RESEND_TO` (recomendado: email), o
   - `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`, o
   - `DISCORD_WEBHOOK_URL`
4. Opcional: ajusta `CHECK_INTERVAL_MS` (default 60000 = 1 min).
5. Deploy. Mira los logs hasta ver `monitor starting` y los chequeos.

## Resend (email)

1. Crea una API key en https://resend.com/api-keys (con permiso de envío).
2. Pega `RESEND_API_KEY` y `RESEND_TO` (tu email) en las Variables de Railway.
3. **Important**: si dejas el `RESEND_FROM` por defecto (`onboarding@resend.dev`), Resend solo permite enviar al email que es dueño de la cuenta. Para mandar a otros destinos, verifica un dominio propio en Resend y usa `RESEND_FROM=alerts@tudominio.com`.

`RESEND_TO` admite varios destinatarios separados por coma: `a@x.com,b@x.com`.

## Cómo obtener un Telegram chat_id

1. Crea un bot con [@BotFather](https://t.me/BotFather), guarda el token.
2. Manda cualquier mensaje a tu bot desde tu cuenta personal (o agrégalo a un grupo).
3. Abre `https://api.telegram.org/bot<TOKEN>/getUpdates` en el navegador y copia `message.chat.id`.

## Comportamiento

- Primer chequeo: solo loguea (por defecto). Si quieres que avise al arrancar, `ALERT_ON_START=true`.
- Sitio pasa de caído a arriba → manda alerta "Sitio ARRIBA".
- Sitio pasa de arriba a caído (tras `CONSECUTIVE_FAILURES_FOR_DOWN` fallos seguidos, default 2) → manda alerta "Sitio CAÍDO".
- No spammea: una alerta por transición.

## Próximos pasos (v2)

- Persistir estado entre reinicios (Railway redeploys reinician memoria).
- Validar contenido (no solo status), por ejemplo buscar un string esperado en el HTML.
- Métricas / histórico (uptime % por día).
- Multi-sitio.
- Backoff exponencial cuando el sitio está caído largo rato.
