import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneRuntime {
  constructor(canvas, store) {
    this.canvas = canvas;
    this.store = store;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0b0f16');
    this.scene.fog = new THREE.FogExp2('#0b0f16', 0.025);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 600);
    this.camera.position.set(4.8, 2.9, 6.4);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = store.get('environment.exposure');
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(0, 1.05, 0);
    this.controls.minDistance = 1.3;
    this.controls.maxDistance = 65;
    this.controls.maxPolarAngle = Math.PI * 0.495;

    this.content = new THREE.Group();
    this.scene.add(this.content);

    this.grid = new THREE.GridHelper(80, 80, 0x344154, 0x1a2230);
    this.grid.material.opacity = 0.26;
    this.grid.material.transparent = true;
    this.scene.add(this.grid);

    const floorMat = new THREE.MeshStandardMaterial({ color: '#10151d', roughness: 0.92, metalness: 0.02 });
    this.floor = new THREE.Mesh(new THREE.CircleGeometry(55, 96), floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    this.floor.position.y = -0.01;
    this.scene.add(this.floor);

    this.hemi = new THREE.HemisphereLight(0x8fb7ff, 0x16100d, 1.45);
    this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xffd5ba, 3.2);
    this.key.position.set(5, 8, 5);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.camera.left = -22;
    this.key.shadow.camera.right = 22;
    this.key.shadow.camera.top = 22;
    this.key.shadow.camera.bottom = -22;
    this.scene.add(this.key);

    this.rim = new THREE.DirectionalLight(0x7aa7ff, 1.5);
    this.rim.position.set(-5, 4, -6);
    this.scene.add(this.rim);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas.parentElement;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  clearContent() {
    while (this.content.children.length) {
      const child = this.content.children.pop();
      child.traverse?.(obj => {
        if (obj.geometry) obj.geometry.dispose?.();
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          materials.forEach(m => m.dispose?.());
        }
      });
    }
  }

  setObject(object, { mode = 'human' } = {}) {
    this.clearContent();
    this.content.add(object);
    this.frame(mode);
  }

  frame(mode = 'human') {
    if (mode === 'city') {
      this.camera.position.set(12, 11, 15);
      this.controls.target.set(0, 1.2, 0);
      this.controls.maxDistance = 90;
      this.scene.fog.density = 0.016;
    } else {
      this.camera.position.set(4.7, 2.8, 6.2);
      this.controls.target.set(0, 1.0, 0);
      this.controls.maxDistance = 18;
      this.scene.fog.density = 0.025;
    }
    this.controls.update();
  }

  applyEnvironment(env) {
    this.renderer.toneMappingExposure = env.exposure;
    this.floor.material.color.set(env.ground);
    this.grid.visible = env.grid;
    const phase = (env.timeOfDay / 24) * Math.PI * 2;
    const sunHeight = Math.sin(phase - Math.PI / 2);
    this.key.position.set(Math.cos(phase) * 7, Math.max(1.5, sunHeight * 9), Math.sin(phase) * 7);
    this.key.intensity = THREE.MathUtils.lerp(1.4, 4.2, Math.max(0.15, (sunHeight + 1) / 2));
  }

  animate() {
    this.controls.autoRotate = !!this.store.get('environment.autoRotate');
    this.controls.autoRotateSpeed = 0.6;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  }
}