import * as THREE from 'three';

const mount = document.getElementById('space-scene');
const chapters = [...document.querySelectorAll('#top,#work,#sylclips-demo,#about,#skills,#contact-title')];
const mobile = matchMedia('(max-width: 760px)');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const renderRatio = () => Math.min(devicePixelRatio || 1, 3, Math.sqrt(14000000 / Math.max(1, innerWidth * innerHeight)));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, t) => lerp(a, b, 1 - Math.exp(-t));
const rand = (a, b) => a + Math.random() * (b - a);
const labels = ['DEPARTURE','SELECTED WORK','SYLCLIPS','EXPERIENCE','TOOLKIT','CONNECT'];
const progressEl = document.getElementById('journey-fill');
const labelEl = document.getElementById('chapter-label');
let pointer = { x: 0, y: 0, tx: 0, ty: 0 };
let targetJourney = 0;
let journey = 0;
let chapterIndex = 0;
let motion = true;
const motionToggle=document.getElementById('motion-toggle');
motionToggle?.addEventListener('click',()=>{
  motion=!motion;
  document.documentElement.classList.toggle('motion-paused',!motion);
  motionToggle.setAttribute('aria-pressed',String(motion));
  motionToggle.setAttribute('aria-label',motion?'Pause scene animation':'Resume scene animation');
  motionToggle.querySelector('span').textContent=motion?'ON':'OFF';
});

function sectionJourney() {
  const y = window.scrollY + window.innerHeight * .38;
  const tops = chapters.map(el => el.getBoundingClientRect().top + window.scrollY);
  let index = 0;
  for (let i = 1; i < tops.length; i++) if (y >= tops[i]) index = i;
  const next = tops[Math.min(index + 1, tops.length - 1)] || tops[index] + window.innerHeight;
  const amount = index === tops.length - 1 ? 0 : clamp((y - tops[index]) / Math.max(1, next - tops[index]), 0, 1);
  chapterIndex = index;
  targetJourney = index + amount;
  if (progressEl) progressEl.style.height = `${clamp(targetJourney / 5, 0, 1) * 100}%`;
  if (labelEl) labelEl.textContent = `${String(index + 1).padStart(2, '0')} / ${labels[index]}`;
}
window.addEventListener('scroll', sectionJourney, { passive: true });
window.addEventListener('resize', sectionJourney);
window.addEventListener('pointermove', event => {
  pointer.tx = event.clientX / innerWidth * 2 - 1;
  pointer.ty = event.clientY / innerHeight * 2 - 1;
}, { passive: true });
window.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; });
sectionJourney();
if(motion){
  document.documentElement.classList.add('motion-ready');
  const slides=[...document.querySelectorAll('.deck-slide')];
  let queued=false;
  const panelDepth=()=>{
    queued=false;
    slides.forEach((slide,i)=>{
      const top=slide.getBoundingClientRect().top;
      const arrive=clamp((innerHeight*.94-top)/(innerHeight*.7),0,1);
      const away=1-arrive;
      const direction=i%2?-1:1;
      slide.style.setProperty('--slide-y',`${Math.round(away*34)}px`);
      slide.style.setProperty('--slide-z',`${Math.round(-away*210)}px`);
      slide.style.setProperty('--slide-ry',`${(direction*away*9).toFixed(2)}deg`);
      slide.style.setProperty('--slide-opacity',(0.22+arrive*.78).toFixed(2));
    });
  };
  const requestDepth=()=>{if(!queued){queued=true;requestAnimationFrame(panelDepth);}};
  window.addEventListener('scroll',requestDepth,{passive:true});
  window.addEventListener('resize',requestDepth);
  panelDepth();
}

const heroCopy = document.querySelector('.hero-copy');
function fallback() {
  document.documentElement.classList.add('no-webgl');
  mount.style.background = 'radial-gradient(circle at 70% 40%, rgba(26,68,112,.35), transparent 50%), url("./earth-hero.png") center center / cover no-repeat, #030713';
}

let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
catch { fallback(); }

if (renderer) {
  mount.appendChild(renderer.domElement);
  renderer.setPixelRatio(renderRatio());
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020610);
  const camera = new THREE.PerspectiveCamera(mobile.matches ? 68 : 58, innerWidth / innerHeight, .1, 700);
  camera.position.set(0, 0, 1);
  const ambient = new THREE.AmbientLight(0x7b91b5, .31);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff4e8, 2.75);
  sun.position.set(14, 10, 20);
  scene.add(sun);
  const cool = new THREE.DirectionalLight(0x306fce, .37);
  cool.position.set(-12, -8, -15);
  scene.add(cool);
  const pointFields=[];

  // Every point lives in 3D; moving the camera changes relative positions and scale.
  function points(positions, colors, sizes, baseOpacity = 1) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase',new THREE.Float32BufferAttribute(sizes.map(()=>Math.random()*Math.PI*2),1));
    const material = new THREE.ShaderMaterial({
      uniforms: { uPixelRatio: { value: renderRatio() }, uOpacity: { value: baseOpacity }, uTime:{value:0} },
      vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aPhase; varying vec3 vColor; varying float vPhase; varying float vSize; uniform float uPixelRatio; void main(){ vColor=aColor;vPhase=aPhase;vSize=aSize; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(aSize*uPixelRatio*128./max(1.,-mv.z),1.15*uPixelRatio,52.0*uPixelRatio); }`,
      fragmentShader: `varying vec3 vColor; varying float vPhase; varying float vSize; uniform float uOpacity;uniform float uTime; void main(){vec2 p=gl_PointCoord-vec2(.5);float d=length(p);float halo=exp(-d*d*17.);float core=exp(-d*d*220.);float cross=exp(-abs(p.x)*52.)*exp(-abs(p.y)*6.)+exp(-abs(p.y)*52.)*exp(-abs(p.x)*6.);float sparkle=step(4.8,vSize)*cross*.55;float pulse=.87+.13*sin(uTime*(.8+vPhase*.12)+vPhase);float a=(halo*.63+core*.88+sparkle)*uOpacity*pulse;vec3 color=mix(vColor,vec3(1.),core*.24);gl_FragColor=vec4(color*1.25,a);}`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const field = new THREE.Points(geometry, material);
    field.frustumCulled = false;
    scene.add(field);
    pointFields.push(field);
    return field;
  }
  const stars = [], starColors = [], starSizes = [];
  const count = mobile.matches ? 35000 : 72000;
  const palette = [[.83,.9,1],[.24,.73,1],[.3,1,.9],[1,.56,.78],[.72,.55,1],[1,.74,.37],[1,.97,.85]];
  for (let i = 0; i < count; i++) {
    // The travel corridor, middle field and distant field occupy separate 3D volumes.
    const layer = Math.random();
    const range = layer < .14 ? 22 : layer < .73 ? 46 : 105;
    const z = rand(-365, layer < .14 ? 8 : -12);
    const x=rand(-range,range),y=rand(-range*.65,range*.65);
    const zones=[[9,-1,-33],[8,1,-92],[-8,-2,-151],[-8,0,-212],[-8,0,-270],[9,-2,-330]];
    if(zones.some(([px,py,pz])=>z>pz&&z<pz+38&&Math.abs(x-px)<10&&Math.abs(y-py)<10)){i--;continue;}
    stars.push(x,y,z);
    const color = palette[Math.floor(Math.random()*palette.length)];
    const light = rand(.72,1.28);
    starColors.push(color[0]*light,color[1]*light,color[2]*light);
    const bright = Math.random();
    starSizes.push(bright > .994 ? rand(5,8.2) : bright > .93 ? rand(2.6,4.7) : rand(1.2,2.8));
  }
  points(stars,starColors,starSizes,1);
  const beaconPositions=[],beaconColors=[],beaconSizes=[];
  for(let i=0;i<(mobile.matches?420:980);i++){
    const z=rand(-360,-8),x=rand(-64,64),y=rand(-40,40);
    if([[9,-1,-33],[8,1,-92],[-8,-2,-151],[-8,0,-212],[-8,0,-270],[9,-2,-330]].some(([px,py,pz])=>z>pz&&z<pz+48&&Math.abs(x-px)<14&&Math.abs(y-py)<14)){i--;continue;}
    beaconPositions.push(x,y,z);
    const tint=palette[Math.floor(Math.random()*palette.length)];
    beaconColors.push(tint[0],tint[1],tint[2]);
    beaconSizes.push(rand(6,16));
  }
  points(beaconPositions,beaconColors,beaconSizes,.62);

  function glowTexture() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(256,256,4,256,256,250);
    grad.addColorStop(0,'rgba(255,255,255,1)');grad.addColorStop(.12,'rgba(170,216,255,.48)');grad.addColorStop(.4,'rgba(81,118,255,.13)');grad.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grad;ctx.fillRect(0,0,512,512);
    return new THREE.CanvasTexture(canvas);
  }
  const glowMap = glowTexture();
  const floaters = [];
  function nebula(x,y,z,scale,color,opacity) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color, transparent: true, opacity, depthWrite:false, blending:THREE.AdditiveBlending }));
    sprite.position.set(x,y,z);sprite.scale.set(scale,scale,1);scene.add(sprite);floaters.push(sprite);return sprite;
  }
  // Layered cloud maps preserve depth: nearby wisps move faster than distant ones.
  function cloudMap(seed) {
    const size=768,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const ctx=canvas.getContext('2d'),image=ctx.createImageData(size,size);
    const hash=(x,y)=>{let v=Math.sin(x*127.1+y*311.7+seed*53.3)*43758.5453;return v-Math.floor(v);};
    const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
      const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
      return lerp(lerp(hash(ix,iy),hash(ix+1,iy),sx),lerp(hash(ix,iy+1),hash(ix+1,iy+1),sx),sy);};
    const fbm=(x,y)=>{let sum=0,amp=.55;for(let o=0;o<5;o++){sum+=noise(x,y)*amp;x*=2.06;y*=2.06;amp*=.5;}return sum;};
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const u=(x/size-.5)*2,v=(y/size-.5)*2;
      const warp=fbm(u*2.2+seed,v*2.2)-.45;
      const wisps=fbm((u+warp*.8)*5+seed*2,(v-warp*.7)*5);
      const fine=fbm(u*13+seed*3,v*13);
      const body=Math.max(0,1-Math.sqrt(u*u*.65+v*v*1.1));
      const density=Math.pow(Math.max(0,wisps*.84+fine*.24-.23),1.65)*body*4.2;
      const p=(y*size+x)*4;image.data[p]=255;image.data[p+1]=255;image.data[p+2]=255;image.data[p+3]=Math.round(clamp(density,0,.76)*255);
    }
    ctx.putImageData(image,0,0);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return map;
  }
  const cloudMaps=[cloudMap(1),cloudMap(8),cloudMap(19)];
  function cloud(x,y,z,w,h,color,opacity,mapIndex){
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:cloudMaps[mapIndex],color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending}));
    sprite.position.set(x,y,z);sprite.scale.set(w,h,1);scene.add(sprite);floaters.push(sprite);
  }
  [
    [7,3,-34,53,31,0x376cff,.63,0],[-17,-7,-53,62,39,0x8c42f0,.53,1],[21,10,-69,45,36,0x1be9e6,.53,2],
    [16,-5,-99,67,45,0x5847d9,.59,1],[-20,6,-123,61,40,0xff4eaf,.51,0],[-11,-9,-150,70,43,0x365eff,.61,2],
    [19,5,-179,69,41,0x1ebeca,.57,1],[16,-11,-226,60,39,0x9861f8,.53,0],[-17,7,-233,72,43,0x8240e9,.57,2],
    [18,-5,-262,65,39,0xf450a0,.55,1],[-9,-4,-294,71,47,0x4278fa,.59,0],[12,8,-322,61,42,0x20ccd9,.57,2]
  ].forEach(args=>cloud(...args));
  const nebulaLoader=new THREE.TextureLoader();
  const paintedClouds=['nebula-cyan.png','nebula-magenta.png'].map(path=>{
    const map=nebulaLoader.load(`./${path}`);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return map;
  });
  function detailedCloud(x,y,z,w,textureIndex,opacity,rotation=0){
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:paintedClouds[textureIndex],transparent:true,opacity,depthWrite:false,blending:THREE.NormalBlending,rotation}));
    sprite.position.set(x,y,z);sprite.scale.set(w,w*.41,1);scene.add(sprite);floaters.push(sprite);
  }
  detailedCloud(-12,-1,-47,67,0,.5,-.15);
  detailedCloud(21,9,-77,57,1,.38,.23);
  detailedCloud(-15,0,-111,69,1,.45,-.13);
  detailedCloud(17,-6,-141,64,0,.45,.14);
  detailedCloud(18,6,-229,73,0,.46,-.16);
  detailedCloud(-17,-5,-233,65,1,.44,.19);
  detailedCloud(10,3,-239,72,1,.46,-.12);
  detailedCloud(-12,2,-280,70,0,.43,.17);
  detailedCloud(14,-5,-316,74,0,.45,-.11);
  nebula(7,3,-35,34,0x586bea,.12);
  nebula(-10,-5,-151,34,0x9862f5,.12);
  nebula(9,4,-261,39,0x34b6d5,.12);
  nebula(24,13,-62,17,0xff806e,.38);
  nebula(24,13,-60,7,0xffddc4,.58);
  nebula(24,13,-59,2.6,0xffffff,.92);

  function planet(radius, color, x,y,z,texture) {
    const group=new THREE.Group();group.position.set(x,y,z);
    const material=texture?.isMaterial?texture:new THREE.MeshStandardMaterial({ color, map:texture||null, roughness:.94, metalness:0 });
    const sphere=new THREE.Mesh(new THREE.SphereGeometry(radius,192,128),material);
    group.add(sphere);
    const halo=new THREE.Mesh(new THREE.SphereGeometry(radius*1.035,96,64),new THREE.ShaderMaterial({
      uniforms:{uColor:{value:new THREE.Color(color)}},
      vertexShader:`varying vec3 vNormal; varying vec3 vView; void main(){vec4 mv=modelViewMatrix*vec4(position,1.); vNormal=normalize(normalMatrix*normal); vView=normalize(-mv.xyz); gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`varying vec3 vNormal; varying vec3 vView; uniform vec3 uColor; void main(){float rim=pow(1.-max(dot(normalize(vNormal),normalize(vView)),0.),4.5);gl_FragColor=vec4(uColor*1.2,rim*.24);}`,
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.FrontSide
    }));group.add(halo);
    scene.add(group);floaters.push(group);return {group,sphere,halo};
  }
  const loader=new THREE.TextureLoader();
  const earth = planet(5.8,0xffffff,9.2,-1.2,-33,null);
  earth.sphere.rotation.y=2.1;
  const cloudTexture=loader.load('./2k_earth_clouds.jpg');
  const cloudShell=new THREE.Mesh(new THREE.SphereGeometry(5.91,144,96),new THREE.MeshStandardMaterial({color:0xffffff,alphaMap:cloudTexture,transparent:true,opacity:.44,depthWrite:false,roughness:1}));
  earth.group.add(cloudShell);
  const world2=planet(6.1,0xffe4cd,8,1,-92,null);
  const world3=planet(6.3,0xf0d8ac,-8,-2,-151,null);
  const world4=planet(5.7,0xe67a54,-8,0,-212,null);
  const world5=planet(6.3,0x537bc4,-8,0,-270,null);
  const world6=planet(6.8,0x80c8db,9,-2,-330,null);
  [earth,world2,world3,world4,world5,world6].forEach((world,i)=>world.halo.material.uniforms.uColor.value.set([0x62b8e6,0xdba480,0xcdb680,0xcf8267,0x628fd5,0x85dbe4][i]));
  const futureWorlds=[world2,world3,world4,world5,world6];
  const planetMaps=[
    {world:earth,desktop:'8k_earth_daymap.jpg',mobile:'earth-2k.jpg'},
    {world:world2,desktop:'8k_jupiter.jpg',mobile:'jupiter-2k.jpg'},
    {world:world3,desktop:'8k_saturn.jpg',mobile:'saturn-2k.jpg'},
    {world:world4,desktop:'mars-8k-source.jpg',mobile:'mars-2k.jpg'},
    {world:world5,desktop:'2k_neptune.jpg',mobile:'2k_neptune.jpg'},
    {world:world6,desktop:'2k_uranus.jpg',mobile:'2k_uranus.jpg'}
  ];
  let textureFocus=-1;
  function syncPlanetMaps(force=false){
    const focus=clamp(Math.round(targetJourney),0,5);
    if(!force&&focus===textureFocus)return;
    textureFocus=focus;
    planetMaps.forEach((entry,i)=>{
      if(Math.abs(i-focus)<=1){
        if(!entry.map){
          const path=mobile.matches?entry.mobile:entry.desktop;
          entry.map=loader.load(`./${path}`,()=>{entry.map.colorSpace=THREE.SRGBColorSpace;entry.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());entry.ready=true;},undefined,()=>{document.documentElement.dataset.planetTexture='unavailable';});
          entry.map.colorSpace=THREE.SRGBColorSpace;
          entry.world.sphere.material.map=entry.map;entry.world.sphere.material.color.set(i===3?0xc8beb5:0xffffff);entry.world.sphere.material.needsUpdate=true;
        }
      }else if(entry.map&&entry.ready){
        entry.world.sphere.material.map=null;entry.world.sphere.material.needsUpdate=true;
        entry.map.dispose();entry.map=null;entry.ready=false;
      }
    });
  }
  syncPlanetMaps(true);
  const positionWorlds=()=>{
    earth.group.position.x=mobile.matches?4.4:9.2;
    world2.group.position.x=mobile.matches?4.4:8;
    world3.group.position.x=mobile.matches?-4.4:-8;
    world4.group.position.x=mobile.matches?-4.4:-8;
    world5.group.position.x=mobile.matches?-4.4:-8;
    world6.group.position.x=mobile.matches?4.4:9;
  };
  positionWorlds();
  function rings(world, inner, outer) {
    const geometry=new THREE.RingGeometry(inner,outer,256,4);
    const material=new THREE.ShaderMaterial({
      uniforms:{uInner:{value:inner},uOuter:{value:outer}},
      vertexShader:`varying vec2 vLocal;void main(){vLocal=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec2 vLocal;uniform float uInner;uniform float uOuter;void main(){float r=length(vLocal);float t=(r-uInner)/(uOuter-uInner);float bands=sin(t*125.)*.14+sin(t*53.)*.17+sin(t*17.)*.12;float gap=1.-smoothstep(.48,.51,t)*(1.-smoothstep(.54,.57,t));float edge=smoothstep(0.,.06,t)*(1.-smoothstep(.9,1.,t));vec3 col=mix(vec3(.34,.25,.19),vec3(.88,.77,.58),clamp(t*.8+bands,0.,1.));gl_FragColor=vec4(col,edge*gap*(.58+bands*.4));}`,
      side:THREE.DoubleSide,transparent:true,depthWrite:false
    });
    const mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=-.47;mesh.rotation.y=.24;world.group.add(mesh);
  }
  rings(world3,7.5,12.5);

  // Spiral clusters are also 3D point clouds, with each arm at a different depth.
  function galaxy(cx,cy,cz,count,radius,hue) {
    const p=[],c=[],s=[];
    for(let i=0;i<count;i++){
      const t=Math.pow(Math.random(),.55), arm=i%4;
      const angle=arm*Math.PI*.5+t*8.5+rand(-.28,.28);
      const r=t*radius;
      p.push(cx+Math.cos(angle)*r+rand(-.9,.9),cy+Math.sin(angle)*r*.52+rand(-.7,.7),cz+rand(-3,3)+Math.sin(angle)*r*.16);
      c.push(hue[0]*rand(.7,1.3),hue[1]*rand(.7,1.3),hue[2]*rand(.7,1.3));
      s.push(rand(.6,2.7));
    }
    points(p,c,s,.77);nebula(cx,cy,cz+2,radius*2,0x667ef0,.22);
  }
  galaxy(10,0,-94,mobile.matches?3000:6000,18,[.55,.69,1]);
  galaxy(-10,2,-268,mobile.matches?3000:6500,19,[.62,.55,1]);

  const resize=()=>{camera.aspect=innerWidth/innerHeight;camera.fov=mobile.matches?68:58;camera.updateProjectionMatrix();positionWorlds();const ratio=renderRatio();renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight);pointFields.forEach(field=>{field.material.uniforms.uPixelRatio.value=ratio;});};
  window.addEventListener('resize',resize);
  let last=performance.now();
  const backdropColors=[0x020610,0x070718,0x03121c,0x130a19,0x0b0820,0x04191c].map(c=>new THREE.Color(c));
  function tick(now){
    const dt=Math.min((now-last)/1000,.05);last=now;
    pointer.x=smooth(pointer.x,pointer.tx,dt*4.5);pointer.y=smooth(pointer.y,pointer.ty,dt*4.5);
    journey=motion?smooth(journey,targetJourney,dt*2.1):targetJourney;
    syncPlanetMaps();
    const chapter=Math.min(4,Math.floor(journey)),blend=clamp(journey-chapter,0,1);
    scene.background.copy(backdropColors[chapter]).lerp(backdropColors[chapter+1],blend);
    const t=now*.001;
    if(motion)pointFields.forEach(field=>{field.material.uniforms.uTime.value=t;});
    const offset=mobile.matches?.42:1;
    const mouseX=motion?pointer.x:0,mouseY=motion?pointer.y:0;
    camera.position.x=smooth(camera.position.x,(Math.sin(journey*1.5)*1.7+mouseX*3.8)*offset,dt*3.2);
    camera.position.y=smooth(camera.position.y,(Math.cos(journey*1.2)*.8-mouseY*2.3)*offset,dt*3.2);
    const mouseApproach=motion?(Math.abs(pointer.x)+Math.abs(pointer.y))*2.8*offset:0;
    camera.position.z=smooth(camera.position.z,1-journey*59-mouseApproach,dt*2.1);
    camera.lookAt(camera.position.x*.36+mouseX*.8,camera.position.y*.2-mouseY*.55,camera.position.z-50);
    camera.rotation.z=motion?Math.sin(journey*1.12)*.025+mouseX*.012:0;
    if(motion){
      earth.sphere.rotation.y+=dt*.034;cloudShell.rotation.y+=dt*.041;world2.sphere.rotation.y+=dt*.038;world3.sphere.rotation.y+=dt*.028;world4.sphere.rotation.y+=dt*.033;world5.sphere.rotation.y+=dt*.027;world6.sphere.rotation.y+=dt*.034;
      floaters.forEach((object,i)=>{if(object.isSprite)object.material.rotation=Math.sin(t*.04+i)*.06;else object.rotation.z=Math.sin(t*.17+i)*.013;});
      if(heroCopy) heroCopy.style.setProperty('--copy-x',`${(-pointer.x*7).toFixed(1)}px`);
    }
    futureWorlds.forEach((world,i)=>{
      const arrival=clamp((journey-(i+.1))/.7,0,1);
      world.group.scale.setScalar(arrival*arrival*(3-2*arrival));
    });
    renderer.render(scene,camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  document.documentElement.dataset.scene='webgl';
}
