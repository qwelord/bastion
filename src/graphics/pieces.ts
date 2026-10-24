import * as T from 'three';

let cache: Record<string,string> | undefined;
const profiles: Record<string,number[][]> = {
  p:[[0,0],[.36,0],[.4,.07],[.4,.14],[.31,.22],[.28,.27],[.24,.31],[.17,.5],[.14,.7],[.21,.78],[.21,.85],[.13,.9]],
  r:[[0,0],[.42,0],[.45,.08],[.44,.17],[.35,.25],[.31,.32],[.28,.44],[.25,1.02],[.32,1.07],[.36,1.13],[.36,1.28]],
  n:[[0,0],[.42,0],[.44,.09],[.41,.18],[.32,.27],[.31,.34],[.27,.4],[.25,.48]],
  b:[[0,0],[.42,0],[.45,.09],[.42,.19],[.33,.27],[.29,.34],[.25,.43],[.17,.8],[.15,1.02],[.27,1.08],[.27,1.16],[.17,1.21]],
  q:[[0,0],[.45,0],[.47,.09],[.44,.2],[.35,.29],[.31,.36],[.28,.43],[.18,.85],[.17,1.19],[.29,1.24],[.29,1.32],[.2,1.37],[.27,1.59],[.31,1.67]],
  k:[[0,0],[.45,0],[.48,.09],[.45,.2],[.35,.29],[.31,.37],[.27,.45],[.18,.9],[.17,1.2],[.3,1.26],[.3,1.34],[.2,1.4],[.24,1.51],[.18,1.58]],
};
function makePiece(kind:string,material:T.Material) {
  const group=new T.Group();
  const add=(geometry:T.BufferGeometry,x=0,y=0,z=0,mat=material)=>{ const m=new T.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m; };
  add(new T.LatheGeometry(profiles[kind].map(([r,y])=>new T.Vector2(r,y)),64));
  if(kind==='p') add(new T.SphereGeometry(.245,32,24),0,1.06);
  if(kind==='r') { add(new T.CylinderGeometry(.36,.36,.13,48),0,1.29);for(let i=0;i<6;i++){const a=i*Math.PI/3;const m=add(new T.BoxGeometry(.16,.22,.18),Math.cos(a)*.27,1.44,Math.sin(a)*.27);m.rotation.y=-a;} }
  if(kind==='b') { const head=add(new T.SphereGeometry(.26,32,24),0,1.43);head.scale.set(.82,1.25,.82);add(new T.SphereGeometry(.075,24,16),0,1.75);const slit=add(new T.BoxGeometry(.025,.28,.03),.06,1.5,.202,new T.MeshStandardMaterial({color:'#5c4835'}));slit.rotation.z=-.38; }
  if(kind==='q') {add(new T.CylinderGeometry(.3,.22,.12,48),0,1.63);for(let i=0;i<8;i++){const a=i*Math.PI/4;add(new T.SphereGeometry(.065,16,12),Math.cos(a)*.27,1.76,Math.sin(a)*.27);}add(new T.SphereGeometry(.095,24,16),0,1.81);}
  if(kind==='k') { add(new T.SphereGeometry(.17,24,16),0,1.61);add(new T.BoxGeometry(.12,.43,.12),0,1.9);add(new T.BoxGeometry(.37,.12,.12),0,1.94); }
  if(kind==='n') {
    const s=new T.Shape();s.moveTo(-.3,.43);s.bezierCurveTo(-.32,.8,-.2,1.18,-.06,1.46);s.lineTo(-.08,1.75);s.lineTo(.06,1.65);s.lineTo(.15,1.78);s.lineTo(.21,1.51);s.bezierCurveTo(.31,1.43,.4,1.3,.42,1.21);s.lineTo(.55,1.11);s.lineTo(.5,.94);s.lineTo(.27,.95);s.lineTo(.12,1.06);s.bezierCurveTo(.05,.87,.37,.7,.31,.43);s.closePath();
    const m=add(new T.ExtrudeGeometry(s,{depth:.29,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.045,bevelThickness:.05}),0,0,-.145);m.rotation.y=-.18;
    add(new T.SphereGeometry(.027,16,12),.21,1.36,.205,new T.MeshStandardMaterial({color:'#211d19',roughness:.3}));
    for(let i=0;i<7;i++){const mane=add(new T.BoxGeometry(.1,.055,.34),-.24+i*.019,.72+i*.11);mane.rotation.z=-.3;}
  }
  return group;
}
export function pieceImages():Record<string,string> {
  if(cache)return cache;
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(240,280);renderer.setPixelRatio(1);renderer.setClearColor(0,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
  const scene=new T.Scene();scene.add(new T.HemisphereLight(0xfff5df,0x514b45,2));
  const key=new T.DirectionalLight(0xfff3db,4.2);key.position.set(-3,6,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);
  const rim=new T.DirectionalLight(0xffffff,2.5);rim.position.set(3,3,-3);scene.add(rim);
  const floor=new T.Mesh(new T.PlaneGeometry(8,8),new T.ShadowMaterial({opacity:.24}));floor.rotation.x=-Math.PI/2;floor.position.y=-.015;floor.receiveShadow=true;scene.add(floor);
  const camera=new T.OrthographicCamera(-.87,.87,2.25,.22,.1,50);camera.position.set(0,3.25,8);camera.lookAt(0,.7,0);camera.updateProjectionMatrix();
  cache={};
  for(const side of ['w','b'])for(const kind of ['p','n','b','r','q','k']){
    const material=new T.MeshStandardMaterial({color:side==='w'?0xe4cda4:0x40352e,roughness:.32,metalness:.12});
    const model=makePiece(kind,material);scene.add(model);renderer.render(scene,camera);cache[side+kind]=renderer.domElement.toDataURL('image/png');scene.remove(model);
    model.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();if(o.material!==material)o.material.dispose();}});material.dispose();
  }
  floor.geometry.dispose();(floor.material as T.Material).dispose();renderer.dispose();renderer.forceContextLoss();return cache;
}
