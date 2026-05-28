import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0.5, 5.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.domElement.setAttribute('aria-hidden', 'true');
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
const fillLight = new THREE.DirectionalLight(0xffccdd, 0.8);
fillLight.position.set(-4, 2, -3);
scene.add(fillLight);

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

const skinGeo = new THREE.SphereGeometry(1, 48, 48);
displace(skinGeo);

const skinMat = toon(0xc9293f);
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

let _lycheScale = THREE.MathUtils.clamp(innerWidth / 1100, 0.5, 1.0);
function lycheScale() { return _lycheScale; }

const anim = { x: INIT_X, scale: 1.0, rotX: 0, rotSpeed: 0.005, t4: 0 };
const cur  = { x: INIT_X, scale: 1.0, rotX: 0, rotSpeed: 0.005, t4: 0 };

const BG_START = { r: 249, g: 233, b: 233 };
const BG_END   = { r: 201, g: 41,  b: 63  };

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let isHovering = false;
let clickActive = false;
let clickProgress = 0;

const lycheBtn = document.getElementById('lychee-btn');

function startReveal() {
  if (clickActive || document.documentElement.classList.contains('revealed')) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.body.style.background = `rgb(${BG_END.r},${BG_END.g},${BG_END.b})`;
    document.documentElement.classList.add('revealed');
    return;
  }

  clickActive = true;
  clickProgress = 0;
  lycheBtn.style.opacity = '0';
  lycheBtn.style.pointerEvents = 'none';
  if (paused) {
    paused = false;
    animate();
  }
}

renderer.domElement.addEventListener('mousemove', (e) => {
  if (clickActive) return;
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  isHovering = raycaster.intersectObjects([skinMesh]).length > 0;
  renderer.domElement.style.cursor = isHovering ? 'pointer' : 'default';
});

renderer.domElement.addEventListener('click', (e) => {
  if (clickActive) return;
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  if (raycaster.intersectObjects([skinMesh]).length) {
    startReveal();
  }
});

lycheBtn.addEventListener('click', startReveal);

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  _lycheScale = THREE.MathUtils.clamp(innerWidth / 1100, 0.5, 1.0);
});

let tick = 0;
let rafId = null;
let paused = false;
let _lastCoversScreen = false;

function animate() {
  rafId = requestAnimationFrame(animate);
  tick += 0.01;

  if (clickActive) {
    clickProgress = Math.min(clickProgress + 0.013, 1);
    const ease = 1 - Math.pow(1 - clickProgress, 2.5);

    anim.x        = THREE.MathUtils.lerp(INIT_X, 0, Math.min(clickProgress * 5, 1));
    anim.scale    = THREE.MathUtils.lerp(1.0, 9.0, ease);
    anim.t4       = Math.max(0, (clickProgress - 0.12) / 0.88);
    anim.rotX     = 0;
    anim.rotSpeed = THREE.MathUtils.lerp(0.005, 0.002, Math.min(clickProgress * 2, 1));
  } else {
    anim.scale = isHovering ? 1.06 : 1.0;
  }

  const L = 0.07;
  cur.x        += (anim.x        - cur.x)        * L;
  cur.scale    += (anim.scale    - cur.scale)    * L;
  cur.rotX     += (anim.rotX     - cur.rotX)     * L;
  cur.rotSpeed += (anim.rotSpeed - cur.rotSpeed) * 0.1;
  cur.t4       += (anim.t4       - cur.t4)       * L;

  const bobAmp = 0.06 + (1 - cur.t4) * 0.1;
  const bob = Math.sin(tick * 0.9) * bobAmp;
  group.position.y = bob;
  blob.position.y  = -1.32 - bob;
  blob.scale.setScalar(1 - Math.sin(tick * 0.9) * 0.04);

  group.rotation.y     += cur.rotSpeed;
  group.position.x      = cur.x;
  group.rotation.x      = cur.rotX;
  group.scale.setScalar(cur.scale * lycheScale());
  controls.target.x     = cur.x;

  const halfH = camera.position.z * Math.tan((camera.fov / 2) * Math.PI / 180);
  const halfW = halfH * (innerWidth / innerHeight);
  const screenRadius = Math.sqrt(halfH * halfH + halfW * halfW);
  const coversScreen = cur.scale * lycheScale() >= screenRadius;
  if (coversScreen !== _lastCoversScreen) {
    _lastCoversScreen = coversScreen;
    document.body.style.background = coversScreen
      ? `rgb(${BG_END.r},${BG_END.g},${BG_END.b})`
      : `rgb(${BG_START.r},${BG_START.g},${BG_START.b})`;
  }

  const fadeT = THREE.MathUtils.smoothstep(cur.t4, 0.75, 0.98);
  const meshOpacity = 1 - fadeT;
  skinMat.opacity    = meshOpacity;
  outlineMat.opacity = meshOpacity;
  blobMat.opacity    = 0.07 * meshOpacity;

  controls.update();
  renderer.render(scene, camera);

  if (clickActive && cur.t4 > 0.99 && meshOpacity < 0.01) {
    cancelAnimationFrame(rafId);
    paused = true;
    document.body.style.background = `rgb(${BG_END.r},${BG_END.g},${BG_END.b})`;
    document.documentElement.classList.add('revealed');
  }
}

animate();

const countObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = parseInt(el.dataset.target);
    const duration = 1200;
    const start = performance.now();
    (function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(eased * target);
      if (p < 1) requestAnimationFrame(tick);
    })(start);
    countObserver.unobserve(el);
  });
}, { threshold: 0.5 });

document.querySelectorAll('dd[data-target]').forEach(el => countObserver.observe(el));

const s5Title = document.getElementById('s5-title');
if (s5Title) {
  const words = s5Title.textContent.trim().split(/\s+/);
  s5Title.innerHTML = words
    .map((w, i) => `<span class="word" style="--i:${i}">${w}</span>`)
    .join(' ');
}

function launchConfetti() {
  const colors = ['#c9293f', '#111111', '#f9e9e9', '#ffffff', '#e8394f', '#ffaaaa'];
  for (let i = 0; i < 90; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    const size = Math.random() * 0.5 + 0.3;
    el.style.cssText = `
      left:${Math.random() * 100}vw;
      width:${size}rem;
      height:${size * (Math.random() > 0.5 ? 2 : 1)}rem;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration:${Math.random() * 1.5 + 1.5}s;
      animation-delay:${Math.random() * 0.6}s;
    `;
    el.style.setProperty('--drift', `${(Math.random() - 0.5) * 10}rem`);
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

const contactForm = document.getElementById('contact-form');
const contactStatus = document.getElementById('contact-status');

contactForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (contactForm.querySelector('[name="_gotcha"]').value) return;

  const btn = contactForm.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Versturen…';
  contactStatus.textContent = '';

  try {
    const res = await fetch(contactForm.action, {
      method: 'POST',
      body: new FormData(contactForm),
      headers: { Accept: 'application/json' },
    });

    if (res.ok) {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        launchConfetti();
      }
      contactForm.classList.add('contact-success');
      contactForm.innerHTML = `
        <p class="success-title">Bedankt!</p>
        <p class="success-sub">We nemen zo snel mogelijk contact op.</p>
      `;
    } else {
      const data = await res.json().catch(() => ({}));
      contactStatus.textContent = data?.errors?.[0]?.message ?? 'Er ging iets mis. Probeer het opnieuw.';
    }
  } catch {
    contactStatus.textContent = 'Er ging iets mis. Controleer je verbinding.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Verstuur';
    plausible('Contact Form Submit')
  }
});

const track = document.getElementById('work-track');
const cardWidth = () => track.querySelector('article').offsetWidth + 16;
document.getElementById('work-prev').addEventListener('click', () => {
  track.scrollBy({ left: -cardWidth(), behavior: 'smooth' });
});
document.getElementById('work-next').addEventListener('click', () => {
  track.scrollBy({ left: cardWidth(), behavior: 'smooth' });
});
