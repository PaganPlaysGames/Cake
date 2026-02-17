import * as THREE from "https://unpkg.com/three@0.161.0/build/three.module.js";

const worldSize = 20;
const viewport = document.getElementById("game");
const ui = document.getElementById("ui");
const hudBottom = document.getElementById("hud-bottom");

const player = {
  x: 10,
  y: 10,
  hp: 100,
  maxHp: 100,
  runEnergy: 100,
  prayer: 100,
  gold: 25,
  inventory: new Map(),
  skills: {
    woodcutting: { level: 1, xp: 0 },
    mining: { level: 1, xp: 0 },
    fishing: { level: 1, xp: 0 },
  },
  quest: { accepted: false, completed: false },
};

const gameState = {
  activeTab: "stats",
  action: "idle",
  actionUntil: 0,
  moving: false,
  lastMoveAt: 0,
};

const nodes = [
  { x: 4, y: 3, kind: "tree", hp: 3 },
  { x: 14, y: 5, kind: "tree", hp: 3 },
  { x: 2, y: 13, kind: "rock", hp: 4 },
  { x: 12, y: 15, kind: "rock", hp: 4 },
];

const pondTiles = [
  { x: 16, y: 8 }, { x: 17, y: 8 }, { x: 18, y: 8 },
  { x: 16, y: 9 }, { x: 17, y: 9 }, { x: 18, y: 9 },
  { x: 16, y: 10 }, { x: 17, y: 10 }, { x: 18, y: 10 },
];
const pondSet = new Set(pondTiles.map((t) => `${t.x},${t.y}`));

const npc = { x: 10, y: 2, name: "Quest Sage" };

const recipes = {
  tree: { item: "Logs", skill: "woodcutting", xp: 25, respawn: 3500, maxHp: 3 },
  rock: { item: "Ore", skill: "mining", xp: 30, respawn: 4500, maxHp: 4 },
  pond: { item: "Fish", skill: "fishing", xp: 35, action: 450 },
};

const levelFromXp = (xp) => Math.floor(Math.sqrt(xp / 100)) + 1;
const xpIntoLevel = (xp) => xp % 100;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#0d1323");
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
camera.position.set(worldSize * 0.5, 18, worldSize * 1.2);
camera.lookAt(worldSize * 0.5, 0, worldSize * 0.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
viewport.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const sun = new THREE.DirectionalLight(0xc9e4ff, 1.05);
sun.position.set(16, 24, 8);
sun.castShadow = true;
scene.add(sun);

const ground = new THREE.Group();
const pondGroup = new THREE.Group();
scene.add(ground);
scene.add(pondGroup);

const nodeMeshes = new Map();
const nodeBaseY = new Map();

function worldToScene(x, y) {
  return { x: x + 0.5, z: y + 0.5 };
}

function createHumanoid(colors) {
  const root = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: colors.skin, roughness: 0.68 });
  const cloth = new THREE.MeshStandardMaterial({ color: colors.torso, roughness: 0.58 });
  const leg = new THREE.MeshStandardMaterial({ color: colors.legs, roughness: 0.6 });

  const pelvis = new THREE.Group();
  root.add(pelvis);

  const parts = { arms: [], legs: [] };

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.76, 0.32), cloth);
  torso.position.y = 1.66;
  torso.castShadow = true;
  pelvis.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 20, 16), skin);
  head.position.y = 2.32;
  head.castShadow = true;
  pelvis.add(head);

  [-1, 1].forEach((d) => {
    const arm = new THREE.Group();
    arm.position.set(0.35 * d, 1.88, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 6, 10), skin);
    upper.rotation.z = d * 0.1;
    upper.position.y = -0.15;
    upper.castShadow = true;
    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.26, 6, 10), skin);
    lower.position.y = -0.43;
    lower.castShadow = true;
    arm.add(upper, lower);
    pelvis.add(arm);
    parts.arms.push(arm);

    const legGroup = new THREE.Group();
    legGroup.position.set(0.15 * d, 1.18, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.35, 6, 10), leg);
    thigh.position.y = -0.2;
    thigh.castShadow = true;
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.32, 6, 10), leg);
    shin.position.y = -0.55;
    shin.castShadow = true;
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.28), leg);
    foot.position.set(0, -0.78, 0.08);
    foot.castShadow = true;
    legGroup.add(thigh, shin, foot);
    pelvis.add(legGroup);
    parts.legs.push(legGroup);
  });

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 10, 24), new THREE.MeshStandardMaterial({ color: colors.accent }));
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 2.02;
  pelvis.add(collar);

  root.userData.parts = parts;
  root.position.y = 0.02;
  return root;
}

function createTree() {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1, 10), new THREE.MeshStandardMaterial({ color: 0x6d4a2c }));
  trunk.position.y = 0.55;
  trunk.castShadow = true;
  group.add(trunk);
  const leaves = new THREE.MeshStandardMaterial({ color: 0x2faa46, roughness: 0.85 });
  [[0, 1.24, 0, 0.44], [0.22, 1.08, 0.02, 0.32], [-0.22, 1.06, -0.03, 0.32]].forEach(([x, y, z, r]) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), leaves);
    l.position.set(x, y, z);
    l.castShadow = true;
    group.add(l);
  });
  return group;
}

function createRock() {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38), new THREE.MeshStandardMaterial({ color: 0x8e98ad, roughness: 0.7 }));
  rock.castShadow = true;
  rock.scale.set(1.05, 0.8, 0.95);
  return rock;
}

function createPondSurface() {
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x2b83d4, transparent: true, opacity: 0.86, roughness: 0.2, metalness: 0.25 });
  pondTiles.forEach((tile) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 1), waterMat);
    const pos = worldToScene(tile.x, tile.y);
    mesh.position.set(pos.x, 0.03, pos.z);
    mesh.receiveShadow = true;
    pondGroup.add(mesh);
  });
}

const playerRig = createHumanoid({ skin: 0xf1c39a, torso: 0xffd166, legs: 0x313645, accent: 0xfaf5a7 });
const npcRig = createHumanoid({ skin: 0xf0d1b3, torso: 0xc88cff, legs: 0x3a294b, accent: 0xe9d7ff });
scene.add(playerRig, npcRig);

function addItem(name, qty = 1) { player.inventory.set(name, (player.inventory.get(name) || 0) + qty); }
function itemCount(name) { return player.inventory.get(name) || 0; }
function consumeItem(name, qty) {
  const current = itemCount(name);
  if (current < qty) return false;
  const next = current - qty;
  if (!next) player.inventory.delete(name);
  else player.inventory.set(name, next);
  return true;
}
function addXp(skill, amount) {
  const s = player.skills[skill];
  s.xp += amount;
  s.level = levelFromXp(s.xp);
}
function getNodeAt(x, y) { return nodes.find((n) => n.x === x && n.y === y && n.hp > 0); }
function canMove(x, y) { return x >= 0 && x < worldSize && y >= 0 && y < worldSize; }
function isNearPond(x, y) {
  return pondTiles.some((t) => Math.abs(t.x - x) + Math.abs(t.y - y) <= 1);
}

function startAction(action, ms) {
  gameState.action = action;
  gameState.actionUntil = performance.now() + ms;
}

function completeNodeHarvest(node) {
  const cfg = recipes[node.kind];
  node.hp -= 1;
  if (node.hp <= 0) {
    addItem(cfg.item, 1);
    addXp(cfg.skill, cfg.xp);
    setTimeout(() => {
      node.hp = cfg.maxHp;
      syncVisualState();
      renderUi();
    }, cfg.respawn);
  }
}

function chopTree() {
  const node = getNodeAt(player.x, player.y);
  if (!node || node.kind !== "tree") return false;
  startAction("gather", 420);
  completeNodeHarvest(node);
  return true;
}

function mineRock() {
  const node = getNodeAt(player.x, player.y);
  if (!node || node.kind !== "rock") return false;
  startAction("gather", 450);
  completeNodeHarvest(node);
  return true;
}

function fishPond() {
  if (!isNearPond(player.x, player.y)) return false;
  const cfg = recipes.pond;
  startAction("gather", cfg.action);
  addItem(cfg.item, 1);
  addXp(cfg.skill, cfg.xp);
  return true;
}

function harvest() {
  if (chopTree()) return;
  if (mineRock()) return;
  fishPond();
}

function interactNpc() {
  const near = Math.abs(player.x - npc.x) + Math.abs(player.y - npc.y) <= 1;
  if (!near) return;
  startAction("talk", 450);

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

function buildWorld() {
  const evenMat = new THREE.MeshStandardMaterial({ color: 0x29405f, roughness: 0.95 });
  const oddMat = new THREE.MeshStandardMaterial({ color: 0x263a56, roughness: 0.95 });
  const tileGeo = new THREE.BoxGeometry(1, 0.15, 1);

  for (let y = 0; y < worldSize; y++) {
    for (let x = 0; x < worldSize; x++) {
      const tile = new THREE.Mesh(tileGeo, (x + y) % 2 === 0 ? evenMat : oddMat);
      const pos = worldToScene(x, y);
      tile.position.set(pos.x, 0, pos.z);
      tile.receiveShadow = true;
      ground.add(tile);
    }
  }

  createPondSurface();

  nodes.forEach((node) => {
    const mesh = node.kind === "tree" ? createTree() : createRock();
    const pos = worldToScene(node.x, node.y);
    mesh.position.set(pos.x, mesh.position.y, pos.z);
    scene.add(mesh);
    nodeMeshes.set(node, mesh);
    nodeBaseY.set(node, mesh.position.y);
  });

  const npos = worldToScene(npc.x, npc.y);
  npcRig.position.set(npos.x, npcRig.position.y, npos.z);
}

function syncVisualState() {
  const p = worldToScene(player.x, player.y);
  playerRig.position.x = p.x;
  playerRig.position.z = p.z;

  nodeMeshes.forEach((mesh, node) => {
    mesh.visible = node.hp > 0;
    mesh.scale.y = node.hp > 0 ? Math.max(0.45, node.hp / recipes[node.kind].maxHp) : 0.1;
  });
}

function skillRows() {
  return Object.entries(player.skills).map(([name, data]) => {
    const pct = xpIntoLevel(data.xp);
    return `<div class="kv"><span>${name}</span><span>Lv ${data.level} (${data.xp}xp)</span></div><div class="xpbar"><div class="xpfill" style="width:${pct}%"></div></div>`;
  }).join("");
}

function minimapGrid() {
  const cells = [];
  for (let y = -3; y <= 3; y++) {
    for (let x = -3; x <= 3; x++) {
      const tx = player.x + x;
      const ty = player.y + y;
      let cls = "mini";
      if (x === 0 && y === 0) cls += " player";
      else if (tx === npc.x && ty === npc.y) cls += " npc";
      else if (pondSet.has(`${tx},${ty}`)) cls += " pond";
      else if (nodes.some((n) => n.x === tx && n.y === ty && n.hp > 0)) cls += " node";
      cells.push(`<div class="${cls}"></div>`);
    }
  }
  return cells.join("");
}

function questStatus() {
  if (!player.quest.accepted) return '<p class="quest-open">Talk to the Quest Sage to start Gatherer\'s Trial.</p>';
  if (player.quest.completed) return '<p class="quest-done">Completed: Gatherer\'s Trial</p>';
  return `<p class="quest-open">Gatherer's Trial (active)</p><ul class="list"><li>Logs: ${itemCount("Logs")}/2</li><li>Ore: ${itemCount("Ore")}/2</li><li>Fish: ${itemCount("Fish")}/1</li></ul>`;
}

function tabContent() {
  if (gameState.activeTab === "stats") return `<h2>Skills</h2>${skillRows()}`;
  if (gameState.activeTab === "inventory") {
    const rows = player.inventory.size ? [...player.inventory.entries()].map(([n, q]) => `<div class="kv"><span>${n}</span><span>x${q}</span></div>`).join("") : '<div class="empty">Inventory empty</div>';
    return `<h2>Inventory</h2>${rows}<h2>Gold</h2><div class="kv"><span>Coins</span><span>${player.gold}</span></div>`;
  }
  if (gameState.activeTab === "quest") return `<h2>Quest Journal</h2>${questStatus()}<p class="hint">Press Q near Quest Sage.</p>`;
  return `<h2>Gathering</h2><div class="kv"><span>Tree function</span><span>Chop (E on tree)</span></div><div class="kv"><span>Rock function</span><span>Mine (E on rock)</span></div><div class="kv"><span>Pond function</span><span>Fish (E near pond)</span></div>`;
}

function renderBottomHud() {
  const slots = ["Atk", "Str", "Def", "Inv", "Pray", "Magic", "Map", "Quest"];
  hudBottom.innerHTML = slots.map((s) => `<div class="slot">${s}</div>`).join("");
}

function renderUi() {
  ui.innerHTML = `
    <div class="rs-top">
      <div class="orb-wrap">
        <div class="orb hp">${player.hp}</div>
        <div class="orb run">${Math.round(player.runEnergy)}</div>
        <div class="orb pray">${Math.round(player.prayer)}</div>
      </div>
      <div class="minimap"><div class="minimap-grid">${minimapGrid()}</div></div>
    </div>

    <div class="tabs">
      <button class="tab ${gameState.activeTab === "stats" ? "active" : ""}" data-tab="stats">Stats</button>
      <button class="tab ${gameState.activeTab === "inventory" ? "active" : ""}" data-tab="inventory">Inv</button>
      <button class="tab ${gameState.activeTab === "quest" ? "active" : ""}" data-tab="quest">Quest</button>
      <button class="tab ${gameState.activeTab === "equipment" ? "active" : ""}" data-tab="equipment">Gather</button>
    </div>

    <section class="panel">${tabContent()}</section>
  `;

  ui.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      gameState.activeTab = btn.dataset.tab;
      renderUi();
    });
  });
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
  const key = e.key.toLowerCase();

  if (key === "arrowup" || key === "w") ny -= 1;
  if (key === "arrowdown" || key === "s") ny += 1;
  if (key === "arrowleft" || key === "a") nx -= 1;
  if (key === "arrowright" || key === "d") nx += 1;

  if (canMove(nx, ny) && (nx !== player.x || ny !== player.y)) {
    player.x = nx;
    player.y = ny;
    gameState.moving = true;
    gameState.lastMoveAt = performance.now();
  }

  if (key === "e") harvest();
  if (key === "q") interactNpc();

  syncVisualState();
  renderUi();
});

function animateRig(rig, t, moving, action) {
  const { arms, legs } = rig.userData.parts;
  const walk = moving ? Math.sin(t * 10) * 0.45 : Math.sin(t * 2) * 0.05;
  arms[0].rotation.x = walk;
  arms[1].rotation.x = -walk;
  legs[0].rotation.x = -walk;
  legs[1].rotation.x = walk;

  if (action === "gather") {
    arms[1].rotation.x = -1.2 + Math.sin(t * 30) * 0.25;
    rig.rotation.y = 0.2;
  } else if (action === "talk") {
    arms[0].rotation.x = Math.sin(t * 12) * 0.5;
    rig.rotation.y = -0.18;
  } else {
    rig.rotation.y = Math.sin(t * 1.4) * 0.04;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const t = performance.now() * 0.001;
  if (performance.now() > gameState.lastMoveAt + 120) gameState.moving = false;
  if (performance.now() > gameState.actionUntil) gameState.action = "idle";

  player.runEnergy = Math.max(0, Math.min(100, player.runEnergy + (gameState.moving ? -0.06 : 0.03)));
  player.prayer = Math.max(0, Math.min(100, player.prayer - 0.003));

  animateRig(playerRig, t, gameState.moving, gameState.action);
  animateRig(npcRig, t + 2.4, false, "idle");

  nodeMeshes.forEach((mesh, node) => {
    if (node.kind === "tree") mesh.rotation.z = Math.sin(t * 0.8 + node.x) * 0.03;
    if (node.kind === "rock") mesh.rotation.y = Math.sin(t * 0.5 + node.x) * 0.08;
    const baseY = nodeBaseY.get(node) || 0;
    mesh.position.y = baseY + Math.sin(t * 1.8 + node.x) * 0.01;
  });

  pondGroup.children.forEach((water, i) => {
    water.position.y = 0.03 + Math.sin(t * 2 + i * 0.6) * 0.01;
  });

  renderer.render(scene, camera);
}

buildWorld();
fitRenderer();
syncVisualState();
renderBottomHud();
renderUi();
animate();
