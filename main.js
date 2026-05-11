import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0.5, 5.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const INIT_X = 1.6;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(INIT_X, 0, 0);
controls.minDistance = 3;
controls.maxDistance = 10;
controls.autoRotate = false;
controls.enableRotate = false;
controls.enablePan = false;
controls.enableZoom = false;

scene.add(new THREE.AmbientLight(0xffffff, 1.8));
const sun = new THREE.DirectionalLight(0xffffff, 2.0);
sun.position.set(5, 8, 6);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xffccdd, 0.8);
fill.position.set(-4, 2, -3);
scene.add(fill);

const gradData = new Uint8Array([60, 140, 230]);
const gradMap = new THREE.DataTexture(gradData, 3, 1, THREE.RedFormat);
gradMap.minFilter = THREE.NearestFilter;
gradMap.magFilter = THREE.NearestFilter;
gradMap.needsUpdate = true;
const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap: gradMap });

const noise = (x, y, z, f, a) =>
  (Math.sin(x * f) * Math.cos(y * f * 1.3) * Math.sin(z * f * 0.9) +
    Math.sin(x * f * 2.1 + 0.4) * Math.cos(y * f * 1.8) * Math.cos(z * f * 2.3) +
    Math.sin(x * f * 4.3 + 1.1) * Math.sin(y * f * 3.9 + 0.7) * Math.cos(z * f * 4.1)) * a;

const displace = (geo) => {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const bump = noise(x, y, z, 5, 0.055) + noise(x, y, z, 10, 0.02);
    const theta = Math.atan2(Math.sqrt(x * x + z * z), y);
    const fl = 1 - 0.06 * Math.exp(-Math.pow(theta - Math.PI / 2, 2) * 2);
    const d = 1 + bump;
    pos.setXYZ(i, x * d * fl, y * d, z * d * fl);
  }
  geo.computeVertexNormals();
};

const group = new THREE.Group();
group.position.set(INIT_X, 0, 0);
scene.add(group);

const skinGeo = new THREE.SphereGeometry(1, 80, 80);
displace(skinGeo);

const skinMat = toon(0xe8364f);
skinMat.transparent = true;
const skinMesh = new THREE.Mesh(skinGeo, skinMat);
group.add(skinMesh);

const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, side: THREE.BackSide, transparent: true });
const outlineMesh = new THREE.Mesh(skinGeo, outlineMat);
outlineMesh.scale.setScalar(1.044);
group.add(outlineMesh);

const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.07 });
const blob = new THREE.Mesh(
  new THREE.CircleGeometry(0.9, 48),
  blobMat
);
blob.rotation.x = -Math.PI / 2;
blob.position.y = -1.32;
group.add(blob);

function lycheScale() {
  return THREE.MathUtils.clamp(innerWidth / 1100, 0.5, 1.0);
}

// ── Scroll-driven animation ──────────────────────────────────────────────────
const anim = { x: INIT_X, scale: 1.0, rotX: 0, rotSpeed: 0.005, t4: 0 };
const cur  = { x: INIT_X, scale: 1.0, rotX: 0, rotSpeed: 0.005, t4: 0 };

const BG_START = { r: 249, g: 233, b: 233 };
const BG_END   = { r: 232, g: 54,  b: 79  };

window.addEventListener("scroll", () => {
  const maxScroll = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  if (maxScroll <= 0) return;
  const p = Math.min(window.scrollY / maxScroll, 1);

  if (p < 0.33) {
    const t = p / 0.33;
    anim.x        = THREE.MathUtils.lerp(INIT_X, 0, t);
    anim.scale    = THREE.MathUtils.lerp(1.0, 1.28, t);
    anim.rotX     = THREE.MathUtils.lerp(0, 0.42, t);
    anim.rotSpeed = THREE.MathUtils.lerp(0.005, 0.002, t);
    anim.t4       = 0;
  } else if (p < 0.67) {
    const t = (p - 0.33) / 0.34;
    anim.x        = THREE.MathUtils.lerp(0, -INIT_X, t);
    anim.scale    = THREE.MathUtils.lerp(1.28, 1.0, t);
    anim.rotX     = THREE.MathUtils.lerp(0.42, 0, t);
    anim.rotSpeed = THREE.MathUtils.lerp(0.002, 0.022, t);
    anim.t4       = 0;
  } else {
    const t = (p - 0.67) / 0.33;
    anim.x        = THREE.MathUtils.lerp(-INIT_X, 0, t);
    anim.scale    = THREE.MathUtils.lerp(1.0, 9.0, t);
    anim.rotX     = THREE.MathUtils.lerp(0, 0.18, t);
    anim.rotSpeed = THREE.MathUtils.lerp(0.022, 0.002, t);
    anim.t4       = t;
  }
}, { passive: true });

// ── Resize ───────────────────────────────────────────────────────────────────
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── Render loop ──────────────────────────────────────────────────────────────
let tick = 0;
let rafId = null;
let paused = false;

function resume() {
  if (paused) {
    paused = false;
    animate();
  }
}

window.addEventListener("scroll", resume, { passive: true });

function animate() {
  rafId = requestAnimationFrame(animate);
  tick += 0.01;

  const L = 0.07;
  cur.x        += (anim.x        - cur.x)        * L;
  cur.scale    += (anim.scale    - cur.scale)    * L;
  cur.rotX     += (anim.rotX     - cur.rotX)     * L;
  cur.rotSpeed += (anim.rotSpeed - cur.rotSpeed) * 0.1;
  cur.t4       += (anim.t4       - cur.t4)       * L;

  const bob = Math.sin(tick * 0.9) * 0.06;
  group.position.y = bob;
  blob.position.y  = -1.32 - bob;
  blob.scale.setScalar(1 - Math.sin(tick * 0.9) * 0.04);

  group.rotation.y     += cur.rotSpeed;
  group.position.x      = cur.x;
  group.rotation.x      = cur.rotX;
  group.scale.setScalar(cur.scale * lycheScale());
  controls.target.x     = cur.x;

  // Snap bg to lychee red once the sphere covers the full viewport
  const halfH = camera.position.z * Math.tan((camera.fov / 2) * Math.PI / 180);
  const halfW = halfH * (innerWidth / innerHeight);
  const screenRadius = Math.sqrt(halfH * halfH + halfW * halfW);
  const coversScreen = cur.scale * lycheScale() >= screenRadius;
  document.body.style.background = coversScreen
    ? `rgb(${BG_END.r},${BG_END.g},${BG_END.b})`
    : `rgb(${BG_START.r},${BG_START.g},${BG_START.b})`;

  // Section 4: lychee fades out once background has settled
  const fadeT = THREE.MathUtils.smoothstep(cur.t4, 0.55, 0.92);
  const meshOpacity = 1 - fadeT;
  skinMat.opacity    = meshOpacity;
  outlineMat.opacity = meshOpacity;
  blobMat.opacity    = 0.07 * meshOpacity;

  controls.update();
  renderer.render(scene, camera);

  // Stop rendering once lychee is invisible and screen is covered
  if (meshOpacity < 0.005 && coversScreen) {
    cancelAnimationFrame(rafId);
    paused = true;
  }
}

animate();
