import "./style.css";
import { io } from "socket.io-client";

const socket = io(); // 同源：Render 上不用填 URL

const state = {
  me: { x: 5, y: 5, name: "" },
  players: {} // id -> {x,y,name}
};

document.querySelector("#app").innerHTML = `
  <div class="wrap">
    <h1>多人地圖（最小版）</h1>
    <div class="row">
      <input id="name" placeholder="輸入暱稱" />
      <button id="join">加入</button>
    </div>
    <div id="info"></div>
    <pre id="world"></pre>
    <p>用方向鍵移動（格子座標）</p>
  </div>
`;

const $name = document.querySelector("#name");
const $join = document.querySelector("#join");
const $info = document.querySelector("#info");
const $world = document.querySelector("#world");

$join.onclick = () => {
  state.me.name = $name.value.trim() || "Player";
  socket.emit("player:join", { name: state.me.name });
  $info.textContent = `已加入：${state.me.name}`;
};

socket.on("world:init", (players) => {
  state.players = players;
  render();
});

socket.on("world:playerJoined", ({ id, data }) => {
  state.players[id] = data;
  render();
});

socket.on("world:playerMoved", ({ id, x, y }) => {
  if (!state.players[id]) state.players[id] = { x, y, name: "Player" };
  state.players[id].x = x;
  state.players[id].y = y;
  render();
});

socket.on("world:playerLeft", ({ id }) => {
  delete state.players[id];
  render();
});

function render() {
  // 把自己也顯示：server 會用 socket.id 當 key；先用玩家表直接印
  $world.textContent = JSON.stringify(state.players, null, 2);
}

window.addEventListener("keydown", (e) => {
  const key = e.key;
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) return;

  if (key === "ArrowUp") state.me.y -= 1;
  if (key === "ArrowDown") state.me.y += 1;
  if (key === "ArrowLeft") state.me.x -= 1;
  if (key === "ArrowRight") state.me.x += 1;

  socket.emit("player:move", { x: state.me.x, y: state.me.y });
});
