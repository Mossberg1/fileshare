import express from "express";
import http from "http";
import path from "path";
import { Server, Socket } from "socket.io";

const port = 8080;
const frontend_build_dir = '../../frontend/build';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, frontend_build_dir)));

io.on('connection', (socket: Socket) => {
    console.log('User has connected');

    socket.on('disconnect', () => {
        console.log('User has disconnected');
    });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
