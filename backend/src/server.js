const app = require('./app');
const env = require('./config/env');
const { connectDb } = require('./config/db');

async function start() {
  await connectDb();
  app.listen(env.port, () => {
    console.log(`SerialSync API listening on port ${env.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
