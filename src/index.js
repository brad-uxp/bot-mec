import http from 'node:http';
import { startMonitor, getStatus } from './monitor.js';
import { config } from './config.js';

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    const status = getStatus();
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      target: config.targetUrl,
      ...status,
    }, null, 2));
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(config.port, () => {
  console.log(JSON.stringify({
    level: 'info',
    msg: 'http server listening',
    port: config.port,
  }));
});

startMonitor();

const shutdown = (signal) => {
  console.log(JSON.stringify({ level: 'info', msg: 'shutting down', signal }));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
