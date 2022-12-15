import './style.css'

import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#bg'),
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.z = 500;
camera.position.y = 5;
camera.rotation.y = -0.01;

const gridHelper = new THREE.GridHelper(1000, 300);
scene.add(gridHelper);

let starCount = 0;
function addStar() {
  const geometry = new THREE.SphereGeometry(0.25, 24, 24);
  const material = new THREE.MeshBasicMaterial(0xeeeeee);
  const star = new THREE.Mesh(geometry, material);

  const [x, y, z] = Array(3).fill().map(() => THREE.MathUtils.randFloatSpread(1000));
  star.position.set(x, y, z);
  scene.add(star);

  starCount++;
  if(starCount > 2000) {
    clearInterval(starInterval);
  }
}
let starInterval = setInterval(addStar, 1);

const mouse = new THREE.Vector2();

document.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

document.addEventListener('touchmove', (event) => {
  var touch = event.touches[0] || event.changedTouches[0];
  mouse.x = (touch.pageX / window.innerWidth) * 2 - 1;
  mouse.y = -(touch.pageY / window.innerHeight) * 2 + 1;
});

window.addEventListener('resize', (event) => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let showTorus = false;
const geometry = new THREE.TorusGeometry(10, 3, 16, 100);
const material = new THREE.MeshBasicMaterial({color: 0x55eeff, wireframe: true});
const torus = new THREE.Mesh(geometry, material);
torus.position.y = 5;

document.querySelector('#logo').addEventListener('click', (event) => {
  scene.add(torus);
  showTorus = true;
});

function animate() {
  requestAnimationFrame(animate);

  camera.rotation.x = mouse.y / 10;
  camera.rotation.y = mouse.x / 10;
  camera.position.z -= 0.1;
  if(camera.position.z < -400) {
    camera.position.z = 500;
  }
  if(showTorus) {
    torus.position.z = camera.position.z - 20;
    torus.rotation.x += 0.005;
    torus.rotation.y += 0.007;
    torus.rotation.z += 0.005;
  }

  renderer.render(scene, camera);
}

animate();