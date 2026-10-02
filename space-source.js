import * as THREE from 'three';

const mount = document.getElementById('space-scene');
const chapters = [...document.querySelectorAll('#top,#work,#sylclips-demo,#about,#skills,#contact-title')];
const mobile = matchMedia('(max-width: 760px)');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const renderRatio = () => Math.min(devicePixelRatio || 1, 2.15, Math.sqrt(8500000 / Math.max(1, innerWidth * innerHeight)));
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
  chartDock.classList.add('is-visible');
  chartDock.setAttribute('aria-label','Persistent portfolio navigation');
  chartDock.inert=false;
  document.body.appendChild(chartDock);
  document.documentElement.classList.add('chart-docked');
}
const charts=[heroChart,chartDock].filter(Boolean);
const chartPositions={
  '#top':[44,41], '#about':[20,8], '#work-fullstack':[10,65],
  '#work-ai':[71,18], '#work-frontend':[90,52],
  '#skills':[31,91], '#contact':[73,86]
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
}
function updateChartTravel(){
  if(!chartDock || innerWidth<=760)return;
  const dockWidth=Math.min(560,innerWidth-30);
  const dockHeight=225;
  const upper=83;
  const lower=Math.max(upper,innerHeight-dockHeight-22);
  // The chart follows the trip while staying away from the lower reading area.
  const waypoints=[.17,.1,.35,.02,.3,.08];
  const segment=clamp(Math.floor(targetJourney),0,4);
  const amount=clamp(targetJourney-segment,0,1);
  const eased=amount*amount*(3-2*amount);
  const level=lerp(waypoints[segment],waypoints[segment+1],eased);
  const left=innerWidth-dockWidth-18-Math.sin(targetJourney*1.35)*46;
  chartDock.style.setProperty('--dock-left',`${Math.round(left)}px`);
  chartDock.style.setProperty('--dock-top',`${Math.round(lerp(upper,lower,level))}px`);
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
  updateChartTravel();
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

// A destination is a continuous flight through the same 3D scene. Native
// smooth scrolling is very short for distant anchors and makes the scene jump.
let flightFrame=0;
let flightIntensity=0;
function stopFlight(){
  if(flightFrame) cancelAnimationFrame(flightFrame);
  flightFrame=0;
  flightIntensity=0;
  document.documentElement.classList.remove('is-flying');
}
function flyTo(target){
  stopFlight();
  const destination=clamp(target.getBoundingClientRect().top+scrollY-72,0,document.documentElement.scrollHeight-innerHeight);
  const origin=scrollY;
  const distance=destination-origin;
  if(Math.abs(distance)<2)return;
  const duration=clamp(1050+Math.abs(distance)*.28,1350,3900);
  const began=performance.now();
  document.documentElement.classList.add('is-flying');
  const frame=now=>{
    const t=clamp((now-began)/duration,0,1);
    const progress=t*t*t*(t*(t*6-15)+10);
    window.scrollTo(0,origin+distance*progress);
    flightIntensity=Math.sin(Math.PI*t);
    if(t<1)flightFrame=requestAnimationFrame(frame);
    else{flightIntensity=0;stopFlight();}
  };
  flightFrame=requestAnimationFrame(frame);
}
document.addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#"]');
  if(!link || link.classList.contains('skip-link') || event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
  const hash=link.getAttribute('href');
  const target=document.getElementById(hash.slice(1));
  if(!target)return;
  if(!motion)return;
  event.preventDefault();
  history.pushState(null,'',hash);
  flyTo(target);
});
window.addEventListener('wheel',stopFlight,{passive:true});
window.addEventListener('touchstart',stopFlight,{passive:true});
window.addEventListener('keydown',event=>{
  if(['PageDown','PageUp','Home','End','ArrowDown','ArrowUp',' '].includes(event.key))stopFlight();
});

const projectMap=document.querySelector('.project-constellation');
if(projectMap){
  const mapLines=projectMap.querySelector('.project-constellation-lines');
  const technologyLinks={
    typescript:['professional','sentinel','sylclips','nexo'], react:['professional','sentinel'],
    angular:['professional','nexo'], python:['professional','sylclips'],
    django:['professional'], java:['professional','nexo'], llms:['sylclips'],
    pytorch:['sylclips'], fastapi:['sylclips'], rest:['professional','kiosk','sylclips','nexo'],
    node:['professional','sylclips','sap'], sap:['sap'], sql:['professional','nexo']
  };
  const techButtons=[...projectMap.querySelectorAll('[data-tech]')];
  const projectLinks=[...projectMap.querySelectorAll('[data-project]')];
  const status=projectMap.querySelector('.map-status');
  let selectedTech=null;
  let hoveredTech=null;
  let hoveredProject=null;
  const activeTech=()=>hoveredTech||selectedTech;
  const projectNames={professional:'Full-stack delivery',kiosk:'Self-service kiosk',sentinel:'Sentinel Desk',sylclips:'SylClips',sap:'Book Management',nexo:'NEXO Service Desk'};
  function paintConnections(){
    const active=activeTech();
    const projectTechs=hoveredProject?Object.keys(technologyLinks).filter(key=>technologyLinks[key].includes(hoveredProject)):[];
    projectMap.classList.toggle('has-selection',!!active||!!hoveredProject);
    techButtons.forEach(button=>{
      const key=button.dataset.tech;
      button.classList.toggle('is-lit',hoveredProject?projectTechs.includes(key):key===active);
      button.setAttribute('aria-pressed',String(key===selectedTech));
    });
    projectLinks.forEach(link=>link.classList.toggle('is-lit',hoveredProject?link.dataset.project===hoveredProject:!!active&&technologyLinks[active].includes(link.dataset.project)));
    mapLines.querySelectorAll('[data-project]').forEach(line=>line.classList.toggle('is-lit',!!hoveredProject&&line.dataset.project===hoveredProject));
    if(hoveredProject){
      const names=projectTechs.map(key=>techButtons.find(button=>button.dataset.tech===key)?.textContent.trim()).filter(Boolean);
      status.textContent=`${projectNames[hoveredProject]}: ${names.join(', ')}.`;
    }else if(active){
      const label=techButtons.find(button=>button.dataset.tech===active)?.textContent.trim();
      const names=technologyLinks[active].map(key=>projectNames[key]);
      const places=names.length>1?`${names.slice(0,-1).join(', ')} and ${names.at(-1)}`:names[0];
      status.textContent=`Used in ${places}: ${label}.`;
    }else status.textContent='Hover a project to see its technologies, or choose a technology to find related work.';
  }
  function drawConnections(){
    const bounds=projectMap.getBoundingClientRect();
    if(!bounds.width||!bounds.height)return;
    mapLines.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);
    mapLines.replaceChildren();
    const point=element=>{
      const rect=element.getBoundingClientRect();
      return [rect.left+rect.width/2-bounds.left,rect.top+rect.height/2-bounds.top];
    };
    const makeLine=(a,b,key,project)=>{
      const [x1,y1]=point(a),[x2,y2]=point(b);
      const line=document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1',x1);line.setAttribute('y1',y1);
      line.setAttribute('x2',x2);line.setAttribute('y2',y2);
      line.dataset.connection=key;
      line.dataset.project=project;
      mapLines.appendChild(line);
    };
    techButtons.forEach(button=>{
      const key=button.dataset.tech;
      const matches=technologyLinks[key].map(project=>projectLinks.find(link=>link.dataset.project===project));
      matches.forEach(link=>makeLine(button,link,key,link.dataset.project));
    });
    paintConnections();
  }
  techButtons.forEach(button=>{
    button.addEventListener('pointerenter',()=>{hoveredTech=button.dataset.tech;paintConnections();});
    button.addEventListener('pointerleave',()=>{hoveredTech=null;paintConnections();});
    button.addEventListener('focus',()=>{hoveredTech=button.dataset.tech;paintConnections();});
    button.addEventListener('blur',()=>{hoveredTech=null;paintConnections();});
    button.addEventListener('click',()=>{
      selectedTech=selectedTech===button.dataset.tech?null:button.dataset.tech;
      hoveredTech=null;
      paintConnections();
    });
  });
  projectLinks.forEach(link=>{
    link.addEventListener('pointerenter',()=>{hoveredProject=link.dataset.project;paintConnections();});
    link.addEventListener('pointerleave',()=>{hoveredProject=null;paintConnections();});
    link.addEventListener('focus',()=>{hoveredProject=link.dataset.project;paintConnections();});
    link.addEventListener('blur',()=>{hoveredProject=null;paintConnections();});
  });
  new ResizeObserver(drawConnections).observe(projectMap);
  drawConnections();
}
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
      fragmentShader: `varying vec3 vColor; varying float vPhase; varying float vSize; uniform float uOpacity;uniform float uTime; void main(){vec2 p=gl_PointCoord-vec2(.5);float d=length(p);float halo=exp(-d*d*17.);float core=exp(-d*d*220.);float cross=exp(-abs(p.x)*68.)*exp(-abs(p.y)*5.5)+exp(-abs(p.y)*68.)*exp(-abs(p.x)*5.5);float sparkle=smoothstep(10.5,14.,vSize)*cross*1.25;float pulse=.9+.1*sin(uTime*(.8+vPhase*.12)+vPhase);float a=(halo*.55+core*.9+sparkle)*uOpacity*pulse;vec3 color=mix(vColor,vec3(1.),core*.13);gl_FragColor=vec4(color*1.28,a);}`,
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
  const palette = [[.91,.94,1],[.91,.94,1],[.49,.72,1],[.69,.83,1],[1,.97,.81],[1,.73,.49],[1,.52,.43]];
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
    const light = rand(.78,1.12);
    starColors.push(color[0]*light,color[1]*light,color[2]*light);
    const bright = Math.random();
    starSizes.push(bright > .997 ? rand(5.2,8.4) : bright > .93 ? rand(2.4,4.5) : rand(1.1,2.5));
  }
  points(stars,starColors,starSizes,1);
  const beaconPositions=[],beaconColors=[],beaconSizes=[];
  for(let i=0;i<(mobile.matches?420:980);i++){
    const z=rand(-360,-8),x=rand(-64,64),y=rand(-40,40);
    if([[9,-1,-33],[8,1,-92],[-8,-2,-151],[-8,0,-212],[-8,0,-270],[9,-2,-330]].some(([px,py,pz])=>z>pz&&z<pz+48&&Math.abs(x-px)<14&&Math.abs(y-py)<14)){i--;continue;}
    beaconPositions.push(x,y,z);
    const tint=palette[Math.floor(Math.random()*palette.length)];
    beaconColors.push(tint[0],tint[1],tint[2]);
    const magnitude=Math.random();
    beaconSizes.push(magnitude>.93?rand(13,20):magnitude>.68?rand(7,12):rand(4.5,7));
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

  // Small, low-contrast particles add a nearby dust layer without turning the
  // foreground into another starfield. Each chapter has open space for text.
  const dustPositions=[];
  for(let i=0;i<(mobile.matches?900:2100);i++){
    const z=rand(-365,-12),x=rand(-35,35),y=rand(-22,22);
    if(Math.abs(x)<8&&Math.abs(y)<5)continue;
    dustPositions.push(x,y,z);
  }
  const dustGeometry=new THREE.BufferGeometry();
  dustGeometry.setAttribute('position',new THREE.Float32BufferAttribute(dustPositions,3));
  const dust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:0xb7b7ad,size:.09,transparent:true,opacity:.28,depthWrite:false,sizeAttenuation:true}));
  dust.frustumCulled=false;
  scene.add(dust);

  // A few rough, unlit-looking fragments sit near the edge of the route.
  // They are small enough to establish scale without competing with planets.
  const rockGeometry=new THREE.IcosahedronGeometry(1,2);
  const rockPosition=rockGeometry.attributes.position;
  for(let i=0;i<rockPosition.count;i++){
    const v=new THREE.Vector3().fromBufferAttribute(rockPosition,i);
    const contour=.86+.12*Math.sin(v.x*18+v.y*11)+.08*Math.sin(v.z*23-v.x*9);
    v.multiplyScalar(contour);
    rockPosition.setXYZ(i,v.x,v.y,v.z);
  }
  rockGeometry.computeVertexNormals();
  const rockMaterial=new THREE.MeshStandardMaterial({color:0x57545a,roughness:1,metalness:0,flatShading:false});
  const rocks=[];
  for(let i=0;i<(mobile.matches?11:21);i++){
    const rock=new THREE.Mesh(rockGeometry,rockMaterial);
    const z=-17-i*16-rand(0,12);
    const side=i%2?-1:1;
    rock.position.set(side*rand(13,32),rand(-15,15),z);
    const scale=rand(.17,.57);
    rock.scale.set(scale,scale*rand(.7,1.15),scale*rand(.72,1.1));
    rock.rotation.set(rand(0,Math.PI),rand(0,Math.PI),rand(0,Math.PI));
    scene.add(rock);rocks.push(rock);
  }

  // The comet appears briefly in the distant sky, then stays absent for most
  // of its cycle. A soft tail and a tiny nucleus are sufficient at this scale.
  const tailCanvas=document.createElement('canvas');tailCanvas.width=256;tailCanvas.height=32;
  const tailContext=tailCanvas.getContext('2d');
  const tailGradient=tailContext.createLinearGradient(0,0,256,0);
  tailGradient.addColorStop(0,'rgba(230,246,255,.65)');
  tailGradient.addColorStop(.4,'rgba(173,220,238,.17)');
  tailGradient.addColorStop(1,'rgba(150,199,223,0)');
  tailContext.fillStyle=tailGradient;tailContext.fillRect(0,0,256,32);
  const tailMap=new THREE.CanvasTexture(tailCanvas);
  const comet=new THREE.Group();
  const cometTail=new THREE.Mesh(new THREE.PlaneGeometry(12,.38),new THREE.MeshBasicMaterial({map:tailMap,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
  cometTail.position.x=6;
  const cometCore=new THREE.Sprite(new THREE.SpriteMaterial({map:glowMap,color:0xd7edfa,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
  cometCore.scale.set(.95,.95,1);
  comet.add(cometTail,cometCore);comet.visible=false;scene.add(comet);

  const resize=()=>{camera.aspect=innerWidth/innerHeight;camera.fov=mobile.matches?68:58;camera.updateProjectionMatrix();positionWorlds();const ratio=renderRatio()*resolutionScale;renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight);pointFields.forEach(field=>{field.material.uniforms.uPixelRatio.value=ratio;});};
  window.addEventListener('resize',resize);
  let last=performance.now();
  let resolutionScale=1;
  let slowFrames=0;
  let stableFrames=0;
  const applyRenderResolution=()=>{
    const ratio=renderRatio()*resolutionScale;
    renderer.setPixelRatio(ratio);
    renderer.setSize(innerWidth,innerHeight);
    pointFields.forEach(field=>{field.material.uniforms.uPixelRatio.value=ratio;});
  };
  document.addEventListener('visibilitychange',()=>{last=performance.now();slowFrames=0;stableFrames=0;});
  let rendered=false;
  setTimeout(()=>{if(!rendered)fallback();},4500);
  const backdropColors=[0x031023,0x071b2d,0x201020,0x0b1f37,0x190f2a,0x072431].map(c=>new THREE.Color(c));
  function tick(now){
    // A 144/240 Hz display should not multiply WebGL work for the same journey.
    // The elapsed time below still controls motion, so travel speed stays stable.
    if(now-last<1000/72-1){requestAnimationFrame(tick);return;}
    // The first animation timestamp can precede performance.now() sampled
    // during setup. A negative delta would move deep links backward past 0.
    const frameTime=now-last;
    const dt=clamp(frameTime/1000,0,.05);last=now;
    if(frameTime>28){slowFrames++;stableFrames=0;}
    else if(frameTime<20){stableFrames++;slowFrames=0;}
    else{slowFrames=0;stableFrames=0;}
    if(slowFrames>=18&&resolutionScale>.65){resolutionScale=Math.max(.65,resolutionScale-.1);applyRenderResolution();slowFrames=0;}
    if(stableFrames>=180&&resolutionScale<1){resolutionScale=Math.min(1,resolutionScale+.05);applyRenderResolution();stableFrames=0;}
    pointer.x=smooth(pointer.x,pointer.tx,dt*4.5);pointer.y=smooth(pointer.y,pointer.ty,dt*4.5);
    pointer.activity=smooth(pointer.activity,pointer.targetActive,dt*2.6);
    journey=motion?smooth(journey,targetJourney,dt*(flightFrame?5.5:2.1)):targetJourney;
    if(chartDock){
      chartDock.style.setProperty('--drift-x',`${motion?(Math.sin(journey*1.25)*13+pointer.x*3).toFixed(1):0}px`);
      chartDock.style.setProperty('--drift-y',`${motion?(Math.cos(journey*1.1)*8+pointer.y*3).toFixed(1):0}px`);
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
    const mouseApproach=motion?pointer.activity*4.5*offset:0;
    camera.position.z=smooth(camera.position.z,1-journey*59-mouseApproach,dt*(flightFrame?5.5:2.1));
    const baseFov=mobile.matches?68:58;
    const zoomFov=baseFov-(motion&&!mobile.matches?pointer.activity*13:0)+flightIntensity*1.4;
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
      rocks.forEach((rock,i)=>{rock.rotation.x+=dt*(i%2?.025:-.02);rock.rotation.y+=dt*.018;});
      if(heroCopy) heroCopy.style.setProperty('--copy-x',`${(-pointer.x*7).toFixed(1)}px`);
    }
    const cometPhase=(t+30)%44;
    comet.visible=motion&&cometPhase<4.8;
    if(comet.visible){
      const progress=cometPhase/4.8;
      const fade=Math.min(1,progress*5,(1-progress)*5);
      comet.position.set(camera.position.x+22-progress*44,camera.position.y+12-progress*4,camera.position.z-78);
      comet.rotation.z=-.09;
      cometTail.material.opacity=fade*.46;
      cometCore.material.opacity=fade*.57;
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
