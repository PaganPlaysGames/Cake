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
camera.position.set(worldSize * 0.5, 19, worldSize * 1.2);
camera.lookAt(worldSize * 0.5, 0, worldSize * 0.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);
const sunlight = new THREE.DirectionalLight(0xc9e4ff, 1.05);
sunlight.position.set(16, 26, 9);
sunlight.castShadow = true;
sunlight.shadow.mapSize.set(1024, 1024);
scene.add(sunlight);

const grid = new THREE.Group();
scene.add(grid);

const nodeMeshes = new Map();

function worldToScene(x, y) {
  return { x: x + 0.5, z: y + 0.5 };
}

function createHumanoid({ skin = 0xf1c39a, torso = 0x4978ff, leg = 0x2a2f3d, boot = 0x1f232e, accent = 0xffffff }) {
  const root = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.68 });
  const torsoMat = new THREE.MeshStandardMaterial({ color: torso, roughness: 0.58, metalness: 0.08 });
  const legMat = new THREE.MeshStandardMaterial({ color: leg, roughness: 0.6 });
  const bootMat = new THREE.MeshStandardMaterial({ color: boot, roughness: 0.5 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5, metalness: 0.12 });

  const pelvis = new THREE.Group();
  root.add(pelvis);

  const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.3), torsoMat);
  torsoMesh.position.y = 1.65;
  torsoMesh.castShadow = true;
  pelvis.add(torsoMesh);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10), skinMat);
  neck.position.y = 2.08;
  neck.castShadow = true;
  pelvis.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 18, 16), skinMat);
  head.position.y = 2.32;
  head.castShadow = true;
  pelvis.add(head);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 8), skinMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 2.31, 0.22);
  pelvis.add(nose);

  const shoulderY = 1.88;
  [-1, 1].forEach((dir) => {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), skinMat);
    shoulder.position.set(0.33 * dir, shoulderY, 0);
    shoulder.castShadow = true;
    pelvis.add(shoulder);

    const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.35, 6, 10), skinMat);
    upperArm.position.set(0.45 * dir, 1.68, 0);
    upperArm.rotation.z = dir * 0.08;
    upperArm.castShadow = true;
    pelvis.add(upperArm);

    const foreArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.3, 6, 10), skinMat);
    foreArm.position.set(0.48 * dir, 1.38, 0.01);
    foreArm.rotation.z = dir * 0.05;
    foreArm.castShadow = true;
    pelvis.add(foreArm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), skinMat);
    hand.position.set(0.49 * dir, 1.14, 0.03);
    hand.castShadow = true;
    pelvis.add(hand);
  });

  [-1, 1].forEach((dir) => {
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.42, 6, 10), legMat);
    thigh.position.set(0.14 * dir, 1.04, 0);
    thigh.castShadow = true;
    pelvis.add(thigh);

    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.38, 6, 10), legMat);
    shin.position.set(0.14 * dir, 0.63, 0.01);
    shin.castShadow = true;
    pelvis.add(shin);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.28), bootMat);
    foot.position.set(0.14 * dir, 0.29, 0.07);
    foot.castShadow = true;
    pelvis.add(foot);
  });

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.03, 10, 24), accentMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 1.27;
  pelvis.add(belt);

  root.position.y = 0.02;
  return root;
}

function createTree() {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 0.9, 10),
    new THREE.MeshStandardMaterial({ color: 0x6d4a2c, roughness: 0.82 }),
  );
  trunk.position.y = 0.5;
  trunk.castShadow = true;
  tree.add(trunk);

  const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x2faa46, roughness: 0.86 });
  [[0, 1.15, 0, 0.45], [-0.22, 1.0, 0.1, 0.35], [0.23, 1.05, -0.05, 0.33]].forEach(([x, y, z, r]) => {
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), leafMaterial);
    lobe.position.set(x, y, z);
    lobe.castShadow = true;
    tree.add(lobe);
  });

  return tree;
}

function createRock() {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.38, 0),
    new THREE.MeshStandardMaterial({ color: 0x8e98ad, roughness: 0.72, metalness: 0.12 }),
  );
  rock.castShadow = true;
  rock.scale.set(1.05, 0.8, 0.95);
  return rock;
}

function createFishNode() {
  const fishGroup = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 14, 10),
    new THREE.MeshStandardMaterial({ color: 0x48bbff, roughness: 0.35, metalness: 0.2 }),
  );
  body.scale.set(1.2, 0.65, 0.65);
  body.castShadow = true;
  fishGroup.add(body);

  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.22, 3),
    new THREE.MeshStandardMaterial({ color: 0x2f8fd8, roughness: 0.4 }),
  );
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -0.27;
  tail.castShadow = true;
  fishGroup.add(tail);

  const fin = new THREE.Mesh(
    new THREE.ConeGeometry(0.05, 0.12, 8),
    new THREE.MeshStandardMaterial({ color: 0x6ad1ff, roughness: 0.35 }),
  );
  fin.position.set(0, 0.14, 0);
  fishGroup.add(fin);

  fishGroup.position.y = 0.4;
  return fishGroup;
}

const playerRig = createHumanoid({ torso: 0xffd166, leg: 0x313645, accent: 0xfaf5a7 });
const npcRig = createHumanoid({ torso: 0xc88cff, leg: 0x3a294b, accent: 0xe9d7ff });
scene.add(playerRig);
scene.add(npcRig);

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
      tile.receiveShadow = true;
      grid.add(tile);
    }
  }
}

function createNodeMesh(kind) {
  if (kind === "tree") return createTree();
  if (kind === "rock") return createRock();
  return createFishNode();
}

function buildNodesAndNpc() {
  nodes.forEach((node) => {
    const mesh = createNodeMesh(node.kind);
    const pos = worldToScene(node.x, node.y);
    mesh.position.set(pos.x, mesh.position.y, pos.z);
    scene.add(mesh);
    nodeMeshes.set(node, mesh);
  });

  const npcPos = worldToScene(npc.x, npc.y);
  npcRig.position.set(npcPos.x, npcRig.position.y, npcPos.z);
}

function syncVisualState() {
  const p = worldToScene(player.x, player.y);
  playerRig.position.set(p.x, playerRig.position.y, p.z);

  nodeMeshes.forEach((mesh, node) => {
    mesh.visible = node.hp > 0;
    const vitality = node.hp > 0 ? Math.max(0.45, node.hp / recipes[node.kind].maxHp) : 0.1;
    mesh.scale.y = vitality;
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
    <div class="kv"><span>Trees</span><span>Woodcutting</span></div>
    <div class="kv"><span>Rocks</span><span>Mining</span></div>
    <div class="kv"><span>Fish</span><span>Fishing</span></div>
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

  playerRig.rotation.y = Math.sin(t * 1.8) * 0.05;
  playerRig.position.y = 0.02 + Math.sin(t * 2.5) * 0.025;

  npcRig.rotation.y = t * 0.35;

  nodeMeshes.forEach((mesh, node) => {
    if (node.kind === "fish") {
      mesh.rotation.y = Math.sin(t * 5 + node.x) * 0.45;
      mesh.position.y = 0.4 + Math.sin(t * 4 + node.y) * 0.05;
    }
    if (node.kind === "tree") {
      mesh.rotation.z = Math.sin(t * 0.9 + node.x * 0.3) * 0.03;
    }
  });

  renderer.render(scene, camera);
}

buildGround();
buildNodesAndNpc();
fitRenderer();
syncVisualState();
renderUi();
animate();
