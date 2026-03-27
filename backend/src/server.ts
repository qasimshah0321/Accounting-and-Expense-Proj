import { config } from './config/env';
import { connectDB } from './config/database';
import { runMigrations } from './database/migrate';
import app from './app';

const start = async () => {
  try {
    await connectDB();
    await runMigrations();
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port} [${config.nodeEnv}]`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
