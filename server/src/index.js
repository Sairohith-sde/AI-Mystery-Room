import { app } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './db/connect.js';

async function start() {
  try {
    await connectDatabase();
    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();