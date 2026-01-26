import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";

const app = express();
const server = http.createServer(app);

// Render 會走 https 反代，Socket.IO 設定 CORS 用同源最省事
const io = new Server(server, {
  cors: { origin: true, methods: ["GET", "POST"] },
});

const PORT = process.env.PORT || 3000;

// ====== 讓 server 同時提供前端 build 後的檔案 ======
const __dirnameFull = path.resolve();
const clientDist = path.join(__dirnameFull, "client_dist");
app.use(express.static(clientDist));

// 單頁應用：任何路由都回傳 index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// ====== 即時多人：最小版本玩家狀態 ======
const players = new Map(); // socket.id -> { x, y, name }

io.on("connection", (socket) => {
  console.log("connected", socket.id);

  // 1) 新玩家加入
  socket.on("player:join", ({ name }) => {
    players.set(socket.id, { x: 5, y: 5, name: name || "Player" });
    socket.emit("world:init", Object.fromEntries(players));
    socket.broadcast.emit("world:playerJoined", { id: socket.id, data: players.get(socket.id) });
  });

  // 2) 玩家移動（先用格子座標）
  socket.on("player:move", ({ x, y }) => {
    const p = players.get(socket.id);
    if (!p) return;
    p.x = x;
    p.y = y;
    socket.broadcast.emit("world:playerMoved", { id: socket.id, x, y });
  });

  // 3) 離線
  socket.on("disconnect", () => {
    players.delete(socket.id);
    socket.broadcast.emit("world:playerLeft", { id: socket.id });
  });
});

server.listen(PORT, () => console.log("Server listening on", PORT));
