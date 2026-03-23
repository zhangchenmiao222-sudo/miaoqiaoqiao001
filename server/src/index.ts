import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import itemRoutes from './routes/items.js';
import zoneRoutes from './routes/zones.js';
import botRoutes from './routes/bot.js';
import { startBotScheduler } from './services/bot-scheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/items', itemRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/bot', botRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // 启动飞书 Bot 定时推送
  startBotScheduler();
});
