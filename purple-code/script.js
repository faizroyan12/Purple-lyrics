const code=document.getElementById('code'),kb=document.getElementById('kb'),ov=document.getElementById('start');
document.getElementById('cap').textContent=CAPTION;

function setMode(){
  const m=(typeof MODE!=='undefined'&&MODE!=='auto')?MODE:(innerWidth>innerHeight?'landscape':'portrait');
  document.body.classList.toggle('landscape',m==='landscape');
}
setMode();addEventListener('resize',setMode);

// keyboard
const keys={};
['qwertyuiop','asdfghjkl','zxcvbnm'].forEach(r=>{
  const d=document.createElement('div');d.className='row';
  for(const c of r){const k=document.createElement('div');k.className='k';d.appendChild(k);keys[c]=k}
  kb.appendChild(d);
});
const sd=document.createElement('div');sd.className='row';
const sp=document.createElement('div');sp.className='k sp';sd.appendChild(sp);kb.appendChild(sd);keys[' ']=sp;
function flash(c){const k=keys[c];if(k){k.classList.add('on');setTimeout(()=>k.classList.remove('on'),110)}}

// lirik -> kode
function toCode(line){
  const w=line.toLowerCase().replace(/[^a-z0-9' ]/g,'').trim().split(/\s+/).filter(Boolean);
  if(!w.length)return null;
  if(w.length===1)return 'say("'+w[0]+'"){';
  return w[0]+'.'+w[1]+'('+(w.length>2?'"'+w.slice(2).join('_')+'"':'')+'){';
}
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
function paint(t){
  const m=t.match(/^([^(]*)(\(?)("[^"]*"?)?(.*)$/);
  return '<span class="fn">'+esc(m[1])+'</span><span class="dm">'+esc(m[2])+'</span><span class="st">'+esc(m[3]||'')+'</span><span class="dm">'+esc(m[4])+'</span>';
}

// susun jadwal: tiap baris punya start & end (detik)
function buildTimeline(){
  const raw=LYRICS.split('\n').map(s=>s.trim());
  const TAG=/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/;
  let list=[];
  if(raw.some(l=>TAG.test(l))){
    raw.forEach(l=>{const m=l.match(TAG);if(m){const c=toCode(m[3]);if(c)list.push({code:c,start:+m[1]*60+ +m[2]})}});
    list.forEach((it,i)=>{it.end=i<list.length-1?list[i+1].start-0.25:END});
  }else{
    const groups=[[]];
    raw.forEach(l=>{
      if(!l){if(groups[groups.length-1].length)groups.push([])}
      else{const c=toCode(l);if(c)groups[groups.length-1].push(c)}
    });
    if(!groups[groups.length-1].length)groups.pop();
    const segs=groups.length===BREAKS.length-1
      ?groups.map((g,i)=>[g,BREAKS[i],BREAKS[i+1]])
      :[[groups.flat(),START,END]];
    segs.forEach(([g,a,b])=>{
      const total=g.reduce((n,c)=>n+c.length,0);let t=a;
      g.forEach(c=>{const slot=(b-a)*c.length/total;list.push({code:c,start:t,end:t+slot*0.85});t+=slot});
    });
  }
  list.forEach(it=>{if(it.end<it.start+0.3)it.end=it.start+0.3});
  return list;
}
const items=buildTimeline();

// jam: ikut audio kalau ada
let audio=null,t0=0,playing=false,lastKey='';
if(AUDIO){audio=new Audio(AUDIO);audio.volume=AUDIO_VOLUME;audio.preload='auto'}
const now=()=>audio?audio.currentTime:(performance.now()-t0)/1000;

function render(k,n){
  let h='';
  for(let i=Math.max(0,k-7);i<=k;i++){
    const c=items[i].code;
    h+='<div>'+paint(i===k?c.slice(0,n):c)+(i===k?'<span class="cur"></span>':'')+'</div>';
  }
  code.innerHTML=h;
}
function frame(){
  if(!playing)return;
  const t=now();
  let k=-1;
  for(let i=0;i<items.length;i++)if(t>=items[i].start)k=i;
  let n=0;
  if(k>=0){const it=items[k];n=Math.floor(Math.min(1,(t-it.start)/(it.end-it.start))*it.code.length)}
  const key=k+':'+n;
  if(key!==lastKey){
    render(k,n);
    if(k>=0&&n>0)flash(items[k].code[n-1]);
    lastKey=key;
  }
  const finish=Math.max(END,items.length?items[items.length-1].end:0)+2.5;
  if(t>finish||(audio&&audio.ended)){
    playing=false;
    if(LOOP)setTimeout(start,500);else ov.classList.remove('hide');
    return;
  }
  requestAnimationFrame(frame);
}
function start(){
  ov.classList.add('hide');
  code.innerHTML='';lastKey='';playing=true;
  if(audio){audio.currentTime=0;audio.play().catch(()=>{})}else t0=performance.now();
  requestAnimationFrame(frame);
}
ov.addEventListener('click',e=>{e.stopPropagation();start()});
document.addEventListener('click',()=>{if(ov.classList.contains('hide'))start()});
document.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();start()}});
