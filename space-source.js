import * as THREE from 'three';

const mount = document.getElementById('space-scene');
const chapters = [...document.querySelectorAll('#top,#work,#sylclips-demo,#about,#skills,#contact-title')];
const mobile = matchMedia('(max-width: 760px)');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const renderRatio = () => Math.min(devicePixelRatio || 1, 2.15, Math.sqrt(10000000 / Math.max(1, innerWidth * innerHeight)));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, t) => lerp(a, b, 1 - Math.exp(-t));
const rand = (a, b) => a + Math.random() * (b - a);
const labels = ['DEPARTURE','SELECTED WORK','SYLCLIPS','EXPERIENCE','TOOLKIT','CONNECT'];
const progressEl = document.getElementById('journey-fill');
const labelEl = document.getElementById('chapter-label');
let pointer = { x: 0, y: 0, tx: 0, ty: 0, activity: 0, targetActive: 0 };
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

// Keep the same sky map available after the hero, and mark the actual place
// reached by scrolling or by choosing a destination.
const heroChart=document.querySelector('.constellation-nav');
const chartMap=heroChart?.querySelector('.constellation-map');
if(chartMap){
  const traveler=document.createElement('span');
  traveler.className='chart-traveler';
  traveler.setAttribute('aria-hidden','true');
  chartMap.appendChild(traveler);
}
const chartDock=heroChart?.cloneNode(true);
if(chartDock){
  chartDock.classList.add('constellation-dock');
  chartDock.setAttribute('aria-label','Persistent portfolio navigation');
  chartDock.inert=true;
  document.body.appendChild(chartDock);
}
const charts=[heroChart,chartDock].filter(Boolean);
const chartPositions={
  '#top':[48.7,48], '#about':[14.1,11], '#work-fullstack':[8.7,62],
  '#work-ai':[83.2,8], '#work-frontend':[89.6,61],
  '#skills':[35.4,85], '#contact':[66.5,85]
};
const routeStops=[
  ['work','#work-fullstack'],
  ['work-ai','#work-ai'],
  ['work-frontend','#work-frontend'],
  ['sylclips-demo','#work-ai'],
  ['about','#about'],
  ['skills','#skills'],
  ['contact','#contact']
];
function updateChartLocation(y){
  let current='#top';
  for(const [id,href] of routeStops){
    const el=document.getElementById(id);
    if(el && y>=el.getBoundingClientRect().top+scrollY) current=href;
  }
  for(const chart of charts){
    const [x,py]=chartPositions[current];
    chart.style.setProperty('--traveler-x',`${x}%`);
    chart.style.setProperty('--traveler-y',`${py}%`);
    chart.querySelectorAll('a').forEach(link=>{
      const active=link.getAttribute('href')===current;
      link.classList.toggle('is-current',active);
      if(active)link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
    chart.querySelector('.constellation-origin small').textContent=current==='#top'?'YOU ARE HERE':'START';
  }
  if(chartDock){
    const show=scrollY>document.getElementById('top').offsetHeight-innerHeight*.3;
    chartDock.classList.toggle('is-visible',show);
    document.documentElement.classList.toggle('chart-docked',show);
    chartDock.inert=!show;
  }
}

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
  updateChartLocation(y);
}
window.addEventListener('scroll', sectionJourney, { passive: true });
window.addEventListener('resize', sectionJourney);
window.addEventListener('pointermove', event => {
  pointer.tx = event.clientX / innerWidth * 2 - 1;
  pointer.ty = event.clientY / innerHeight * 2 - 1;
  pointer.targetActive = 1;
}, { passive: true });
window.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; pointer.targetActive=0; });
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
  document.documentElement.dataset.scene = 'fallback';
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
  let contextLost = false;
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    contextLost = true;
    document.documentElement.classList.remove('webgl-ready');
    fallback();
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    rendered = false;
    resize();
  });
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
  // Stellar light ranges from cool blue-white to warm amber/red; the richer
  // cyan and violet tones belong to the distant gas, not every foreground star.
  const palette = [[.87,.92,1],[.57,.76,1],[.76,.86,1],[1,.98,.87],[1,.82,.61],[1,.65,.56]];
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
    starSizes.push(bright > .994 ? rand(4.3,6.8) : bright > .93 ? rand(2.3,4) : rand(1.1,2.5));
  }
  points(stars,starColors,starSizes,1);
  const beaconPositions=[],beaconColors=[],beaconSizes=[];
  for(let i=0;i<(mobile.matches?420:980);i++){
    const z=rand(-360,-8),x=rand(-64,64),y=rand(-40,40);
    if([[9,-1,-33],[8,1,-92],[-8,-2,-151],[-8,0,-212],[-8,0,-270],[9,-2,-330]].some(([px,py,pz])=>z>pz&&z<pz+48&&Math.abs(x-px)<14&&Math.abs(y-py)<14)){i--;continue;}
    beaconPositions.push(x,y,z);
    const tint=palette[Math.floor(Math.random()*palette.length)];
    beaconColors.push(tint[0],tint[1],tint[2]);
    beaconSizes.push(rand(5,12));
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
  // Detailed transparent artwork is decoded asynchronously. Avoid generating
  // several large procedural textures on the main thread before the first frame.
  const nebulaLoader=new THREE.TextureLoader();
  const paintedClouds=['nebula-cyan.png','nebula-magenta.png'].map(path=>{
    const map=nebulaLoader.load(`./${path}`);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return map;
  });
  function detailedCloud(x,y,z,w,textureIndex,opacity,rotation=0){
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:paintedClouds[textureIndex],transparent:true,opacity,depthWrite:false,blending:THREE.NormalBlending,rotation}));
    sprite.position.set(x,y,z);sprite.scale.set(w,w*.41,1);scene.add(sprite);floaters.push(sprite);
  }
  detailedCloud(-12,-1,-47,67,0,.5,-.15);
  detailedCloud(21,9,-108,57,1,.38,.23);
  detailedCloud(-15,0,-111,69,1,.45,-.13);
  detailedCloud(17,-6,-169,64,0,.45,.14);
  detailedCloud(18,6,-231,73,0,.46,-.16);
  detailedCloud(-17,-5,-289,65,1,.44,.19);
  detailedCloud(10,3,-296,72,1,.46,-.12);
  detailedCloud(-12,2,-304,70,0,.43,.17);
  detailedCloud(14,-5,-348,74,0,.45,-.11);
  nebula(7,3,-35,34,0x586bea,.12);
  nebula(-10,-5,-151,34,0x9862f5,.12);
  nebula(9,4,-294,39,0x34b6d5,.12);
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
  // Saturn is visibly oblate. Its rings and the narrow shadow they cast make
  // the sphere read as a physical planet rather than a perfectly round prop.
  world3.sphere.scale.y=.905;
  world3.halo.scale.y=.91;
  const world4=planet(5.7,0xe67a54,-8,0,-212,null);
  const world5=planet(6.3,0x537bc4,-8,0,-270,null);
  const world6=planet(6.8,0x80c8db,9,-2,-330,null);
  world5.sphere.rotation.y=Math.PI;
  const voyagerPhoto=loader.load('./neptune-voyager-nasa.png');
  voyagerPhoto.colorSpace=THREE.SRGBColorSpace;
  // Voyager 2 photographed one hemisphere. Project that actual observation
  // over the front of the 3D globe and retain the globe texture at the limb.
  const neptunePhoto=new THREE.Mesh(new THREE.SphereGeometry(6.315,128,96),new THREE.ShaderMaterial({
    uniforms:{uPhoto:{value:voyagerPhoto}},
    vertexShader:`varying vec3 vNormal;void main(){vNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`uniform sampler2D uPhoto;varying vec3 vNormal;void main(){vec3 n=normalize(vNormal);vec2 uv=vec2(.5+n.x*.41,.5+n.y*.41);vec3 photo=texture2D(uPhoto,uv).rgb*vec3(.74,.82,.9);float front=smoothstep(.03,.27,n.z);float rim=smoothstep(.0,.14,1.-length(n.xy));float valid=smoothstep(.035,.10,max(max(photo.r,photo.g),photo.b));gl_FragColor=vec4(photo,front*rim*valid*.9);}`,
    transparent:true,depthWrite:false,toneMapped:false
  }));
  world5.group.add(neptunePhoto);
  [earth,world2,world3,world4,world5,world6].forEach((world,i)=>world.halo.material.uniforms.uColor.value.set([0x62b8e6,0xdba480,0xcdb680,0xcf8267,0x628fd5,0x85dbe4][i]));
  const futureWorlds=[world2,world3,world4,world5,world6];
  const planetMaps=[
    {world:earth,desktop:'8k_earth_daymap.jpg',mobile:'earth-2k.jpg'},
    {world:world2,desktop:'8k_jupiter.jpg',mobile:'jupiter-2k.jpg'},
    {world:world3,desktop:'8k_saturn.jpg',mobile:'saturn-2k.jpg'},
    {world:world4,desktop:'mars-8k-source.jpg',mobile:'mars-2k.jpg'},
    {world:world5,desktop:'neptune-detailed-4k.jpg',mobile:'2k_neptune.jpg'},
    {world:world6,desktop:'uranus-detailed-4k.jpg',mobile:'2k_uranus.jpg'}
  ];
  function applyPlanetMap(entry,i){
    const map=entry.high || entry.low;
    if(!map || entry.world.sphere.material.map===map)return;
    const material=entry.world.sphere.material;
    material.map=map;
    material.color.set(i===3?0xc8beb5:0xffffff);
    material.needsUpdate=true;
  }
  // Small maps give every planet a detailed base before it enters view.
  // Desktop maps replace the base quietly ahead of the camera, preserving
  // a continuous journey while avoiding six 8K GPU allocations at startup.
  planetMaps.forEach((entry,i)=>{
    loader.load(`./${entry.mobile}`,map=>{
      map.colorSpace=THREE.SRGBColorSpace;
      map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      entry.low=map;
      applyPlanetMap(entry,i);
    },undefined,()=>{document.documentElement.dataset.planetTexture='unavailable';});
  });
  function syncPlanetMaps(){
    if(mobile.matches)return;
    const focus=clamp(Math.floor(targetJourney+.42),0,5);
    planetMaps.forEach((entry,i)=>{
      const keep=Math.abs(i-focus)<=1 && i<=targetJourney+.55 && i>=targetJourney-.9;
      if(keep&&!entry.high&&!entry.loading&&!entry.failed){
        entry.loading=true;
        const path=entry.desktop;
        loader.load(`./${path}`,map=>{
          entry.loading=false;
          map.colorSpace=THREE.SRGBColorSpace;
          map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
          if(i>targetJourney+.55 || i<targetJourney-.9){map.dispose();return;}
          entry.high=map;
          applyPlanetMap(entry,i);
        },undefined,()=>{entry.loading=false;entry.failed=true;document.documentElement.dataset.planetTexture='unavailable';});
      }else if(!keep&&entry.high){
        entry.high.dispose();entry.high=null;
        entry.world.sphere.material.map=entry.low||null;
        entry.world.sphere.material.needsUpdate=true;
      }
    });
  }
  syncPlanetMaps();
  const positionWorlds=()=>{
    earth.group.position.x=mobile.matches?4.4:9.2;
    world2.group.position.x=mobile.matches?4.4:8;
    world3.group.position.x=mobile.matches?-4.4:-8;
    world4.group.position.x=mobile.matches?-4.4:-8;
    world5.group.position.x=mobile.matches?-4.4:-8;
    world6.group.position.x=mobile.matches?6.5:11.5;
  };
  positionWorlds();
  function rings(world, inner, outer) {
    const geometry=new THREE.RingGeometry(inner,outer,256,4);
    const ringMap=loader.load('./saturn-ring-alpha.png');
    ringMap.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.ShaderMaterial({
      uniforms:{uInner:{value:inner},uOuter:{value:outer},uRing:{value:ringMap}},
      vertexShader:`varying vec2 vLocal;void main(){vLocal=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec2 vLocal;uniform float uInner;uniform float uOuter;uniform sampler2D uRing;void main(){float t=clamp((length(vLocal)-uInner)/(uOuter-uInner),0.,1.);vec4 sampleRing=texture2D(uRing,vec2(t,.5));float edge=smoothstep(0.,.025,t)*(1.-smoothstep(.975,1.,t));vec3 col=mix(sampleRing.rgb,vec3(.93,.78,.59),.22);gl_FragColor=vec4(col*1.4,sampleRing.a*edge*.89);}`,
      side:THREE.DoubleSide,transparent:true,depthWrite:false
    });
    const mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=-.47;mesh.rotation.y=.24;world.group.add(mesh);
  }
  rings(world3,7.5,12.5);
  const saturnShadow=new THREE.Mesh(new THREE.SphereGeometry(6.312,128,96),new THREE.ShaderMaterial({
    vertexShader:`varying vec3 vLocal;void main(){vLocal=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 vLocal;void main(){float band=exp(-pow((vLocal.y-1.1)/.31,2.));float face=smoothstep(-1.,1.6,vLocal.z);gl_FragColor=vec4(.055,.043,.045,band*face*.17);}`,
    transparent:true,depthWrite:false
  }));
  saturnShadow.scale.y=.905;
  world3.group.add(saturnShadow);

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
  // Far clusters sit behind the travel path, so each chapter has a distinct
  // blue, violet or warm region without hiding the foreground planets.
  galaxy(-29,13,-75,mobile.matches?2100:4200,22,[.27,.68,1]);
  galaxy(26,-12,-141,mobile.matches?2200:4500,21,[.83,.36,.42]);
  galaxy(-27,13,-201,mobile.matches?2100:4200,22,[.38,.72,1]);
  galaxy(28,12,-268,mobile.matches?2200:4400,21,[.78,.46,.96]);
  galaxy(-27,-11,-341,mobile.matches?2100:4200,22,[.26,.74,.96]);
  nebula(-29,13,-72,47,0x195b9b,.35);
  nebula(26,-12,-139,46,0xa33052,.29);
  nebula(-27,13,-198,49,0x286bb4,.31);
  nebula(28,12,-264,46,0x7543a5,.3);
  nebula(-27,-11,-338,48,0x1d7994,.31);

  const resize=()=>{camera.aspect=innerWidth/innerHeight;camera.fov=mobile.matches?68:58;camera.updateProjectionMatrix();positionWorlds();const ratio=renderRatio();renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight);pointFields.forEach(field=>{field.material.uniforms.uPixelRatio.value=ratio;});};
  window.addEventListener('resize',resize);
  let last=performance.now();
  let rendered=false;
  setTimeout(()=>{if(!rendered)fallback();},4500);
  const backdropColors=[0x031023,0x071b2d,0x201020,0x0b1f37,0x190f2a,0x072431].map(c=>new THREE.Color(c));
  function tick(now){
    // The first animation timestamp can precede performance.now() sampled
    // during setup. A negative delta would move deep links backward past 0.
    const dt=clamp((now-last)/1000,0,.05);last=now;
    pointer.x=smooth(pointer.x,pointer.tx,dt*4.5);pointer.y=smooth(pointer.y,pointer.ty,dt*4.5);
    pointer.activity=smooth(pointer.activity,pointer.targetActive,dt*2.6);
    journey=motion?smooth(journey,targetJourney,dt*2.1):targetJourney;
    if(chartDock){
      chartDock.style.setProperty('--drift-x',`${motion?(Math.sin(journey*1.25)*9+pointer.x*2).toFixed(1):0}px`);
      chartDock.style.setProperty('--drift-y',`${motion?(Math.cos(journey*1.1)*5+pointer.y*2).toFixed(1):0}px`);
    }
    syncPlanetMaps();
    if(!Number.isFinite(journey)){
      document.documentElement.dataset.sceneDiagnostic=JSON.stringify({targetJourney,now,last});
      journey=Number.isFinite(targetJourney)?clamp(targetJourney,0,5):0;
    }
    const chapter=clamp(Math.floor(journey),0,4),blend=clamp(journey-chapter,0,1);
    scene.background.copy(backdropColors[chapter]).lerp(backdropColors[chapter+1],blend);
    const t=now*.001;
    if(motion)pointFields.forEach(field=>{field.material.uniforms.uTime.value=t;});
    const offset=mobile.matches?.42:1;
    const mouseX=motion?pointer.x:0,mouseY=motion?pointer.y:0;
    camera.position.x=smooth(camera.position.x,(Math.sin(journey*1.5)*1.7+mouseX*3.8)*offset,dt*3.2);
    camera.position.y=smooth(camera.position.y,(Math.cos(journey*1.2)*.8-mouseY*2.3)*offset,dt*3.2);
    const mouseApproach=motion?pointer.activity*1.35*offset:0;
    camera.position.z=smooth(camera.position.z,1-journey*59-mouseApproach,dt*2.1);
    const baseFov=mobile.matches?68:58;
    const zoomFov=baseFov-(motion&&!mobile.matches?pointer.activity*3.6:0);
    const nextFov=smooth(camera.fov,zoomFov,dt*3.1);
    if(Math.abs(nextFov-camera.fov)>.002){camera.fov=nextFov;camera.updateProjectionMatrix();}
    // Off-axis projection keeps the spot beneath the pointer stationary as
    // the field of view tightens; camera tracking above remains unchanged.
    const magnification=Math.tan(THREE.MathUtils.degToRad(baseFov*.5))/Math.tan(THREE.MathUtils.degToRad(camera.fov*.5));
    camera.projectionMatrix.elements[8]=(magnification-1)*mouseX;
    camera.projectionMatrix.elements[9]=(magnification-1)*-mouseY;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.lookAt(camera.position.x*.36+mouseX*.8,camera.position.y*.2-mouseY*.55,camera.position.z-50);
    neptunePhoto.quaternion.copy(camera.quaternion);
    camera.rotation.z=motion?Math.sin(journey*1.12)*.025+mouseX*.012:0;
    if(motion){
      earth.sphere.rotation.y+=dt*.034;cloudShell.rotation.y+=dt*.041;world2.sphere.rotation.y+=dt*.038;world3.sphere.rotation.y+=dt*.028;world4.sphere.rotation.y+=dt*.033;world5.sphere.rotation.y+=dt*.027;world6.sphere.rotation.y+=dt*.034;
      floaters.forEach((object,i)=>{if(object.isSprite)object.material.rotation=Math.sin(t*.04+i)*.06;else object.rotation.z=Math.sin(t*.17+i)*.013;});
      if(heroCopy) heroCopy.style.setProperty('--copy-x',`${(-pointer.x*7).toFixed(1)}px`);
    }
    futureWorlds.forEach((world,i)=>{
      const arrival=clamp((journey-(i+.1))/.7,0,1);
      world.group.scale.setScalar(arrival*arrival*(3-2*arrival)*(i===4?.52:1));
    });
    if(!contextLost){
      try{
        renderer.render(scene,camera);
        if(!rendered){rendered=true;document.documentElement.classList.add('webgl-ready');document.documentElement.classList.remove('no-webgl');document.documentElement.dataset.scene='webgl';}
      }catch{
        contextLost=true;
        fallback();
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  document.documentElement.dataset.scene='webgl';
}
