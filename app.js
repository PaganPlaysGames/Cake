import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";

const worldSize = 20;
const viewport = document.getElementById("game");
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
  tree: { item: "Logs", skill: "woodcutting", xp: 25, respawn: 3500, maxHp: 3 },
  rock: { item: "Ore", skill: "mining", xp: 30, respawn: 4500, maxHp: 4 },
  fish: { item: "Fish", skill: "fishing", xp: 35, respawn: 3000, maxHp: 2 },
};

const levelFromXp = (xp) => Math.floor(Math.sqrt(xp / 100)) + 1;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#0d1323");
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
camera.position.set(worldSize * 0.5, 20, worldSize * 1.25);
camera.lookAt(worldSize * 0.5, 0, worldSize * 0.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
viewport.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambient);
const sunlight = new THREE.DirectionalLight(0xc9e4ff, 1.1);
sunlight.position.set(15, 30, 8);
scene.add(sunlight);

const grid = new THREE.Group();
scene.add(grid);

const nodeMeshes = new Map();
const nodeColors = { tree: 0x2fbf60, rock: 0x9ea8bb, fish: 0x3aa7ff };

const playerMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(0.32, 0.42, 0.85, 14),
  new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.2, roughness: 0.5 }),
);
playerMesh.position.y = 0.45;
scene.add(playerMesh);

const npcMesh = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.35, 0.65, 6, 14),
  new THREE.MeshStandardMaterial({ color: 0xc88cff, metalness: 0.15, roughness: 0.45 }),
);
npcMesh.position.y = 0.65;
scene.add(npcMesh);

function worldToScene(x, y) {
  return { x: x + 0.5, z: y + 0.5 };
}

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

    setTimeout(() => {
      node.hp = cfg.maxHp;
      syncVisualState();
      renderUi();
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

function buildGround() {
  const evenMat = new THREE.MeshStandardMaterial({ color: 0x29405f, roughness: 0.95 });
  const oddMat = new THREE.MeshStandardMaterial({ color: 0x263a56, roughness: 0.95 });
  const geo = new THREE.BoxGeometry(1, 0.15, 1);

  for (let y = 0; y < worldSize; y++) {
    for (let x = 0; x < worldSize; x++) {
      const tile = new THREE.Mesh(geo, (x + y) % 2 === 0 ? evenMat : oddMat);
      const pos = worldToScene(x, y);
      tile.position.set(pos.x, 0, pos.z);
      grid.add(tile);
    }
  }
}

function buildNodesAndNpc() {
  nodes.forEach((node) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.68, 0.68),
      new THREE.MeshStandardMaterial({ color: nodeColors[node.kind], roughness: 0.55, metalness: 0.1 }),
    );
    const pos = worldToScene(node.x, node.y);
    mesh.position.set(pos.x, 0.45, pos.z);
    scene.add(mesh);
    nodeMeshes.set(node, mesh);
  });

  const npcPos = worldToScene(npc.x, npc.y);
  npcMesh.position.set(npcPos.x, npcMesh.position.y, npcPos.z);
}

function syncVisualState() {
  const p = worldToScene(player.x, player.y);
  playerMesh.position.set(p.x, playerMesh.position.y, p.z);

  nodeMeshes.forEach((mesh, node) => {
    mesh.visible = node.hp > 0;
    mesh.scale.y = node.hp > 0 ? Math.max(0.4, node.hp / recipes[node.kind].maxHp) : 0.2;
  });
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

function fitRenderer() {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", fitRenderer);

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

  syncVisualState();
  renderUi();
});

function animate() {
  requestAnimationFrame(animate);
  const t = performance.now() * 0.001;
  playerMesh.position.y = 0.42 + Math.sin(t * 2.2) * 0.05;
  npcMesh.rotation.y = t * 0.35;
  renderer.render(scene, camera);
}

buildGround();
buildNodesAndNpc();
fitRenderer();
syncVisualState();
renderUi();
animate();
