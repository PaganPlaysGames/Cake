const tileSize = 32;
const worldSize = 20;
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const ui = document.getElementById("ui");

const player = {
  x: 10,
  y: 10,
  hp: 100,
  maxHp: 100,
  gold: 25,
  inventory: new Map(),
  skills: {
    woodcutting: { level: 1, xp: 0 },
    mining: { level: 1, xp: 0 },
    fishing: { level: 1, xp: 0 },
  },
  quest: {
    accepted: false,
    completed: false,
  },
};

const nodes = [
  { x: 4, y: 3, kind: "tree", hp: 3 },
  { x: 14, y: 5, kind: "tree", hp: 3 },
  { x: 2, y: 13, kind: "rock", hp: 4 },
  { x: 12, y: 15, kind: "rock", hp: 4 },
  { x: 17, y: 9, kind: "fish", hp: 2 },
  { x: 7, y: 17, kind: "fish", hp: 2 },
];

const npc = { x: 10, y: 2, name: "Quest Sage" };

const recipes = {
  tree: { item: "Logs", skill: "woodcutting", xp: 25, respawn: 3500 },
  rock: { item: "Ore", skill: "mining", xp: 30, respawn: 4500 },
  fish: { item: "Fish", skill: "fishing", xp: 35, respawn: 3000 },
};

const levelFromXp = (xp) => Math.floor(Math.sqrt(xp / 100)) + 1;

function addItem(name, qty = 1) {
  player.inventory.set(name, (player.inventory.get(name) || 0) + qty);
}

function itemCount(name) {
  return player.inventory.get(name) || 0;
}

function consumeItem(name, qty) {
  const current = itemCount(name);
  if (current < qty) return false;
  const next = current - qty;
  if (next === 0) player.inventory.delete(name);
  else player.inventory.set(name, next);
  return true;
}

function addXp(skill, amount) {
  const s = player.skills[skill];
  s.xp += amount;
  s.level = levelFromXp(s.xp);
}

function getNodeAt(x, y) {
  return nodes.find((n) => n.x === x && n.y === y && n.hp > 0);
}

function canMove(x, y) {
  return x >= 0 && x < worldSize && y >= 0 && y < worldSize;
}

function harvest() {
  const node = getNodeAt(player.x, player.y);
  if (!node) return;

  node.hp -= 1;
  if (node.hp <= 0) {
    const cfg = recipes[node.kind];
    addItem(cfg.item, 1);
    addXp(cfg.skill, cfg.xp);

    const originalHp = node.kind === "rock" ? 4 : node.kind === "tree" ? 3 : 2;
    setTimeout(() => {
      node.hp = originalHp;
    }, cfg.respawn);
  }
}

function interactNpc() {
  const near = Math.abs(player.x - npc.x) + Math.abs(player.y - npc.y) <= 1;
  if (!near) return;

  if (!player.quest.accepted) {
    player.quest.accepted = true;
    return;
  }

  if (!player.quest.completed) {
    const hasReq = itemCount("Logs") >= 2 && itemCount("Ore") >= 2 && itemCount("Fish") >= 1;
    if (hasReq) {
      consumeItem("Logs", 2);
      consumeItem("Ore", 2);
      consumeItem("Fish", 1);
      player.gold += 100;
      addXp("woodcutting", 40);
      addXp("mining", 40);
      addXp("fishing", 40);
      player.quest.completed = true;
    }
  }
}

window.addEventListener("keydown", (e) => {
  let nx = player.x;
  let ny = player.y;

  if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") ny -= 1;
  if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") ny += 1;
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") nx -= 1;
  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") nx += 1;

  if (canMove(nx, ny)) {
    player.x = nx;
    player.y = ny;
  }

  if (e.key.toLowerCase() === "e") harvest();
  if (e.key.toLowerCase() === "q") interactNpc();

  render();
});

function drawTile(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
}

function drawWorld() {
  for (let y = 0; y < worldSize; y++) {
    for (let x = 0; x < worldSize; x++) {
      const shade = (x + y) % 2 === 0 ? "#29405f" : "#263a56";
      drawTile(x, y, shade);
    }
  }

  nodes.forEach((node) => {
    if (node.hp <= 0) return;
    const colors = { tree: "#3bc763", rock: "#9aa6bf", fish: "#4ed0ff" };
    drawTile(node.x, node.y, colors[node.kind]);
  });

  drawTile(npc.x, npc.y, "#c88cff");
  drawTile(player.x, player.y, "#ffd166");
}

function skillRows() {
  return Object.entries(player.skills)
    .map(([name, data]) => `<div class="kv"><span>${name}</span><span>Lv ${data.level} (${data.xp} XP)</span></div>`)
    .join("");
}

function inventoryRows() {
  if (player.inventory.size === 0) return '<div class="empty">Empty</div>';
  return [...player.inventory.entries()]
    .map(([name, qty]) => `<div class="kv"><span>${name}</span><span>x${qty}</span></div>`)
    .join("");
}

function questStatus() {
  if (!player.quest.accepted) return '<p class="quest-open">Talk to the Quest Sage (Q while adjacent).</p>';
  if (player.quest.completed) return '<p class="quest-done">Completed: Gatherer\'s Trial</p>';

  return `
    <p class="quest-open">Gatherer's Trial (active)</p>
    <ul class="list">
      <li>Logs: ${itemCount("Logs")}/2</li>
      <li>Ore: ${itemCount("Ore")}/2</li>
      <li>Fish: ${itemCount("Fish")}/1</li>
    </ul>
    <p class="hint">Return to the Quest Sage and press Q.</p>
  `;
}

function renderUi() {
  ui.innerHTML = `
    <h2>Character</h2>
    <div class="kv"><span>HP</span><span>${player.hp}/${player.maxHp}</span></div>
    <div class="kv"><span>Gold</span><span>${player.gold}</span></div>

    <h2>Skills</h2>
    ${skillRows()}

    <h2>Inventory</h2>
    ${inventoryRows()}

    <h2>Quest</h2>
    ${questStatus()}

    <h2>Legend</h2>
    <div class="kv"><span>Yellow</span><span>You</span></div>
    <div class="kv"><span>Purple</span><span>Quest Sage</span></div>
    <div class="kv"><span>Green</span><span>Trees</span></div>
    <div class="kv"><span>Grey</span><span>Rocks</span></div>
    <div class="kv"><span>Blue</span><span>Fishing spots</span></div>
  `;
}

function render() {
  drawWorld();
  renderUi();
}

render();
