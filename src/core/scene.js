import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SceneRuntime {
  constructor(canvas,store){
    this.canvas=canvas;this.store=store;this.clock=new THREE.Clock();
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#0d1118');this.scene.fog=new THREE.FogExp2('#0d1118',0.020);
    this.camera=new THREE.PerspectiveCamera(34,1,0.05,600);this.camera.position.set(3.2,2.05,4.4);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=store.get('environment.exposure');
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;

    this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;this.controls.dampingFactor=.06;
    this.controls.target.set(0,.95,0);this.controls.minDistance=1.1;this.controls.maxDistance=65;this.controls.maxPolarAngle=Math.PI*.495;
    this.content=new THREE.Group();this.scene.add(this.content);

    this.grid=new THREE.GridHelper(80,80,0x354052,0x1b2330);this.grid.material.opacity=.20;this.grid.material.transparent=true;this.scene.add(this.grid);
    const floorMat=new THREE.MeshStandardMaterial({color:'#151a22',roughness:.90,metalness:.01});
    this.floor=new THREE.Mesh(new THREE.CircleGeometry(55,96),floorMat);this.floor.rotation.x=-Math.PI/2;this.floor.receiveShadow=true;this.floor.position.y=-.01;this.scene.add(this.floor);

    this.hemi=new THREE.HemisphereLight(0xdbe8ff,0x2b211d,2.25);this.scene.add(this.hemi);
    this.key=new THREE.DirectionalLight(0xfff0df,4.4);this.key.position.set(4.5,7.5,5.5);this.key.castShadow=true;this.key.shadow.mapSize.set(2048,2048);
    this.key.shadow.camera.left=-12;this.key.shadow.camera.right=12;this.key.shadow.camera.top=12;this.key.shadow.camera.bottom=-12;this.scene.add(this.key);
    this.fill=new THREE.DirectionalLight(0xc8dcff,2.15);this.fill.position.set(-4,3.5,4);this.scene.add(this.fill);
    this.rim=new THREE.DirectionalLight(0x91b6ff,2.0);this.rim.position.set(-4.5,5,-5.5);this.scene.add(this.rim);
    this.faceLight=new THREE.PointLight(0xffe8d8,1.35,8,1.8);this.faceLight.position.set(0,2.15,2.4);this.scene.add(this.faceLight);

    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas.parentElement);this.resize();
    this.animate=this.animate.bind(this);requestAnimationFrame(this.animate);
  }
  resize(){const{clientWidth:w,clientHeight:h}=this.canvas.parentElement;if(!w||!h)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  clearContent(){while(this.content.children.length){const child=this.content.children.pop();child.traverse?.(obj=>{if(obj.geometry)obj.geometry.dispose?.();if(obj.material){const materials=Array.isArray(obj.material)?obj.material:[obj.material];materials.forEach(m=>m.dispose?.());}});}}
  setObject(object,{mode='human'}={}){this.clearContent();this.content.add(object);this.clock.start();this.frame(mode);}
  frame(mode='human'){
    if(mode==='city'){
      this.camera.position.set(12,11,15);this.controls.target.set(0,1.2,0);this.controls.maxDistance=90;this.scene.fog.density=.016;
    }else if(mode==='warehouse'){
      this.camera.position.set(15,10.5,18);this.controls.target.set(0,2.1,0);this.controls.maxDistance=110;this.scene.fog.density=.011;
    }else if(mode==='supermarket'){
      this.camera.position.set(14,9.5,16);this.controls.target.set(0,1.15,0);this.controls.maxDistance=100;this.scene.fog.density=.008;
    }else{
      this.camera.position.set(3.1,1.95,4.2);this.controls.target.set(0,.92,0);this.controls.maxDistance=14;this.scene.fog.density=.020;
    }
    this.controls.update();
  }
  applyEnvironment(env){
    this.renderer.toneMappingExposure=env.exposure;this.floor.material.color.set(env.ground);this.grid.visible=env.grid;
    const phase=(env.timeOfDay/24)*Math.PI*2,sunHeight=Math.sin(phase-Math.PI/2);
    this.key.position.set(Math.cos(phase)*6,Math.max(2.5,sunHeight*8),Math.sin(phase)*6);
    this.key.intensity=THREE.MathUtils.lerp(3.0,5.2,Math.max(.25,(sunHeight+1)/2));
    this.fill.intensity=THREE.MathUtils.lerp(1.5,2.4,Math.max(.2,(sunHeight+1)/2));
  }
  animate(){const elapsed=this.clock.getElapsedTime();for(const object of this.content.children)object.userData?.update?.(elapsed);this.controls.autoRotate=!!this.store.get('environment.autoRotate');this.controls.autoRotateSpeed=.55;this.controls.update();this.renderer.render(this.scene,this.camera);requestAnimationFrame(this.animate);}
}
