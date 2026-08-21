import * as THREE from 'three';

const smoothMaterial=(color,roughness=.5)=>new THREE.MeshPhysicalMaterial({
  color,roughness,metalness:0,clearcoat:.04,clearcoatRoughness:.7,sheen:.08,sheenRoughness:.8
});

function sphere(rx,ry,rz,material,segments=36){
  const g=new THREE.SphereGeometry(1,segments,Math.max(18,Math.round(segments*.65)));
  g.scale(rx,ry,rz);
  const m=new THREE.Mesh(g,material);m.castShadow=true;m.receiveShadow=true;return m;
}
function place(group,obj,x,y,z,name='',rx=0,ry=0,rz=0){
  obj.position.set(x,y,z);obj.rotation.set(rx,ry,rz);if(name)obj.name=name;group.add(obj);return obj;
}
function tube(points,radius,material,segments=20){
  const curve=new THREE.CatmullRomCurve3(points);
  const m=new THREE.Mesh(new THREE.TubeGeometry(curve,segments,radius,8,false),material);m.castShadow=true;return m;
}

export function createHumanFaceAssembly(h,p,M){
  const g=new THREE.Group();g.name='FaceAssemblyV2';
  const {headR,headY}=p;
  const eyeY=headY+headR*.09;
  const eyeX=headR*.31*(h.eyeSpacing??1);
  const eyeZ=headR*.86*(h.headDepth??1);
  const skin=M.skin;
  const dark=smoothMaterial('#281b18',.58);
  const tear=new THREE.MeshPhysicalMaterial({color:'#d9edf4',transparent:true,opacity:.25,roughness:.02,clearcoat:1});
  const lashMat=smoothMaterial(h.hair??'#33251f',.72);

  for(const sx of [-1,1]){
    const side=sx<0?'L':'R';
    const asym=(h.asymmetry??0)*headR*.05*sx;
    const ex=sx*eyeX+asym, ey=eyeY+asym*.08;
    const eye=sphere(headR*.145*(h.eyeScale??1),headR*.077*(h.eyeScale??1),headR*.063,M.eyeWhite,40);
    place(g,eye,ex,ey,eyeZ,`EyeBall_${side}`);
    place(g,sphere(headR*.063*(h.eyeScale??1),headR*.063*(h.eyeScale??1),headR*.024,M.iris,32),ex,ey,eyeZ+headR*.054,`Iris_${side}`);
    place(g,sphere(headR*.026,headR*.026,headR*.009,M.pupil,24),ex,ey,eyeZ+headR*.076,`Pupil_${side}`);
    place(g,sphere(headR*.148*(h.eyeScale??1),headR*.080*(h.eyeScale??1),headR*.012,M.cornea,40),ex,ey,eyeZ+headR*.079,`Cornea_${side}`);

    const lidMat=skin;
    const upper=new THREE.Mesh(new THREE.TorusGeometry(headR*.105,headR*.018,8,48,Math.PI),lidMat);
    place(g,upper,ex,ey+headR*.012,eyeZ+headR*.070,`UpperLid_${side}`,0,0,sx<0?Math.PI:0);
    const lower=new THREE.Mesh(new THREE.TorusGeometry(headR*.100,headR*.011,8,48,Math.PI),lidMat);
    place(g,lower,ex,ey-headR*.010,eyeZ+headR*.069,`LowerLid_${side}`,0,0,sx<0?0:Math.PI);

    const browPoints=[
      new THREE.Vector3(ex-sx*headR*.135,ey+headR*.19,eyeZ+headR*.035),
      new THREE.Vector3(ex,ey+headR*.22*(h.browHeight??1),eyeZ+headR*.048),
      new THREE.Vector3(ex+sx*headR*.14,ey+headR*.18,eyeZ+headR*.032)
    ];
    const brow=tube(browPoints,headR*.012*(h.browThickness??1),lashMat,22);brow.name=`Brow_${side}`;g.add(brow);

    const tearline=tube([
      new THREE.Vector3(ex-sx*headR*.10,ey-headR*.055,eyeZ+headR*.076),
      new THREE.Vector3(ex,ey-headR*.062,eyeZ+headR*.081),
      new THREE.Vector3(ex+sx*headR*.10,ey-headR*.052,eyeZ+headR*.074)
    ],headR*.005,tear,16);tearline.name=`Tearline_${side}`;g.add(tearline);

    const earOuter=new THREE.Mesh(new THREE.TorusGeometry(headR*.115*(h.earScale??1),headR*.031,10,36),skin);
    earOuter.scale.set(.68,1.12,.42);
    place(g,earOuter,sx*headR*.91*(h.faceWidth??1),headY-headR*.02,-headR*.015,`Ear_${side}`,0,Math.PI/2,0);
    const earInner=sphere(headR*.034,headR*.060,headR*.017,dark,24);
    place(g,earInner,sx*headR*.925*(h.faceWidth??1),headY-headR*.02,0,`EarConcha_${side}`);
  }

  const bridgePts=[
    new THREE.Vector3(0,headY+headR*.20,eyeZ-headR*.025),
    new THREE.Vector3(0,headY+headR*.04,eyeZ+headR*.012),
    new THREE.Vector3(0,headY-headR*.12,eyeZ+headR*.065)
  ];
  const bridge=tube(bridgePts,headR*.047*(h.noseWidth??1),skin,28);bridge.name='NoseBridge';g.add(bridge);
  place(g,sphere(headR*.095*(h.noseWidth??1),headR*.070,headR*.082,skin,34),0,headY-headR*.17,eyeZ+headR*.092,'NoseTip');
  for(const sx of [-1,1]){
    place(g,sphere(headR*.050*(h.noseWidth??1),headR*.036,headR*.046,skin,28),sx*headR*.067*(h.noseWidth??1),headY-headR*.19,eyeZ+headR*.072,`NoseWing_${sx<0?'L':'R'}`);
    place(g,sphere(headR*.023,headR*.014,headR*.012,dark,18),sx*headR*.049*(h.noseWidth??1),headY-headR*.205,eyeZ+headR*.116,`Nostril_${sx<0?'L':'R'}`);
  }

  const philtrum=tube([
    new THREE.Vector3(0,headY-headR*.23,eyeZ+headR*.105),
    new THREE.Vector3(0,headY-headR*.29,eyeZ+headR*.112)
  ],headR*.010,dark,8);philtrum.material.transparent=true;philtrum.material.opacity=.28;philtrum.name='Philtrum';g.add(philtrum);

  const lipMat=smoothMaterial(h.lipColor??'#9b5b57',.40);
  const mouthY=headY-headR*.37;
  const lipW=headR*.19*(h.mouthWidth??1);
  place(g,sphere(lipW,headR*.032*(h.lipFullness??1),headR*.028,lipMat,40),0,mouthY+headR*.018,eyeZ+headR*.060,'Lip_Upper');
  place(g,sphere(lipW*.97,headR*.038*(h.lipFullness??1),headR*.030,lipMat,40),0,mouthY-headR*.020,eyeZ+headR*.058,'Lip_Lower');
  const gap=new THREE.Mesh(new THREE.BoxGeometry(lipW*1.65,headR*.010,headR*.010),dark);gap.name='MouthGap';place(g,gap,0,mouthY,eyeZ+headR*.086);

  if((h.oralDetail??.8)>.25){
    const teeth=new THREE.Mesh(new THREE.BoxGeometry(lipW*1.30,headR*.032,headR*.014),M.teeth);teeth.name='Teeth';place(g,teeth,0,mouthY-headR*.003,eyeZ+headR*.095);
    const tongue=sphere(lipW*.55,headR*.015,headR*.022,M.tongue,22);tongue.name='Tongue';place(g,tongue,0,mouthY-headR*.030,eyeZ+headR*.083);
  }

  const chin=sphere(headR*.23*(h.chinSize??1),headR*.11,headR*.10,skin,36);
  place(g,chin,0,headY-headR*.66,headR*.50*(h.headDepth??1),'ChinVolume');
  return g;
}

export function createAnatomicalNeck(profile, material){
  const H=profile.H;
  const height=H*.095;
  const r=H*.030*(profile.bodyMass??1);
  const geom=new THREE.CapsuleGeometry(r,height-r*2,8,32);
  const neck=new THREE.Mesh(geom,material);neck.castShadow=true;neck.receiveShadow=true;neck.name='AnatomicalNeck';
  neck.position.set(0,profile.shoulderY+H*.060,0);
  return neck;
}

export function createShoulderCaps(profile,material){
  const g=new THREE.Group();g.name='ShoulderCaps';
  const H=profile.H;
  for(const sx of [-1,1]){
    const cap=sphere(H*.050,H*.057,H*.047,material,36);
    place(g,cap,sx*profile.shoulderHalf*.91,profile.shoulderY-H*.018,0,`Deltoid_${sx<0?'L':'R'}`,0,0,sx*.05);
  }
  return g;
}

export function createKneeCap(profile,side,material){
  const H=profile.H;const x=(side==='L'?-1:1)*profile.hipHalf*.54;
  const y=profile.hipY-profile.legLen*.50-H*.012;
  const m=sphere(H*.032,H*.034,H*.030,material,30);m.position.set(x,y,H*.018);m.name=`KneeCap_${side}`;return m;
}

export function createAnkleFoot(profile,side,material){
  const H=profile.H;const sx=side==='L'?-1:1;const x=sx*profile.hipHalf*.53;
  const group=new THREE.Group();group.name=`FootAssembly_${side}`;
  const ankle=sphere(H*.023,H*.030,H*.022,material,28);place(group,ankle,x,H*.065,0,`Ankle_${side}`);
  const foot=sphere(H*.038,H*.028,H*.092,material,36);foot.rotation.x=-.10;place(group,foot,x,H*.030,H*.052,`Foot_${side}`);
  const toe=sphere(H*.041,H*.022,H*.055,material,32);place(group,toe,x,H*.026,H*.120,`ToeBox_${side}`);
  return group;
}
