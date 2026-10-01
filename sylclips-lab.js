const $ = id => document.getElementById(id);
const API_BASE = document.querySelector('meta[name="demo-api-base"]')?.content?.trim().replace(/\/$/, '') || '';
const STORAGE_KEY = 'sylclips-public-demo-reviews-v1';
const labelFor = {separate:'Separate',merge:'Merge',review:'Needs review'};
const state = {jobs:[],job:null,candidate:null,decisions:{},tab:'review',plan:null,apiConnected:false};
let planRequest=0;

function formatTime(seconds,decimals=1){
  const m=Math.floor(seconds/60).toString().padStart(2,'0');
  const s=(seconds%60).toFixed(decimals).padStart(decimals?4:2,'0');
  return `${m}:${s}`;
}

function readDecisions(){
  try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');return value&&typeof value==='object'?value:{}}
  catch{return {}}
}
function saveDecisions(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state.decisions))}catch{}}
function decisionFor(candidate){return state.decisions[candidate.id] || candidate.reference}
function reviewed(candidate){return Object.hasOwn(state.decisions,candidate.id)}

async function loadJobs(){
  if(API_BASE){
    try{
      const response=await fetch(`${API_BASE}/api/v1/jobs`,{headers:{Accept:'application/json'}});
      if(!response.ok)throw new Error(`API returned ${response.status}`);
      const data=await response.json();
      if(!Array.isArray(data.jobs)||!data.jobs.length)throw new Error('No sample jobs');
      state.apiConnected=true;return data.jobs;
    }catch{state.apiConnected=false}
  }
  const response=await fetch('./demo-data.json',{cache:'no-store'});
  if(!response.ok)throw new Error('The sample dataset could not be loaded');
  const data=await response.json();
  if(!Array.isArray(data.jobs)||!data.jobs.length)throw new Error('The sample dataset is empty');
  return data.jobs;
}

function renderJobList(){
  const target=$('job-list');target.replaceChildren();
  for(const job of state.jobs){
    const button=document.createElement('button');button.type='button';button.className='job-button';
    button.setAttribute('aria-pressed',String(job.id===state.job.id));
    const symbol=document.createElement('span');symbol.className='job-symbol';symbol.setAttribute('aria-hidden','true');
    const text=document.createElement('span');const title=document.createElement('strong');title.textContent=job.title;
    const sub=document.createElement('small');sub.textContent=job.type;text.append(title,sub);button.append(symbol,text);
    button.addEventListener('click',()=>selectJob(job.id));target.append(button);
  }
}

function renderTimeline(){
  const track=$('timeline-track');track.querySelectorAll('button').forEach(node=>node.remove());
  const job=state.job;
  for(const [index,candidate] of job.candidates.entries()){
    const marker=document.createElement('button');marker.type='button';marker.className='timeline-marker';
    marker.style.left=`${candidate.time/job.duration*100}%`;
    marker.title=`${formatTime(candidate.time)} · ${candidate.title}`;
    marker.setAttribute('aria-label',`Candidate ${index+1}, ${formatTime(candidate.time)}, ${candidate.title}`);
    marker.setAttribute('aria-current',String(candidate.id===state.candidate.id));
    marker.addEventListener('click',()=>selectCandidate(candidate.id));track.append(marker);
  }
  $('timeline-fill').style.width=`${state.candidate.time/job.duration*100}%`;
  $('timeline-mid').textContent=formatTime(job.duration/2,0);
  $('timeline-end').textContent=formatTime(job.duration,0);
}

function renderCandidateList(){
  const target=$('candidate-list');target.replaceChildren();
  const count=state.job.candidates.filter(reviewed).length;
  $('review-progress').textContent=`${count} of ${state.job.candidates.length} reviewed`;
  for(const [index,candidate] of state.job.candidates.entries()){
    const button=document.createElement('button');button.type='button';button.className='candidate-button';
    button.setAttribute('aria-pressed',String(candidate.id===state.candidate.id));
    const left=document.createElement('span');const title=document.createElement('strong');title.textContent=`${String(index+1).padStart(2,'0')} · ${candidate.title}`;
    const time=document.createElement('small');time.textContent=formatTime(candidate.time);left.append(title,time);
    const badge=document.createElement('span');badge.className=`candidate-state${reviewed(candidate)?' is-reviewed':''}`;
    badge.textContent=reviewed(candidate)?labelFor[state.decisions[candidate.id]]:'Sample';
    button.append(left,badge);button.addEventListener('click',()=>selectCandidate(candidate.id));target.append(button);
  }
}

function renderDecision(){
  const job=state.job,candidate=state.candidate;
  const index=job.candidates.indexOf(candidate);
  $('candidate-kicker').textContent=`CANDIDATE ${String(index+1).padStart(2,'0')} / ${formatTime(candidate.time)}`;
  $('decision-title').textContent=candidate.title;
  $('candidate-rationale').textContent=candidate.rationale;
  let comparison=$('frame-comparison');
  if(!comparison){
    comparison=document.createElement('div');comparison.id='frame-comparison';comparison.className='frame-comparison';
    comparison.setAttribute('aria-label','Generated visual comparison for the fictional boundary');
    for(const side of ['before','after']){
      const frame=document.createElement('div');frame.className='frame-sample';frame.dataset.side=side;
      const chip=document.createElement('span');chip.className='frame-chip';chip.textContent=`GENERATED ${side.toUpperCase()} FRAME`;
      const caption=document.createElement('strong');caption.className='frame-caption';
      frame.append(chip,caption);comparison.append(frame);
    }
    $('candidate-rationale').after(comparison);
  }
  comparison.dataset.scene=job.id;
  comparison.querySelector('[data-side="before"] .frame-caption').textContent=candidate.frames?.[0]||'Before';
  comparison.querySelector('[data-side="after"] .frame-caption').textContent=candidate.frames?.[1]||'After';
  $('reference-value').textContent=labelFor[candidate.reference];
  $('score-value').textContent=candidate.sampleScore.toFixed(2);
  const evidence=$('evidence-list');evidence.replaceChildren();
  for(const line of candidate.evidence){const item=document.createElement('li');item.textContent=line;evidence.append(item)}
  for(const button of document.querySelectorAll('[data-decision]')){
    button.setAttribute('aria-pressed',String(state.decisions[candidate.id]===button.dataset.decision));
  }
  $('decision-feedback').textContent=reviewed(candidate)
    ?`Your decision: ${labelFor[state.decisions[candidate.id]]}. The plan reflects it.`
    :'Choose a decision. The plan will update immediately.';
  $('preview-timestamp').textContent=formatTime(candidate.time);
  renderTimeline();
}

function buildPlan(){
  const job=state.job;
  const cuts=job.candidates.filter(candidate=>decisionFor(candidate)==='separate').sort((a,b)=>a.time-b.time);
  const edges=[0,...cuts.map(candidate=>candidate.time),job.duration];
  const segments=edges.slice(0,-1).map((start,index)=>({
    order:index+1,
    startSeconds:Number(start.toFixed(1)),
    endSeconds:Number(edges[index+1].toFixed(1)),
    label:`Clip ${String(index+1).padStart(2,'0')}`,
    reviewStatus:index===0?'start of sample':reviewed(cuts[index-1])?'human reviewed':'illustrative reference'
  }));
  return {
    demo:true,
    dataSource:'fictional sample',
    jobId:job.id,
    durationSeconds:job.duration,
    reviewedCandidates:job.candidates.filter(reviewed).length,
    pendingReview:job.candidates.filter(candidate=>decisionFor(candidate)==='review').map(candidate=>candidate.id),
    segments
  };
}

function renderPlan(plan=buildPlan()){
  state.plan=plan;
  $('plan-count').textContent=String(plan.segments.length);
  $('plan-json').textContent=JSON.stringify(plan,null,2);
  const cards=$('plan-cards');cards.replaceChildren();
  for(const segment of plan.segments){
    const card=document.createElement('div');card.className='plan-card';
    const index=document.createElement('span');index.textContent=`SEGMENT ${String(segment.order).padStart(2,'0')}`;
    const title=document.createElement('strong');title.textContent=`${formatTime(segment.startSeconds)} → ${formatTime(segment.endSeconds)}`;
    const status=document.createElement('small');status.textContent=segment.reviewStatus;
    card.append(index,title,status);cards.append(card);
  }
  if(plan.pendingReview.length){
    const notice=document.createElement('p');notice.className='empty-plan';notice.textContent=`${plan.pendingReview.length} boundary ${plan.pendingReview.length===1?'remains':'remain'} in the review queue.`;cards.append(notice);
  }
  if(arguments.length===0 && state.apiConnected)syncRemotePlan();
}

async function syncRemotePlan(){
  const sequence=++planRequest;
  const jobId=state.job.id;
  const ids=new Set(state.job.candidates.map(candidate=>candidate.id));
  const decisions=Object.fromEntries(Object.entries(state.decisions).filter(([id])=>ids.has(id)));
  try{
    const response=await fetch(`${API_BASE}/api/v1/plan`,{
      method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({jobId,decisions})
    });
    if(!response.ok)throw new Error(`Plan API returned ${response.status}`);
    const plan=await response.json();
    if(sequence===planRequest && state.job.id===jobId)renderPlan(plan);
  }catch{
    if(sequence===planRequest){state.apiConnected=false;document.querySelector('.console-status').lastChild.textContent=' Local demo · ready'}
  }
}

function renderTrace(){
  const steps=[
    ['list_jobs',`Locate a fictional sample job. Selected: ${state.job.id}.`],
    ['get_boundary_summary',`Read ${state.job.candidates.length} candidate boundaries and their illustrative signals.`],
    ['preview_job',`Open a generated preview near ${formatTime(state.candidate.time)}; no real footage is accessed.`],
    ['compose_answer',`Report ${state.job.candidates.filter(reviewed).length} human decisions and point to the structured plan.`]
  ];
  const list=$('trace-list');list.replaceChildren();
  for(const [index,[name,description]] of steps.entries()){
    const item=document.createElement('li');const number=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');
    const body=document.createElement('div');const title=document.createElement('strong');title.textContent=name;
    const detail=document.createElement('p');detail.textContent=description;body.append(title,detail);item.append(number,body);list.append(item);
  }
}

function selectJob(id){
  const job=state.jobs.find(value=>value.id===id);if(!job)return;
  state.job=job;state.candidate=job.candidates[0];
  $('job-title').textContent=job.title;$('job-summary').textContent=job.summary;
  $('job-duration').textContent=formatTime(job.duration,0);
  $('job-count').textContent=String(job.candidates.length);
  $('preview-label').textContent=job.title;$('preview').dataset.accent=job.accent;
  renderJobList();renderCandidateList();renderDecision();renderPlan();renderTrace();
}

function selectCandidate(id){
  const candidate=state.job.candidates.find(value=>value.id===id);if(!candidate)return;
  state.candidate=candidate;renderCandidateList();renderDecision();renderTrace();
}

function setTab(tab){
  if(!['review','plan','trace'].includes(tab))return;
  state.tab=tab;
  for(const button of document.querySelectorAll('[data-tab]')){
    const active=button.dataset.tab===tab;button.setAttribute('aria-selected',String(active));
    $(button.getAttribute('aria-controls')).hidden=!active;
  }
}

document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>setTab(button.dataset.tab)));
document.querySelectorAll('[data-decision]').forEach(button=>button.addEventListener('click',()=>{
  if(!state.candidate)return;
  state.decisions[state.candidate.id]=button.dataset.decision;saveDecisions();
  renderCandidateList();renderDecision();renderPlan();renderTrace();
}));
$('reset-review').addEventListener('click',()=>{
  state.decisions={};saveDecisions();
  renderCandidateList();renderDecision();renderPlan();renderTrace();
});
$('copy-plan').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(JSON.stringify(state.plan,null,2));$('copy-plan').textContent='Copied ✓'}
  catch{$('copy-plan').textContent='Select JSON to copy'}
  setTimeout(()=>$('copy-plan').textContent='Copy JSON ↗',2200);
});

async function init(){
  try{
    state.decisions=readDecisions();state.jobs=await loadJobs();
    selectJob(state.jobs[0].id);
    document.querySelector('.console-status').lastChild.textContent=state.apiConnected?' Demo API · ready':' Sample job · ready';
  }catch(error){
    $('job-list').textContent='Sample data unavailable.';
    $('candidate-list').textContent='Please reload the page to try again.';
    document.querySelector('.console-status').lastChild.textContent=' Demo unavailable';
  }
}
init();
