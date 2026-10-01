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
  renderer.toneMappingExposure = 1.38;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020610);
  const camera = new THREE.PerspectiveCamera(mobile.matches ? 68 : 58, innerWidth / innerHeight, .1, 700);
  camera.position.set(0, 0, 1);
  const ambient = new THREE.AmbientLight(0x8da9d5, 1.05);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xf5faff, 3.35);
  sun.position.set(14, 10, 20);
  scene.add(sun);
  const cool = new THREE.DirectionalLight(0x306fce, 1.5);
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
      vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aPhase; varying vec3 vColor; varying float vPhase; uniform float uPixelRatio; void main(){ vColor=aColor;vPhase=aPhase; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(aSize*uPixelRatio*105./max(1.,-mv.z),1.0,15.0); }`,
      fragmentShader: `varying vec3 vColor; varying float vPhase; uniform float uOpacity;uniform float uTime; void main(){ float d=length(gl_PointCoord-vec2(.5)); float halo=exp(-d*d*28.); float core=exp(-d*d*170.); float pulse=.75+.25*sin(uTime*1.8+vPhase); float a=(halo*.55+core*.65)*uOpacity*pulse; gl_FragColor=vec4(vColor*(1.+core*1.8),a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const field = new THREE.Points(geometry, material);
    field.frustumCulled = false;
    scene.add(field);
    pointFields.push(field);
    return field;
  }
  const stars = [], starColors = [], starSizes = [];
  const count = mobile.matches ? 17000 : 32000;
  const palette = [[.71,.83,1],[.43,.76,1],[1,.82,.72],[.82,.73,1],[.95,.98,1]];
  for (let i = 0; i < count; i++) {
    // A few close stars produce visible parallax; far stars make the field dense.
    const layer = Math.random();
    stars.push(rand(-100,100),rand(-61,61),rand(-340,25));
    const color = palette[Math.floor(Math.random()*palette.length)];
    const light = rand(.55,1.25);
    starColors.push(color[0]*light,color[1]*light,color[2]*light);
    starSizes.push(layer > .985 ? rand(2.8,5.8) : rand(.7,2.4));
  }
  points(stars,starColors,starSizes,.96);

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
  nebula(12,1,-42,55,0x1f5bcb,.22);
  nebula(11,-9,-94,48,0x763bca,.31); nebula(17,7,-101,30,0x16b4d5,.24);
  nebula(-10,-4,-153,51,0x523ab6,.27); nebula(-16,8,-165,28,0x2baad9,.2);
  nebula(12,4,-216,50,0x166cac,.23); nebula(-11,0,-272,58,0x5f49b5,.29);
  nebula(13,-3,-335,65,0x2783bc,.26);

  function planet(radius, color, x,y,z,texture) {
    const group=new THREE.Group();group.position.set(x,y,z);
    const material=new THREE.MeshStandardMaterial({ color, map:texture||null, roughness:.94, metalness:0 });
    const sphere=new THREE.Mesh(new THREE.SphereGeometry(radius,96,64),material);
    group.add(sphere);
    const halo=new THREE.Mesh(new THREE.SphereGeometry(radius*1.065,64,40),new THREE.ShaderMaterial({
      uniforms:{uColor:{value:new THREE.Color(color)}},
      vertexShader:`varying vec3 vNormal; varying vec3 vView; void main(){vec4 mv=modelViewMatrix*vec4(position,1.); vNormal=normalize(normalMatrix*normal); vView=normalize(-mv.xyz); gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`varying vec3 vNormal; varying vec3 vView; uniform vec3 uColor; void main(){float rim=pow(1.-max(dot(normalize(vNormal),normalize(vView)),0.),3.5);gl_FragColor=vec4(uColor*2.4,rim*.54);}`,
      transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.FrontSide
    }));group.add(halo);
    scene.add(group);floaters.push(group);return {group,sphere};
  }
  const earthTexture = new THREE.TextureLoader().load('./earth-texture-5k.jpg', () => { earthTexture.colorSpace=THREE.SRGBColorSpace; }, undefined, () => { document.documentElement.dataset.earthTexture='unavailable'; });
  earthTexture.colorSpace=THREE.SRGBColorSpace;
  const earth = planet(5.8,0xffffff,9.2,-1.2,-33,earthTexture);
  earth.sphere.rotation.y=2.1;
  // A high resolution generated gas surface gives the distant planets real curvature.
  function gasTexture() {
    const c=document.createElement('canvas');c.width=2048;c.height=1024;
    const ctx=c.getContext('2d');const data=ctx.createImageData(c.width,c.height);
    for(let y=0;y<c.height;y++) for(let x=0;x<c.width;x++) {
      const wave=Math.sin(y*.044+Math.sin(x*.008+y*.011)*2)*.5+.5;
      const band=Math.sin(y*.107+Math.sin(x*.006)*3)*.5+.5;
      const fine=Math.sin(y*.35+Math.sin(x*.018+y*.045)*2)*.5+.5;
      const n=wave*.47+band*.37+fine*.16;
      const p=(y*c.width+x)*4;
      data.data[p]=Math.round(43+n*120);data.data[p+1]=Math.round(70+n*105);data.data[p+2]=Math.round(121+n*106);data.data[p+3]=255;
    }
    ctx.putImageData(data,0,0);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
  }
  const gasMap=new THREE.TextureLoader().load('./jupiter-cassini.jpg');
  gasMap.colorSpace=THREE.SRGBColorSpace;
  const world2=planet(6.1,0xffffff,8,1,-92,gasMap);
  const world3=planet(6.3,0xb5c6ff,-8,-2,-151,gasMap);
  const world4=planet(5.7,0xaddaff,8,0,-212,gasMap);
  const world5=planet(6.3,0xc9d7ff,-8,0,-270,gasMap);
  const world6=planet(6.8,0xffffff,9,-2,-330,earthTexture);
  const futureWorlds=[world2,world3,world4,world5,world6];
  const positionWorlds=()=>{
    earth.group.position.x=mobile.matches?4.4:9.2;
    world2.group.position.x=mobile.matches?4.4:8;
    world3.group.position.x=mobile.matches?-4.4:-8;
    world4.group.position.x=mobile.matches?4.4:8;
    world5.group.position.x=mobile.matches?-4.4:-8;
    world6.group.position.x=mobile.matches?4.4:9;
  };
  positionWorlds();
  function rings(world, inner, outer) {
    const geometry=new THREE.RingGeometry(inner,outer,256,4);
    const material=new THREE.ShaderMaterial({
      uniforms:{uInner:{value:inner},uOuter:{value:outer}},
      vertexShader:`varying vec2 vLocal;void main(){vLocal=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec2 vLocal;uniform float uInner;uniform float uOuter;void main(){float r=length(vLocal);float t=(r-uInner)/(uOuter-uInner);float bands=sin(t*125.)*.14+sin(t*53.)*.17+sin(t*17.)*.12;float edge=smoothstep(0.,.06,t)*(1.-smoothstep(.9,1.,t));vec3 col=mix(vec3(.23,.35,.59),vec3(.57,.70,.83),clamp(t*.8+bands,0.,1.));gl_FragColor=vec4(col,edge*(.34+bands*.5));}`,
      side:THREE.DoubleSide,transparent:true,depthWrite:false
    });
    const mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=-.47;mesh.rotation.y=.24;world.group.add(mesh);
  }
  rings(world3,7.5,12.5);rings(world5,7.4,11.8);

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
  function tick(now){
    const dt=Math.min((now-last)/1000,.05);last=now;
    pointer.x=smooth(pointer.x,pointer.tx,dt*4.5);pointer.y=smooth(pointer.y,pointer.ty,dt*4.5);
    journey=motion?smooth(journey,targetJourney,dt*2.1):targetJourney;
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
      earth.sphere.rotation.y+=dt*.034;world2.sphere.rotation.y+=dt*.038;world3.sphere.rotation.y+=dt*.028;world4.sphere.rotation.y+=dt*.033;world5.sphere.rotation.y+=dt*.027;world6.sphere.rotation.y+=dt*.034;
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
