import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import standingsRouter from './routes/standings';
import teamsRouter from './routes/teams';
import auctionRouter from './routes/auction';

const app = express();
const server = http.createServer(app);

// allow CORS for your client
const io = new SocketIOServer(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// IMPORTANT — use 4000, not 5000
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// HEALTH CHECK
app.get('/', (_req, res) => {
  res.send('FBST API is running');
});

// ROUTES
app.use('/api/standings', standingsRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/auction', auctionRouter);

// SOCKET.IO
io.on('connection', (socket) => {
  console.log('client connected', socket.id);

  socket.on('disconnect', () => {
    console.log('client disconnected', socket.id);
  });
});

// START SERVER
server.listen(PORT, () => {
  console.log(`FBST server listening on http://localhost:${PORT}`);
});

