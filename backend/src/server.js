const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { connectDb } = require('./config/db');
const { initSocket } = require('./realtime/socket');

async function start() {
  await connectDb();
  const server = http.createServer(app);
  initSocket(server, app);
  server.listen(env.port, () => {
    console.log(`SerialSync API listening on port ${env.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
