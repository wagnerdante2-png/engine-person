import * as THREE from 'three';

const physical=(color,roughness=.45)=>new THREE.MeshPhysicalMaterial({color,roughness,metalness:0,clearcoat:.03,clearcoatRoughness:.72});
function sphere(rx,ry,rz,material,segments=36){const g=new THREE.SphereGeometry(1,segments,Math.max(18,Math.round(segments*.62)));g.scale(rx,ry,rz);const m=new THREE.Mesh(g,material);m.castShadow=true;m.receiveShadow=true;return m;}
function place(group,obj,x,y,z,name='',rx=0,ry=0,rz=0){obj.position.set(x,y,z);obj.rotation.set(rx,ry,rz);if(name)obj.name=name;group.add(obj);return obj;}
function tube(points,radius,material,segments=20){const c=new THREE.CatmullRomCurve3(points);const m=new THREE.Mesh(new THREE.TubeGeometry(c,segments,radius,8,false),material);m.castShadow=true;return m;}

export function createSurfaceFaceDetails(h,p,M){
  const g=new THREE.Group();g.name='FaceAssemblySurfaceV4';
  const R=p.headR,Y=p.headY;
  const eyeX=R*.31*(h.eyeSpacing??1),eyeY=Y+R*.065,faceZ=R*.855*(h.headDepth??1);
  const lash=physical(h.hair??'#35251f',.70);
  const dark=physical('#231715',.64);
  const tear=new THREE.MeshPhysicalMaterial({color:'#d7ecf4',transparent:true,opacity:.22,roughness:.02,clearcoat:1});

  for(const sx of [-1,1]){
    const side=sx<0?'L':'R';
    const asym=(h.asymmetry??0)*R*.035*sx;
    const ex=sx*eyeX+asym,ey=eyeY+asym*.08;
    place(g,sphere(R*.139*(h.eyeScale??1),R*.075*(h.eyeScale??1),R*.061,M.eyeWhite,44),ex,ey,faceZ,`EyeBall_${side}`);
    place(g,sphere(R*.061*(h.eyeScale??1),R*.061*(h.eyeScale??1),R*.021,M.iris,34),ex,ey,faceZ+R*.054,`Iris_${side}`);
    place(g,sphere(R*.024,R*.024,R*.008,M.pupil,24),ex,ey,faceZ+R*.075,`Pupil_${side}`);
    place(g,sphere(R*.143*(h.eyeScale??1),R*.078*(h.eyeScale??1),R*.010,M.cornea,42),ex,ey,faceZ+R*.078,`Cornea_${side}`);

    const upper=new THREE.Mesh(new THREE.TorusGeometry(R*.103*(h.eyeScale??1),R*.012,8,54,Math.PI),M.skin);
    place(g,upper,ex,ey+R*.010,faceZ+R*.069,`UpperLid_${side}`,0,0,sx<0?Math.PI:0);
    const lower=new THREE.Mesh(new THREE.TorusGeometry(R*.100*(h.eyeScale??1),R*.0075,8,54,Math.PI),M.skin);
    place(g,lower,ex,ey-R*.011,faceZ+R*.068,`LowerLid_${side}`,0,0,sx<0?0:Math.PI);

    const brow=tube([
      new THREE.Vector3(ex-sx*R*.132,ey+R*.175,faceZ+R*.026),
      new THREE.Vector3(ex-sx*R*.025,ey+R*.205*(h.browHeight??1),faceZ+R*.041),
      new THREE.Vector3(ex+sx*R*.138,ey+R*.168,faceZ+R*.024)
    ],R*.010*(h.browThickness??1),lash,24);brow.name=`Brow_${side}`;g.add(brow);

    const tearline=tube([
      new THREE.Vector3(ex-sx*R*.100,ey-R*.050,faceZ+R*.074),
      new THREE.Vector3(ex,ey-R*.057,faceZ+R*.080),
      new THREE.Vector3(ex+sx*R*.100,ey-R*.047,faceZ+R*.073)
    ],R*.0038,tear,18);tearline.name=`Tearline_${side}`;g.add(tearline);

    // Small nostril openings only; nose volume itself is sculpted into the head mesh.
    place(g,sphere(R*.020,R*.010,R*.008,dark,18),sx*R*.050*(h.noseWidth??1),Y-R*.202,faceZ+R*.100,`Nostril_${side}`);

    // Ear cartilage remains separate but thin.
    const earOuter=new THREE.Mesh(new THREE.TorusGeometry(R*.105*(h.earScale??1),R*.022,10,42),M.skin);
    earOuter.scale.set(.62,1.10,.32);
    place(g,earOuter,sx*R*.915*(h.faceWidth??1),Y-R*.015,-R*.010,`Ear_${side}`,0,Math.PI/2,0);
    const concha=sphere(R*.026,R*.050,R*.012,dark,24);
    place(g,concha,sx*R*.927*(h.faceWidth??1),Y-R*.018,0,`EarConcha_${side}`);
  }

  const lipMat=physical(h.lipColor??'#a66362',.39);
  const mouthY=Y-R*.37,lipW=R*.185*(h.mouthWidth??1),front=faceZ+R*.035;
  place(g,sphere(lipW,R*.024*(h.lipFullness??1),R*.016,lipMat,42),0,mouthY+R*.014,front,'Lip_Upper');
  place(g,sphere(lipW*.97,R*.028*(h.lipFullness??1),R*.018,lipMat,42),0,mouthY-R*.018,front-R*.002,'Lip_Lower');
  const gap=new THREE.Mesh(new THREE.BoxGeometry(lipW*1.58,R*.006,R*.006),dark);place(g,gap,0,mouthY,front+R*.014,'MouthGap');
  if((h.oralDetail??.8)>.30){
    const teeth=new THREE.Mesh(new THREE.BoxGeometry(lipW*1.18,R*.022,R*.010),M.teeth);place(g,teeth,0,mouthY-R*.002,front+R*.018,'Teeth');
    const tongue=sphere(lipW*.48,R*.010,R*.015,M.tongue,22);place(g,tongue,0,mouthY-R*.022,front+R*.010,'Tongue');
  }

  g.userData.faceAssembly={version:'4.0',strategy:'surface-first',primitiveVolumeReduced:true};
  return g;
}
