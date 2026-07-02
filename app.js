"use strict";
/* 후제 캘린더 — 오늘 허브 (Firebase 이전, localStorage 임시 저장) */

const LS_KEY="hooje.v2";
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
const DOW_KO=["일","월","화","수","목","금","토"];
function pad(n){return String(n).padStart(2,"0");}
function ymd(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());}
function parseYmd(s){const a=s.split("-").map(Number);return new Date(a[0],a[1]-1,a[2]);}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
function startOfDay(d){const x=new Date(d);x.setHours(0,0,0,0);return x;}
function sameDay(a,b){return ymd(a)===ymd(b);}
function todayD(){return startOfDay(new Date());}
function dayKeyNow(){const n=new Date();const d=new Date(n);if(n.getHours()<6)d.setDate(d.getDate()-1);return ymd(startOfDay(d));}
function mdShort(dstr){const d=parseYmd(dstr);return (d.getMonth()+1)+"/"+d.getDate();}
function toMin(t){const a=t.split(":").map(Number);return a[0]*60+a[1];}
function addHour(t){let a=t.split(":").map(Number);let h=Math.min(23,a[0]+1);return pad(h)+":"+pad(a[1]);}

/* 주기 키 (선택 날짜 기준) */
function keyDaily(dstr){return dstr;}
function keyWeekGen(dstr){const d=parseYmd(dstr);return ymd(addDays(d,-((d.getDay()+6)%7)));}   /* 월요일 */
function keyWowWeek(dstr){const d=parseYmd(dstr);return ymd(addDays(d,-(((d.getDay()-4)+7)%7)));} /* 목요일 */
function weekGenRange(dstr){const s=parseYmd(keyWeekGen(dstr));return [ymd(s),ymd(addDays(s,6))];}
function wowWeekRange(dstr){const s=parseYmd(keyWowWeek(dstr));return [ymd(s),ymd(addDays(s,6))];}
function wowNextReset(){const now=new Date();const d=new Date(now);
  for(let i=0;i<8;i++){const c=new Date(d);c.setHours(8,0,0,0);if(c.getDay()===4&&c>now)return c;d.setDate(d.getDate()+1);}
  return addDays(now,7);}

function defaultData(){
  const t=todayD();const rel=n=>ymd(addDays(t,n));
  return {
    categories:[
      {id:"personal",name:"개인",color:"#5b9dff"},
      {id:"health",name:"건강",color:"#46d17f"},
      {id:"wow",name:"와우",color:"#8788EE"},
      {id:"work",name:"업무",color:"#9ba1ab"},
      {id:"ai",name:"AI",color:"#C9A84C"},
    ],
    events:[
      {id:uid(),catId:"health",title:"아침 러닝",date:rel(0),allDay:false,start:"07:30",end:"08:30",imp:1,repeat:"none"},
      {id:uid(),catId:"work",title:"클라이언트 미팅",date:rel(0),allDay:false,start:"14:00",end:"15:00",imp:3,repeat:"none"},
      {id:uid(),catId:"wow",title:"신화레이드 정공",date:rel(0),allDay:false,start:"20:00",end:"22:00",imp:2,repeat:"weekly",note:"아라카라 · 정규 공대"},
      {id:uid(),catId:"wow",title:"쐐기 4바퀴",date:rel(0),allDay:false,start:"22:00",end:"23:30",imp:1,repeat:"none"},
      {id:uid(),catId:"personal",title:"오사카 여행",date:rel(9),endDate:rel(11),allDay:true,imp:2,repeat:"none"},
      {id:uid(),catId:"ai",title:"AI 워크샵",date:rel(16),endDate:rel(17),allDay:true,imp:2,repeat:"none"},
      {id:uid(),catId:"work",title:"마감",date:rel(14),allDay:true,imp:3,repeat:"none"},
    ],
    routines:[
      {id:uid(),title:"공복 영양제",cadence:"daily",time:"07:00",catId:"health"},
      {id:uid(),title:"아침 영양제",cadence:"daily",time:"08:30",catId:"health"},
      {id:uid(),title:"물 2L 마시기",cadence:"daily",catId:"health"},
      {id:uid(),title:"영어 공부 30분",cadence:"daily",catId:"personal"},
      {id:uid(),title:"장보기",cadence:"weekly",catId:"personal"},
      {id:uid(),title:"주간 결산",cadence:"weekly",catId:"work"},
    ],
    routineDone:{},
    wowChars:[{id:"hooje",name:"후제"},{id:"meo",name:"메오"},{id:"mago",name:"마고"},{id:"gro",name:"그로"},{id:"mutong",name:"무통"}],
    wowQuests:[
      {id:uid(),charId:"hooje",title:"신화레이드",type:"check"},
      {id:uid(),charId:"hooje",title:"쐐기",type:"counter",target:4},
      {id:uid(),charId:"meo",title:"신화레이드",type:"check"},
      {id:uid(),charId:"meo",title:"영웅레이드",type:"check"},
    ],
    wowProgress:{},
    health:{},
    hubBlocks:[
      {id:"stats",on:true},{id:"timeline",on:true},{id:"daily",on:true},
      {id:"weekGeneral",on:true},{id:"weekWow",on:true},{id:"health",on:false},{id:"upcoming",on:false},
    ],
  };
}
const BLOCK_NAMES={stats:"통계 요약",timeline:"이 날 일정 (타임라인)",daily:"이 날 체크리스트 (일일)",weekGeneral:"이번 주 · 일반",weekWow:"이번 주 · 와우",health:"건강 요약",upcoming:"다가오는 일정 (3일)"};

let DB;
function load(){}
function save(){ if(!FB.docRef){return;} lastJson=JSON.stringify(DB); FB.docRef.set({json:lastJson,updatedAt:new Date().toISOString()}).catch(function(e){toast("저장 실패: "+(e.code||e.message));}); }
function catById(id){return DB.categories.find(c=>c.id===id)||DB.categories[0];}
function masterOf(id){return DB.events.find(e=>e.id===id);}
function escapeHtml(s){return String(s==null?"":s).replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[m]));}
function emptyHtml(t){return '<div class="empty">'+t+'</div>';}

/* ===== color / recurrence ===== */
function hexToRgba(hex,a){const n=parseInt(hex.slice(1),16);return "rgba("+((n>>16)&255)+","+((n>>8)&255)+","+(n&255)+","+a+")";}
function lighten(hex,amt){const n=parseInt(hex.slice(1),16);return "rgb("+Math.min(255,((n>>16)&255)+amt)+","+Math.min(255,((n>>8)&255)+amt)+","+Math.min(255,(n&255)+amt)+")";}

function eventsForRange(rs,re){
  const out=[];
  DB.events.forEach(ev=>{
    const base=parseYmd(ev.date);const baseEnd=parseYmd(ev.endDate||ev.date);
    const spanDays=Math.round((startOfDay(baseEnd)-startOfDay(base))/86400000);
    const rep=ev.repeat||"none";
    const push=s=>{const e=addDays(s,spanDays);if(e<rs||s>re)return;out.push(Object.assign({},ev,{date:ymd(s),endDate:ymd(e),_id:ev.id}));};
    if(rep==="none"){push(base);return;}
    for(let dd=new Date(rs);dd<=re;dd=addDays(dd,1)){
      if(dd<base)continue;
      if(rep==="daily")push(new Date(dd));
      else if(rep==="weekly"&&dd.getDay()===base.getDay())push(new Date(dd));
      else if(rep==="monthly"&&dd.getDate()===base.getDate())push(new Date(dd));
    }
  });
  return out;
}
function instancesOnDay(dstr){const d=parseYmd(dstr);return eventsForRange(d,d);}

/* ===== 루틴 / 와우 체크 → 캘린더 자동기록 ===== */
function routineState(r,dstr){const pk=r.cadence==="daily"?keyDaily(dstr):keyWeekGen(dstr);return DB.routineDone[r.id+"@"+pk];}
function toggleRoutine(r,dstr){
  const pk=r.cadence==="daily"?keyDaily(dstr):keyWeekGen(dstr);const k=r.id+"@"+pk;
  if(DB.routineDone[k]){delete DB.routineDone[k];}   /* 해제: 일정은 남김 */
  else{
    const ev={id:uid(),catId:r.catId,title:r.title,date:dstr,imp:1,repeat:"none",fromRoutine:r.id,done:true};
    if(r.time){ev.allDay=false;ev.start=r.time;ev.end=addHour(r.time);}else ev.allDay=true;
    DB.events.push(ev);DB.routineDone[k]={eventId:ev.id};
  }
  save();
}
function wpFor(dstr){const k=keyWowWeek(dstr);if(!DB.wowProgress[k])DB.wowProgress[k]={};return DB.wowProgress[k];}
function toggleWowCheck(q,dstr){
  const p=wpFor(dstr);const st=p[q.id]=p[q.id]||{};
  if(st.done){st.done=false;}
  else{st.done=true;if(!st.eventId){const ch=DB.wowChars.find(c=>c.id===q.charId);
    const ev={id:uid(),catId:"wow",title:(ch?ch.name+" · ":"")+q.title,date:dstr,allDay:true,imp:1,repeat:"none",fromWow:q.id,done:true};
    DB.events.push(ev);st.eventId=ev.id;}}
  save();
}
function wowCounter(q,dstr,delta){
  const p=wpFor(dstr);const st=p[q.id]=p[q.id]||{};st.progress=Math.max(0,Math.min(q.target,(st.progress||0)+delta));
  if(st.progress>=q.target&&!st.eventId){const ch=DB.wowChars.find(c=>c.id===q.charId);
    const ev={id:uid(),catId:"wow",title:(ch?ch.name+" · ":"")+q.title+" 완료",date:dstr,allDay:true,imp:1,repeat:"none",fromWow:q.id,done:true};
    DB.events.push(ev);st.eventId=ev.id;}
  save();
}

/* ===== UI state ===== */
let curTab="home";
let viewMonth=new Date(todayD().getFullYear(),todayD().getMonth(),1);
let selDate=dayKeyNow();

/* ===== 홈 (달력 + 허브) ===== */
function renderHome(){
  const host=document.getElementById("tab-home");
  const legend=DB.categories.map(c=>'<span><i class="dot" style="background:'+c.color+'"></i>'+escapeHtml(c.name)+'</span>').join("");
  host.innerHTML=
    '<div class="home"><div class="cal-col">'+
      '<div class="brandline"><i class="ti ti-calendar-heart"></i>Hooje Calendar</div>'+
      '<div class="legend">'+legend+'</div>'+
      '<div class="mhead"><div><span class="mtitle" id="mTitle"></span><span class="myear" id="mYear"></span></div>'+
      '<div class="nav"><button id="prevM" aria-label="이전 달">‹</button><button class="today-btn" id="todayM">오늘</button><button id="nextM" aria-label="다음 달">›</button></div></div>'+
      '<div class="dow"><div style="color:var(--sat)">일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div style="color:var(--sun)">토</div></div>'+
      '<div class="grid" id="calGrid"></div>'+
    '</div><div class="hub-div"></div><div class="hub-col" id="hubCol"></div></div>';
  document.getElementById("prevM").onclick=()=>{viewMonth.setMonth(viewMonth.getMonth()-1);buildMonthGrid();};
  document.getElementById("nextM").onclick=()=>{viewMonth.setMonth(viewMonth.getMonth()+1);buildMonthGrid();};
  document.getElementById("todayM").onclick=()=>{viewMonth=new Date(todayD().getFullYear(),todayD().getMonth(),1);selDate=dayKeyNow();buildMonthGrid();renderHub();};
  buildMonthGrid();renderHub();
}

function buildMonthGrid(){
  const y=viewMonth.getFullYear(),m=viewMonth.getMonth();
  document.getElementById("mTitle").textContent=(m+1)+"월";
  document.getElementById("mYear").textContent=y;
  const first=new Date(y,m,1);const gridStart=addDays(first,-first.getDay());
  const weeks=[];
  for(let w=0;w<6;w++){const days=[];for(let i=0;i<7;i++)days.push(addDays(gridStart,w*7+i));weeks.push(days);if(days[6].getMonth()!==m&&w>=4)break;}
  const gridEnd=weeks[weeks.length-1][6];const insts=eventsForRange(gridStart,gridEnd);
  const LT=24,LH=17,ML=2;
  const grid=document.getElementById("calGrid");grid.innerHTML="";
  weeks.forEach(days=>{
    const wkStart=days[0],wkEnd=days[6];
    const wk=document.createElement("div");wk.className="wk";
    const nums=document.createElement("div");nums.className="nums";
    days.forEach(dt=>{
      const out=dt.getMonth()!==m,isToday=sameDay(dt,todayD()),isSel=ymd(dt)===selDate;
      const cls=["num"];if(out)cls.push("out");if(dt.getDay()===0)cls.push("sun");if(dt.getDay()===6)cls.push("sat");
      let inner;
      if(isToday)inner='<span class="badge">'+dt.getDate()+'</span>';
      else if(isSel)inner='<span class="badge2">'+dt.getDate()+'</span>';
      else inner=dt.getDate();
      const cell=document.createElement("div");cell.className=cls.join(" ");cell.innerHTML=inner;
      cell.onclick=()=>{selDate=ymd(dt);buildMonthGrid();renderHub();};
      nums.appendChild(cell);
    });
    wk.appendChild(nums);
    const segs=[];
    insts.forEach(ev=>{const s=parseYmd(ev.date),e=parseYmd(ev.endDate);if(e<wkStart||s>wkEnd)return;
      const cs=Math.max(0,Math.round((startOfDay(s)-startOfDay(wkStart))/86400000));
      const ce=Math.min(6,Math.round((startOfDay(e)-startOfDay(wkStart))/86400000));
      segs.push({ev,cs,ce,span:ce-cs+1});});
    segs.sort((a,b)=>(b.span-a.span)||(a.cs-b.cs));
    const lanes=[],overflow=new Array(7).fill(0);
    segs.forEach(seg=>{
      let placed=-1;
      for(let li=0;li<lanes.length;li++){let ok=true;for(let c=seg.cs;c<=seg.ce;c++)if(lanes[li][c]){ok=false;break;}if(ok){placed=li;break;}}
      if(placed===-1){placed=lanes.length;lanes.push(new Array(7).fill(false));}
      for(let c=seg.cs;c<=seg.ce;c++)lanes[placed][c]=true;
      if(placed>=ML){for(let c=seg.cs;c<=seg.ce;c++)overflow[c]++;return;}
      const c=catById(seg.ev.catId),isBar=seg.span>1;
      const el=document.createElement("div");el.className="item clip";
      el.style.top=(LT+placed*LH)+"px";el.style.left="calc("+(seg.cs/7*100)+"% + 3px)";el.style.width="calc("+(seg.span/7*100)+"% - 6px)";
      el.style.background=hexToRgba(c.color,isBar?0.30:0.22);el.style.color=lighten(c.color,isBar?60:55);
      el.textContent=seg.ev.title;
      el.onclick=e=>{e.stopPropagation();openEditor(masterOf(seg.ev._id));};
      wk.appendChild(el);
    });
    overflow.forEach((n,c)=>{if(n>0){const more=document.createElement("div");more.className="more";more.style.top=(LT+ML*LH)+"px";more.style.left=(c/7*100)+"%";more.textContent="+"+n;more.onclick=()=>{selDate=ymd(days[c]);buildMonthGrid();renderHub();};wk.appendChild(more);}});
    const lc=Math.min(lanes.length,ML)+(overflow.some(n=>n>0)?1:0);
    wk.style.height=(LT+Math.max(1,lc)*LH+6)+"px";
    grid.appendChild(wk);
  });
}

/* ===== 허브 ===== */
function renderHub(){
  const host=document.getElementById("hubCol");if(!host)return;
  const d=parseYmd(selDate);const isToday=selDate===dayKeyNow();
  let html='<div class="hub-head"><span class="d">'+(isToday?"오늘 · ":"")+(d.getMonth()+1)+'월 '+d.getDate()+'일 <small>'+DOW_KO[d.getDay()]+'</small></span>'+
    '<button class="iconbtn" id="hubEdit"><i class="ti ti-adjustments-horizontal"></i></button></div>'+
    '';
  DB.hubBlocks.forEach(b=>{if(b.on)html+='<div id="blk-'+b.id+'"></div>';});
  host.innerHTML=html;
  document.getElementById("hubEdit").onclick=openHubEdit;
  DB.hubBlocks.forEach(b=>{if(!b.on)return;const el=document.getElementById("blk-"+b.id);if(el)renderBlock(b.id,el);});
}
function renderBlock(id,el){
  if(id==="stats")blkStats(el);
  else if(id==="timeline")blkTimeline(el);
  else if(id==="daily")blkDaily(el);
  else if(id==="weekGeneral")blkWeekGen(el);
  else if(id==="weekWow")blkWeekWow(el);
  else if(id==="health")blkHealth(el);
  else if(id==="upcoming")blkUpcoming(el);
}

/* ===== 허브 블록들 ===== */
function blkStats(el){
  const insts=instancesOnDay(selDate);const timed=insts.filter(e=>!e.allDay&&e.start);
  let remain=timed.length;const isToday=selDate===dayKeyNow();
  if(isToday){const nowM=new Date().getHours()*60+new Date().getMinutes();remain=timed.filter(e=>toMin(e.start)>=nowM).length;}
  const dr=DB.routines.filter(r=>r.cadence==="daily");const done=dr.filter(r=>routineState(r,selDate)).length;
  const dd=Math.floor((wowNextReset()-new Date())/86400000);
  el.innerHTML='<div class="stats">'+
    '<div class="stat"><b>'+remain+'</b><span>남은 일정</span></div>'+
    '<div class="stat"><b style="color:var(--gold)">'+done+'/'+dr.length+'</b><span>'+(isToday?"오늘":"이 날")+' 체크</span></div>'+
    '<div class="stat"><b style="color:var(--wow)">D-'+dd+'</b><span>와우 리셋</span></div></div>';
}
function checklistRow(r,dstr){
  const on=!!routineState(r,dstr);const c=catById(r.catId);
  const right=on?'<span class="ctag" style="color:'+lighten(c.color,55)+';background:'+hexToRgba(c.color,.14)+'">'+(r.time?r.time+" 기록":"기록")+'</span>':(r.time?'<span class="ctime">'+r.time+'</span>':'');
  return '<div class="crow"><button class="ck '+(on?"on":"")+'" data-rt="'+r.id+'">'+(on?"✓":"")+'</button>'+
    '<span class="ctitle '+(on?"done":"")+'" data-ert="'+r.id+'">'+escapeHtml(r.title)+'</span>'+right+'</div>';
}
function bindChecklist(el){
  el.querySelectorAll("[data-rt]").forEach(b=>b.onclick=()=>{const r=DB.routines.find(x=>x.id===b.dataset.rt);toggleRoutine(r,selDate);buildMonthGrid();renderHub();});
  el.querySelectorAll("[data-ert]").forEach(s=>s.onclick=()=>{const r=DB.routines.find(x=>x.id===s.dataset.ert);openRoutineEditor(r);});
}
function blkTimeline(el){
  const isToday=selDate===dayKeyNow();
  el.innerHTML='<div class="sec"><span>'+(isToday?"오늘":"이 날")+' 일정</span><span class="add" data-add>＋ 추가</span></div><div id="tlAllday"></div><div class="timeline" id="tlBody"></div>';
  el.querySelector("[data-add]").onclick=()=>openEditor(null,{date:selDate});
  buildTimeline(el.querySelector("#tlBody"),el.querySelector("#tlAllday"),selDate);
}
function buildTimeline(tl,ar,dstr){
  const insts=instancesOnDay(dstr);const allday=insts.filter(e=>e.allDay);const timed=insts.filter(e=>!e.allDay&&e.start);
  ar.innerHTML="";
  allday.forEach(ev=>{const c=catById(ev.catId);const chip=document.createElement("div");chip.className="crow";chip.style.cursor="pointer";
    chip.innerHTML='<span class="evbar" style="height:18px;background:'+c.color+'"></span><span class="ctitle clip">'+escapeHtml(ev.title)+(ev.endDate!==ev.date?" (연속)":"")+'</span>'+(ev.done?'<span class="ctime">✓</span>':'<span class="ctime">종일</span>');
    chip.onclick=()=>openEditor(masterOf(ev._id));ar.appendChild(chip);});
  const S=6,E=24,PPM=44/60;
  tl.innerHTML="";
  if(!timed.length){tl.style.height="auto";tl.innerHTML=emptyHtml("시간 지정 일정 없음");return;}
  tl.style.height=(E-S)*60*PPM+"px";
  const axis=document.createElement("div");axis.className="axis";tl.appendChild(axis);
  for(let h=S;h<=E;h+=2){const top=(h-S)*60*PPM;const l=document.createElement("div");l.className="hr-label";l.style.top=top+"px";l.textContent=pad(h);tl.appendChild(l);if(h>S){const ln=document.createElement("div");ln.className="hr-line";ln.style.top=top+"px";tl.appendChild(ln);}}
  const evs=timed.slice().sort((a,b)=>toMin(a.start)-toMin(b.start));
  evs.forEach(ev=>{
    const ov=evs.filter(o=>toMin(o.start)<toMin(ev.end||ev.start)&&toMin(o.end||o.start)>toMin(ev.start));
    const cols=ov.length,col=ov.indexOf(ev);const c=catById(ev.catId);
    const top=(toMin(ev.start)-S*60)*PPM,h=Math.max(11,(toMin(ev.end||ev.start)-toMin(ev.start))*PPM),w=100/cols;
    const el=document.createElement("div");el.className="ev";
    el.style.top=top+"px";el.style.height=h+"px";el.style.left="calc("+(col*w)+"% + "+(col?3:6)+"px)";el.style.width="calc("+w+"% - 9px)";
    el.style.background=hexToRgba(c.color,0.16);el.style.borderLeft=(1+ev.imp*1.5)+"px solid "+c.color;
    if(cols>1)el.innerHTML='<div class="clip" style="font-size:9px;line-height:11px">'+escapeHtml(ev.title)+'</div>';
    else el.innerHTML='<div class="clip"><span class="et">'+ev.start+'</span>'+escapeHtml(ev.title)+'</div>'+(ev.note&&h>28?'<div class="clip es">'+escapeHtml(ev.note)+'</div>':'');
    el.onclick=()=>openEditor(masterOf(ev._id));tl.appendChild(el);
  });
}
function blkDaily(el){
  const rs=DB.routines.filter(r=>r.cadence==="daily");const isToday=selDate===dayKeyNow();
  const rows=rs.map(r=>checklistRow(r,selDate)).join("");
  el.innerHTML='<div class="sec"><span>'+(isToday?"오늘":"이 날")+' 체크리스트</span><span class="r">매일 06:00 · <span class="add" data-add>＋</span></span></div>'+(rows||emptyHtml("항목 없음"));
  bindChecklist(el);el.querySelector("[data-add]").onclick=()=>openRoutineEditor(null,"daily");
}
function blkWeekGen(el){
  const rs=DB.routines.filter(r=>r.cadence==="weekly");const rg=weekGenRange(selDate);
  const rows=rs.map(r=>checklistRow(r,selDate)).join("");
  el.innerHTML='<div class="sec"><span>이번 주 · 일반</span><span class="r">'+mdShort(rg[0])+"~"+mdShort(rg[1])+' · <span class="add" data-add>＋</span></span></div>'+(rows||emptyHtml("항목 없음"));
  bindChecklist(el);el.querySelector("[data-add]").onclick=()=>openRoutineEditor(null,"weekly");
}
function blkWeekWow(el){
  const rg=wowWeekRange(selDate);const p=wpFor(selDate);
  const chars=DB.wowChars.filter(ch=>DB.wowQuests.some(q=>q.charId===ch.id));
  let body="";
  chars.forEach(ch=>{const qs=DB.wowQuests.filter(q=>q.charId===ch.id);body+='<div class="charlabel">'+escapeHtml(ch.name)+'</div>';
    qs.forEach(q=>{const st=p[q.id]||{};
      if(q.type==="counter"){const v=st.progress||0;body+='<div class="crow"><span class="ctitle '+(v>=q.target?"done":"")+'">'+escapeHtml(q.title)+'</span><div class="counter"><button data-wdec="'+q.id+'">−</button><span class="val">'+v+'/'+q.target+'</span><button data-winc="'+q.id+'">＋</button></div></div>';}
      else{const on=!!st.done;body+='<div class="crow"><button class="ck '+(on?"on":"")+'" data-wchk="'+q.id+'">'+(on?"✓":"")+'</button><span class="ctitle '+(on?"done":"")+'">'+escapeHtml(q.title)+'</span></div>';}
    });});
  if(!chars.length)body=emptyHtml("설정에서 캐릭터·퀘스트 추가");
  el.innerHTML='<div class="sec"><span>이번 주 · 와우</span><span class="r" style="color:var(--wow)">'+mdShort(rg[0])+"~"+mdShort(rg[1])+'</span></div>'+body;
  el.querySelectorAll("[data-wchk]").forEach(x=>x.onclick=()=>{toggleWowCheck(DB.wowQuests.find(z=>z.id===x.dataset.wchk),selDate);buildMonthGrid();renderHub();});
  el.querySelectorAll("[data-winc]").forEach(x=>x.onclick=()=>{wowCounter(DB.wowQuests.find(z=>z.id===x.dataset.winc),selDate,1);buildMonthGrid();renderHub();});
  el.querySelectorAll("[data-wdec]").forEach(x=>x.onclick=()=>{wowCounter(DB.wowQuests.find(z=>z.id===x.dataset.wdec),selDate,-1);buildMonthGrid();renderHub();});
}
function blkHealth(el){
  const rec=DB.health[selDate]||{};
  el.innerHTML='<div class="sec"><span>건강</span><span class="add" data-edit>기록</span></div>'+
    '<div class="crow"><span class="ctitle">운동</span><span class="ctime">'+(rec.exercised?("✓ "+escapeHtml(rec.type||"")):"—")+'</span></div>'+
    (rec.diet?'<div class="crow"><span class="ctitle clip">식단 · '+escapeHtml(rec.diet)+'</span></div>':'')+
    (rec.supp?'<div class="crow"><span class="ctitle clip">영양제 · '+escapeHtml(rec.supp)+'</span></div>':'');
  el.querySelector("[data-edit]").onclick=()=>openHealthEditor(selDate);
}
function blkUpcoming(el){
  let rows="";
  for(let i=1;i<=3;i++){const ds=ymd(addDays(parseYmd(selDate),i));const insts=instancesOnDay(ds);const dd=parseYmd(ds);
    if(insts.length){rows+='<div class="charlabel">'+(dd.getMonth()+1)+'/'+dd.getDate()+' '+DOW_KO[dd.getDay()]+'</div>';
      insts.slice(0,4).forEach(ev=>{const c=catById(ev.catId);rows+='<div class="evrow" data-ev="'+ev._id+'"><span class="evbar" style="height:20px;background:'+c.color+'"></span><span class="ctitle clip">'+escapeHtml(ev.title)+'</span><span class="ctime">'+(ev.allDay?"종일":ev.start||"")+'</span></div>';});}}
  el.innerHTML='<div class="sec"><span>다가오는 일정 (3일)</span></div>'+(rows||emptyHtml("예정된 일정 없음"));
  el.querySelectorAll("[data-ev]").forEach(x=>x.onclick=()=>openEditor(masterOf(x.dataset.ev)));
}

/* ===== 자연어 입력 ===== */
function guessCat(text){
  if(/레이드|쐐기|신화|영웅|공대|던전|와우|낙사|아라카라/.test(text))return "wow";
  if(/헬스|운동|러닝|조깅|스쿼트|식단|영양제|필라테스|요가|PT|스트레칭|산책/.test(text))return "health";
  if(/미팅|회의|마감|업무|출근|보고|클라이언트|프로젝트|계약|발표/.test(text))return "work";
  if(/AI|에이아이|모델|실험|프롬프트|빌드|배포|데이터셋|파인튜닝/i.test(text))return "ai";
  return "personal";
}
function parseNL(text){
  let t=text.trim();let base=parseYmd(selDate);
  const dayMap={"오늘":0,"낼":1,"내일":1,"모레":2,"글피":3};
  for(const k in dayMap){if(t.includes(k)){base=addDays(todayD(),dayMap[k]);t=t.replace(k,"");break;}}
  const dm=t.match(/(다음주|담주|이번주)?\s*([일월화수목금토])요일/);
  if(dm){const target=DOW_KO.indexOf(dm[2]);const cur=todayD();let diff;
    if(dm[1]&&/다음|담/.test(dm[1]))diff=(target-cur.getDay())+7;
    else if(dm[1]&&/이번/.test(dm[1]))diff=(target-cur.getDay());
    else diff=(target-cur.getDay()+7)%7;
    base=addDays(cur,diff);t=t.replace(dm[0],"");}
  let start=null,end=null,allDay=true;
  const ampm=(t.match(/오전|오후|아침|저녁|밤|낮|새벽/)||[])[0]||"";
  const tm=t.match(/(\d{1,2})\s*시\s*(반|\d{1,2}\s*분)?/)||t.match(/(\d{1,2}):(\d{2})/);
  if(tm){let h=parseInt(tm[1],10),mm=0;
    if(/:/.test(tm[0]))mm=parseInt(tm[0].split(":")[1],10)||0;
    else if(tm[2])mm=tm[2].includes("반")?30:(parseInt(tm[2],10)||0);
    if(/오후|저녁|밤/.test(ampm)&&h<12)h+=12;
    if(/새벽|아침|오전/.test(ampm)&&h===12)h=0;
    if(h>23)h=23;
    start=pad(h)+":"+pad(mm);end=pad(Math.min(23,h+1))+":"+pad(mm);allDay=false;t=t.replace(tm[0],"");}
  if(ampm)t=t.replace(ampm,"");
  t=t.replace(/\s{2,}/g," ").trim();
  return {catId:guessCat(text),title:t||text.trim(),date:ymd(base),allDay,start,end,imp:1,repeat:"none"};
}
function coreMatch(t,title){
  const n=title.replace(/\s/g,"");
  for(let cut=0;cut<=2;cut++){const core=n.slice(0,n.length-cut);if(core.length>=3&&t.includes(core))return true;}
  return t.includes(n);
}
function findCompletion(text){
  if(!/했|먹었|마셨|다녀왔|다녀옴|완료|끝냈|끝났|갔다왔|마쳤|봤|갔다/.test(text))return null;
  const t=text.replace(/\s/g,"");
  for(const r of DB.routines){if(coreMatch(t,r.title))return {type:"routine",obj:r};}
  for(const q of DB.wowQuests){if(coreMatch(t,q.title)){const ch=DB.wowChars.find(c=>c.id===q.charId);return {type:"wow",obj:q,ch:ch};}}
  return null;
}
function quickAdd(text){
  const comp=findCompletion(text);const today=dayKeyNow();
  if(comp){
    if(comp.type==="routine"){if(!routineState(comp.obj,today))toggleRoutine(comp.obj,today);
      selDate=today;viewMonth=new Date(todayD().getFullYear(),todayD().getMonth(),1);renderHome();toast("체크됨 · "+comp.obj.title);return;}
    const q=comp.obj;if(q.type==="check"){const st=wpFor(today)[q.id]||{};if(!st.done)toggleWowCheck(q,today);}else wowCounter(q,today,1);
    selDate=today;viewMonth=new Date(todayD().getFullYear(),todayD().getMonth(),1);renderHome();toast("체크됨 · "+(comp.ch?comp.ch.name+" ":"")+q.title);return;
  }
  const p=parseNL(text);if(!p.title){openEditor(null,{date:selDate});return;}
  DB.events.push(Object.assign({id:uid()},p));save();
  selDate=p.date;viewMonth=new Date(parseYmd(p.date).getFullYear(),parseYmd(p.date).getMonth(),1);renderHome();
  toast("추가됨 · "+catById(p.catId).name+" · "+p.title+(p.start?" "+p.start:""));
}

/* ===== 일정 편집 모달 ===== */
function openEditor(ev,preset){
  const editing=!!ev;
  const e=ev?Object.assign({},ev):Object.assign({id:uid(),catId:"personal",title:"",date:(preset&&preset.date)||selDate,allDay:false,start:"09:00",end:"10:00",imp:1,repeat:"none",alarm:false,alarmMin:30,tag:"",note:""},preset||{});
  const catChips=DB.categories.map(c=>'<button type="button" class="chip'+(c.id===e.catId?" sel":"")+'" data-cat="'+c.id+'" style="color:'+c.color+'"><i class="dot" style="background:'+c.color+'"></i><span style="color:var(--text)">'+escapeHtml(c.name)+'</span></button>').join("");
  const impBtn=i=>'<button type="button" class="imp'+(e.imp===i?" sel":"")+'" data-imp="'+i+'"><span class="imp-bar" style="height:'+(8+i*3)+'px"></span>'+["","보통","높음","매우 높음"][i]+'</button>';
  const alarmOpts=[0,5,10,30,60,120,1440].map(v=>'<option value="'+v+'"'+((e.alarmMin||30)===v?" selected":"")+'>'+(v===0?"정시":v>=1440?"1일 전":v>=60?(v/60)+"시간 전":v+"분 전")+'</option>').join("");
  const root=document.getElementById("modalRoot");
  root.innerHTML='<div class="sheet"><div class="sheet-h"><span class="title">'+(editing?"일정 편집":"새 일정")+'</span><button class="x" id="mX">×</button></div>'+
    '<div class="field"><label>제목</label><input type="text" id="fTitle" value="'+escapeHtml(e.title)+'" placeholder="일정 이름"/></div>'+
    '<div class="field"><label>카테고리</label><div class="chips" id="fCats">'+catChips+'</div></div>'+
    '<div class="field"><label>중요도 (막대 두께)</label><div class="imp-opt" id="fImp">'+impBtn(1)+impBtn(2)+impBtn(3)+'</div></div>'+
    '<div class="toggle"><span class="lbl">종일</span><div class="sw'+(e.allDay?" on":"")+'" id="fAllday"><i></i></div></div>'+
    '<div class="row2"><div class="field"><label>시작일</label><input type="date" id="fDate" value="'+e.date+'"/></div>'+
    '<div class="field" id="fEndW" '+(e.endDate&&e.endDate!==e.date?"":'style="display:none"')+'><label>종료일</label><input type="date" id="fEndDate" value="'+(e.endDate||e.date)+'"/></div></div>'+
    '<div class="toggle"><span class="lbl">여러 날 (연속)</span><div class="sw'+(e.endDate&&e.endDate!==e.date?" on":"")+'" id="fMulti"><i></i></div></div>'+
    '<div class="row2" id="fTimes" '+(e.allDay?'style="display:none"':"")+'><div class="field"><label>시작</label><input type="time" id="fStart" value="'+(e.start||"09:00")+'"/></div><div class="field"><label>종료</label><input type="time" id="fEnd" value="'+(e.end||"10:00")+'"/></div></div>'+
    '<div class="row2"><div class="field"><label>반복</label><select id="fRepeat"><option value="none"'+(e.repeat==="none"?" selected":"")+'>없음</option><option value="daily"'+(e.repeat==="daily"?" selected":"")+'>매일</option><option value="weekly"'+(e.repeat==="weekly"?" selected":"")+'>매주</option><option value="monthly"'+(e.repeat==="monthly"?" selected":"")+'>매월</option></select></div>'+
    '<div class="field"><label>태그</label><input type="text" id="fTag" value="'+escapeHtml(e.tag||"")+'" placeholder="선택"/></div></div>'+
    '<div class="toggle"><span class="lbl">알림</span><div class="sw'+(e.alarm?" on":"")+'" id="fAlarm"><i></i></div></div>'+
    '<div class="field" id="fAlarmW" '+(e.alarm?"":'style="display:none"')+'><label>알림 시점</label><select id="fAlarmMin">'+alarmOpts+'</select></div>'+
    '<div class="field"><label>메모</label><textarea id="fNote" placeholder="선택">'+escapeHtml(e.note||"")+'</textarea></div>'+
    '<div class="sheet-actions">'+(editing?'<button class="btn danger" id="mDel">삭제</button>':'')+'<button class="btn gold" id="mSave">저장</button></div></div>';
  root.hidden=false;root.onclick=ev2=>{if(ev2.target===root)closeModal();};
  const q=s=>root.querySelector(s);q("#mX").onclick=closeModal;
  let selCat=e.catId,selImp=e.imp;
  q("#fCats").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{selCat=b.dataset.cat;q("#fCats").querySelectorAll(".chip").forEach(x=>x.classList.remove("sel"));b.classList.add("sel");});
  q("#fImp").querySelectorAll(".imp").forEach(b=>b.onclick=()=>{selImp=parseInt(b.dataset.imp,10);q("#fImp").querySelectorAll(".imp").forEach(x=>x.classList.remove("sel"));b.classList.add("sel");});
  const sA=q("#fAllday"),sM=q("#fMulti"),sL=q("#fAlarm");
  sA.onclick=()=>{sA.classList.toggle("on");q("#fTimes").style.display=sA.classList.contains("on")?"none":"grid";};
  sM.onclick=()=>{sM.classList.toggle("on");q("#fEndW").style.display=sM.classList.contains("on")?"flex":"none";};
  sL.onclick=()=>{sL.classList.toggle("on");q("#fAlarmW").style.display=sL.classList.contains("on")?"flex":"none";};
  q("#mSave").onclick=()=>{const title=q("#fTitle").value.trim();if(!title){toast("제목을 입력해주세요");return;}
    const allDay=sA.classList.contains("on"),multi=sM.classList.contains("on");
    const rec={id:e.id,catId:selCat,title,date:q("#fDate").value,allDay,imp:selImp,repeat:q("#fRepeat").value,tag:q("#fTag").value.trim(),note:q("#fNote").value.trim(),alarm:sL.classList.contains("on"),alarmMin:parseInt(q("#fAlarmMin").value,10)};
    if(multi){rec.endDate=q("#fEndDate").value;if(parseYmd(rec.endDate)<parseYmd(rec.date))rec.endDate=rec.date;}
    if(!allDay){rec.start=q("#fStart").value;rec.end=q("#fEnd").value;}
    const i=DB.events.findIndex(x=>x.id===e.id);if(i>=0)DB.events[i]=rec;else DB.events.push(rec);
    save();closeModal();selDate=rec.date;viewMonth=new Date(parseYmd(rec.date).getFullYear(),parseYmd(rec.date).getMonth(),1);renderHome();toast(i>=0?"수정됨":"추가됨");};
  const del=q("#mDel");if(del)del.onclick=()=>{if(confirm("“"+e.title+"” 일정을 삭제할까요?")){DB.events=DB.events.filter(x=>x.id!==e.id);save();closeModal();renderHome();toast("삭제됨");}};
}

/* ===== 루틴 / 건강 모달 ===== */
function openRoutineEditor(r,presetCadence){
  const editing=!!r;const e=r?Object.assign({},r):{id:uid(),title:"",cadence:presetCadence||"daily",time:"",catId:"health"};
  const catChips=DB.categories.map(c=>'<button type="button" class="chip'+(c.id===e.catId?" sel":"")+'" data-cat="'+c.id+'" style="color:'+c.color+'"><i class="dot" style="background:'+c.color+'"></i><span style="color:var(--text)">'+escapeHtml(c.name)+'</span></button>').join("");
  const root=document.getElementById("modalRoot");
  root.innerHTML='<div class="sheet"><div class="sheet-h"><span class="title">'+(editing?"루틴 편집":"루틴 추가")+'</span><button class="x" id="mX">×</button></div>'+
    '<div class="field"><label>제목</label><input type="text" id="rTitle" value="'+escapeHtml(e.title)+'" placeholder="예: 공복 영양제"/></div>'+
    '<div class="field"><label>주기</label><select id="rCad"><option value="daily"'+(e.cadence==="daily"?" selected":"")+'>매일 · 06:00 리셋</option><option value="weekly"'+(e.cadence==="weekly"?" selected":"")+'>매주 일반 · 월 06:00 리셋</option></select></div>'+
    '<div class="field"><label>기본 시각 (선택) — 체크 시 이 시각에 기록</label><input type="time" id="rTime" value="'+(e.time||"")+'"/></div>'+
    '<div class="field"><label>카테고리</label><div class="chips" id="rCats">'+catChips+'</div></div>'+
    '<div class="sheet-actions">'+(editing?'<button class="btn danger" id="rDel">삭제</button>':'')+'<button class="btn gold" id="rSave">저장</button></div></div>';
  root.hidden=false;root.onclick=ev=>{if(ev.target===root)closeModal();};
  const q=s=>root.querySelector(s);q("#mX").onclick=closeModal;let selCat=e.catId;
  q("#rCats").querySelectorAll(".chip").forEach(b=>b.onclick=()=>{selCat=b.dataset.cat;q("#rCats").querySelectorAll(".chip").forEach(x=>x.classList.remove("sel"));b.classList.add("sel");});
  q("#rSave").onclick=()=>{const title=q("#rTitle").value.trim();if(!title){toast("제목을 입력해주세요");return;}
    const rec={id:e.id,title,cadence:q("#rCad").value,time:q("#rTime").value||"",catId:selCat};
    const i=DB.routines.findIndex(x=>x.id===e.id);if(i>=0)DB.routines[i]=rec;else DB.routines.push(rec);
    save();closeModal();renderHome();toast(i>=0?"수정됨":"추가됨");};
  const del=q("#rDel");if(del)del.onclick=()=>{if(confirm("이 루틴을 삭제할까요?")){DB.routines=DB.routines.filter(x=>x.id!==e.id);save();closeModal();renderHome();toast("삭제됨");}};
}
function openHealthEditor(dstr){
  const rec=DB.health[dstr]||{exercised:false,type:"",diet:"",supp:""};const d=parseYmd(dstr);
  const root=document.getElementById("modalRoot");
  root.innerHTML='<div class="sheet"><div class="sheet-h"><span class="title">건강 기록 · '+(d.getMonth()+1)+'/'+d.getDate()+'</span><button class="x" id="mX">×</button></div>'+
    '<div class="toggle"><span class="lbl">운동했어요</span><div class="sw'+(rec.exercised?" on":"")+'" id="hEx"><i></i></div></div>'+
    '<div class="field" id="hTypeW" '+(rec.exercised?"":'style="display:none"')+'><label>운동 종류</label><input type="text" id="hType" value="'+escapeHtml(rec.type)+'" placeholder="예: 헬스 상체 / 러닝 5km"/></div>'+
    '<div class="field"><label>식단</label><textarea id="hDiet" placeholder="오늘 먹은 것">'+escapeHtml(rec.diet)+'</textarea></div>'+
    '<div class="field"><label>영양제</label><input type="text" id="hSupp" value="'+escapeHtml(rec.supp)+'" placeholder="예: 종합비타민, 오메가3"/></div>'+
    '<div class="sheet-actions"><button class="btn gold" id="hSave">저장</button></div></div>';
  root.hidden=false;root.onclick=ev=>{if(ev.target===root)closeModal();};
  const q=s=>root.querySelector(s);q("#mX").onclick=closeModal;
  const ex=q("#hEx");ex.onclick=()=>{ex.classList.toggle("on");q("#hTypeW").style.display=ex.classList.contains("on")?"flex":"none";};
  q("#hSave").onclick=()=>{DB.health[dstr]={exercised:ex.classList.contains("on"),type:q("#hType").value.trim(),diet:q("#hDiet").value.trim(),supp:q("#hSupp").value.trim()};save();closeModal();renderHome();toast("저장됨");};
}
function closeModal(){const r=document.getElementById("modalRoot");r.hidden=true;r.innerHTML="";r.onclick=null;}

/* ===== 허브 편집 ===== */
function openHubEdit(){
  const root=document.getElementById("modalRoot");
  const items=DB.hubBlocks.map((b,idx)=>'<div class="he-item '+(b.on?"":"off")+'">'+
    '<div class="he-move"><button data-up="'+idx+'">▲</button><button data-down="'+idx+'">▼</button></div>'+
    '<span class="lbl">'+BLOCK_NAMES[b.id]+'</span>'+
    '<div class="sw '+(b.on?"on":"")+'" data-tg="'+idx+'"><i></i></div></div>').join("");
  root.innerHTML='<div class="sheet"><div class="sheet-h"><span class="title">허브 편집</span><button class="x" id="mX">×</button></div>'+
    '<div class="sub" style="margin-bottom:12px">보일 항목을 켜고, ▲▼로 순서를 바꾸세요</div>'+items+
    '<div class="sheet-actions"><button class="btn gold" id="mDone">완료</button></div></div>';
  root.hidden=false;root.onclick=ev=>{if(ev.target===root)closeModal();};
  const q=s=>root.querySelector(s);q("#mX").onclick=closeModal;q("#mDone").onclick=closeModal;
  root.querySelectorAll("[data-tg]").forEach(s=>s.onclick=()=>{const i=+s.dataset.tg;DB.hubBlocks[i].on=!DB.hubBlocks[i].on;save();renderHub();openHubEdit();});
  root.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>{const i=+b.dataset.up;if(i>0){const a=DB.hubBlocks;const t=a[i-1];a[i-1]=a[i];a[i]=t;save();renderHub();openHubEdit();}});
  root.querySelectorAll("[data-down]").forEach(b=>b.onclick=()=>{const i=+b.dataset.down;const a=DB.hubBlocks;if(i<a.length-1){const t=a[i+1];a[i+1]=a[i];a[i]=t;save();renderHub();openHubEdit();}});
}

/* ===== 통계 ===== */
function renderStatsPage(){
  const host=document.getElementById("tab-stats");const today=dayKeyNow();
  const dr=DB.routines.filter(r=>r.cadence==="daily"),dDone=dr.filter(r=>routineState(r,today)).length;
  const wr=DB.routines.filter(r=>r.cadence==="weekly"),wDone=wr.filter(r=>routineState(r,today)).length;
  const p=wpFor(today);let wt=0,wd=0;
  DB.wowQuests.forEach(q=>{const st=p[q.id]||{};if(q.type==="counter"){wt+=q.target;wd+=Math.min(st.progress||0,q.target);}else{wt+=1;if(st.done)wd+=1;}});
  const rg=weekGenRange(today),wg=wowWeekRange(today);
  const bar=(a,b)=>{const pc=b?Math.round(a/b*100):0;return '<div class="pbar"><i style="width:'+pc+'%"></i></div>';};
  host.innerHTML='<div class="page-head"><div class="page-title">통계</div></div>'+
    '<div class="card"><div class="card-h"><span class="name">오늘 체크리스트</span><span class="sub">'+dDone+'/'+dr.length+'</span></div>'+bar(dDone,dr.length)+'</div>'+
    '<div class="card"><div class="card-h"><span class="name">이번 주 · 일반</span><span class="sub">'+mdShort(rg[0])+"~"+mdShort(rg[1])+' · '+wDone+'/'+wr.length+'</span></div>'+bar(wDone,wr.length)+'</div>'+
    '<div class="card"><div class="card-h"><span class="name">이번 주 · 와우</span><span class="sub">'+mdShort(wg[0])+"~"+mdShort(wg[1])+' · '+Math.round(wt?wd/wt*100:0)+'%</span></div>'+bar(wd,wt)+'</div>'+
    '<div class="sub" style="text-align:center;margin-top:8px">추이 그래프는 다음 단계에서</div>';
}

/* ===== 설정 ===== */
function renderSettings(){
  const host=document.getElementById("tab-settings");
  const cats=DB.categories.map(c=>'<div class="qrow"><span class="qtitle"><i class="dot" style="background:'+c.color+';margin-right:8px"></i>'+escapeHtml(c.name)+'</span><button class="btn ghost sm" data-editcat="'+c.id+'">수정</button></div>').join("");
  const routs=DB.routines.map(r=>'<div class="qrow"><span class="qtitle clip">'+escapeHtml(r.title)+' <span class="sub">· '+(r.cadence==="daily"?"매일":"주간")+(r.time?" "+r.time:"")+'</span></span><button class="btn ghost sm" data-editrt="'+r.id+'">수정</button></div>').join("");
  let wow="";
  DB.wowChars.forEach(ch=>{const qs=DB.wowQuests.filter(q=>q.charId===ch.id);
    wow+='<div class="qrow"><span class="qtitle">'+escapeHtml(ch.name)+' <span class="sub">· 퀘 '+qs.length+'</span></span><span><button class="btn ghost sm" data-addq="'+ch.id+'">＋퀘</button> <button class="btn ghost sm" data-delchar="'+ch.id+'">삭제</button></span></div>';
    qs.forEach(q=>{wow+='<div class="qrow" style="padding-left:14px"><span class="qtitle clip sub">· '+escapeHtml(q.title)+(q.type==="counter"?" ("+q.target+")":"")+'</span><button class="btn ghost sm" data-delq="'+q.id+'">×</button></div>';});});
  host.innerHTML='<div class="page-head"><div class="page-title">설정</div></div>'+
    '<div class="card"><div class="card-h"><span class="name">카테고리</span><button class="btn ghost sm" id="addCat">＋ 추가</button></div>'+cats+'<div class="sub" style="margin-top:8px">색만 정하면 어디서나 반영. \'연애\' 같은 것도 추가 가능.</div></div>'+
    '<div class="card"><div class="card-h"><span class="name">루틴 (체크리스트)</span><button class="btn ghost sm" id="addRt">＋ 추가</button></div>'+(routs||'<div class="sub">없음</div>')+'</div>'+
    '<div class="card"><div class="card-h"><span class="name">와우 캐릭터·퀘스트</span><button class="btn ghost sm" id="addChar">＋ 캐릭</button></div>'+wow+'</div>'+
    '<div class="card"><div class="card-h"><span class="name">기본 규칙</span></div>'+
      '<div class="qrow"><span class="qtitle">주 시작</span><span class="sub">일요일</span></div>'+
      '<div class="qrow"><span class="qtitle">하루 시작 / 일일 리셋</span><span class="sub">06:00</span></div>'+
      '<div class="qrow"><span class="qtitle">일반 주간 리셋</span><span class="sub">월요일 06:00</span></div>'+
      '<div class="qrow"><span class="qtitle">와우 주간 리셋</span><span class="sub">목요일 08:00</span></div>'+
      '<div class="qrow"><span class="qtitle">테마</span><span class="sub">다크 전용</span></div></div>'+
    '<div class="card"><div class="card-h"><span class="name">데이터</span></div><div class="sub" style="margin-bottom:10px">지금은 이 브라우저에만 저장돼요. 로그인·동기화는 다음 단계.</div><button class="btn danger" id="resetData">전체 초기화</button></div>';
  const q=s=>host.querySelector(s);
  q("#addCat").onclick=()=>editCat(null);
  q("#addRt").onclick=()=>openRoutineEditor(null,"daily");
  host.querySelectorAll("[data-editcat]").forEach(b=>b.onclick=()=>editCat(b.dataset.editcat));
  host.querySelectorAll("[data-editrt]").forEach(b=>b.onclick=()=>openRoutineEditor(DB.routines.find(r=>r.id===b.dataset.editrt)));
  q("#addChar").onclick=()=>{const n=prompt("캐릭터 이름");if(n&&n.trim()){DB.wowChars.push({id:uid(),name:n.trim()});save();renderSettings();}};
  host.querySelectorAll("[data-addq]").forEach(b=>b.onclick=()=>addQuest(b.dataset.addq));
  host.querySelectorAll("[data-delchar]").forEach(b=>b.onclick=()=>{if(confirm("이 캐릭터와 퀘스트를 삭제할까요?")){const id=b.dataset.delchar;DB.wowChars=DB.wowChars.filter(c=>c.id!==id);DB.wowQuests=DB.wowQuests.filter(x=>x.charId!==id);save();renderSettings();}});
  host.querySelectorAll("[data-delq]").forEach(b=>b.onclick=()=>{DB.wowQuests=DB.wowQuests.filter(x=>x.id!==b.dataset.delq);save();renderSettings();});
  q("#resetData").onclick=()=>{if(confirm("모든 데이터를 초기화할까요?")){DB=defaultData();save();toast("초기화됨");switchTab("home");}};
}
function editCat(id){
  const c=id?DB.categories.find(x=>x.id===id):{id:uid(),name:"",color:"#5b9dff"};
  const root=document.getElementById("modalRoot");
  root.innerHTML='<div class="sheet"><div class="sheet-h"><span class="title">'+(id?"카테고리 수정":"카테고리 추가")+'</span><button class="x" id="mX">×</button></div>'+
    '<div class="field"><label>이름</label><input type="text" id="cName" value="'+escapeHtml(c.name)+'" placeholder="예: 연애"/></div>'+
    '<div class="field"><label>색</label><input type="color" id="cColor" value="'+c.color+'" style="height:44px;padding:4px"/></div>'+
    '<div class="sheet-actions">'+(id&&DB.categories.length>1?'<button class="btn danger" id="cDel">삭제</button>':'')+'<button class="btn gold" id="cSave">저장</button></div></div>';
  root.hidden=false;root.onclick=ev=>{if(ev.target===root)closeModal();};
  const q=s=>root.querySelector(s);q("#mX").onclick=closeModal;
  q("#cSave").onclick=()=>{const name=q("#cName").value.trim();if(!name){toast("이름을 입력해주세요");return;}const color=q("#cColor").value;
    if(id){const cc=DB.categories.find(x=>x.id===id);cc.name=name;cc.color=color;}else DB.categories.push({id:c.id,name,color});
    save();closeModal();renderSettings();toast("저장됨");};
  const del=q("#cDel");if(del)del.onclick=()=>{if(confirm("이 카테고리를 삭제할까요? (일정은 남습니다)")){DB.categories=DB.categories.filter(x=>x.id!==id);save();closeModal();renderSettings();}};
}
function addQuest(charId){
  const root=document.getElementById("modalRoot");
  root.innerHTML='<div class="sheet"><div class="sheet-h"><span class="title">퀘스트 추가</span><button class="x" id="mX">×</button></div>'+
    '<div class="field"><label>제목</label><input type="text" id="qTitle" placeholder="예: 신화레이드 / 쐐기 / 주간퀘"/></div>'+
    '<div class="field"><label>유형</label><select id="qType"><option value="check">체크</option><option value="counter">횟수</option></select></div>'+
    '<div class="field" id="qTgtW" style="display:none"><label>목표 횟수</label><input type="number" id="qTarget" value="4" min="1"/></div>'+
    '<div class="sheet-actions"><button class="btn gold" id="qSave">추가</button></div></div>';
  root.hidden=false;root.onclick=ev=>{if(ev.target===root)closeModal();};
  const q=s=>root.querySelector(s);q("#mX").onclick=closeModal;
  q("#qType").onchange=()=>{q("#qTgtW").style.display=q("#qType").value==="counter"?"flex":"none";};
  q("#qSave").onclick=()=>{const title=q("#qTitle").value.trim();if(!title){toast("제목을 입력해주세요");return;}
    const type=q("#qType").value;const rec={id:uid(),charId,title,type};if(type==="counter")rec.target=Math.max(1,parseInt(q("#qTarget").value,10)||1);
    DB.wowQuests.push(rec);save();closeModal();renderSettings();toast("추가됨");};
}

/* ===== Nav / Toast / Boot ===== */
function switchTab(name){
  curTab=name;
  document.querySelectorAll(".tab").forEach(s=>s.hidden=s.id!=="tab-"+name);
  document.querySelectorAll("#railNav button,#tabbar button[data-tab]").forEach(b=>b.classList.toggle("active",b.dataset.tab===name));
  if(name==="home")renderHome();else if(name==="stats")renderStatsPage();else if(name==="settings")renderSettings();
}
let toastTimer=null;
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.hidden=true,2200);}
var FB={}, lastJson=null, started=false;
function render(name){ if(name==="home")renderHome(); else if(name==="stats")renderStatsPage(); else if(name==="settings")renderSettings(); }
function bindNav(){
  document.querySelectorAll("#railNav button,#tabbar button[data-tab]").forEach(function(b){ b.onclick=function(){switchTab(b.dataset.tab);}; });
  document.getElementById("fab").onclick=function(){openEditor(null,{date:selDate});};
  document.getElementById("railAdd").onclick=function(){openEditor(null,{date:selDate});};
}
function showLogin(){ document.getElementById("loginScreen").hidden=false; document.querySelector(".shell").style.display="none"; }
function showApp(){
  document.getElementById("loginScreen").hidden=true; document.querySelector(".shell").style.display="";
  FB.docRef=FB.db.doc("app/state");
  FB.docRef.onSnapshot(function(snap){
    if(!snap.exists){ DB=defaultData(); save(); return; }
    var j=snap.data().json; if(j===lastJson) return;
    lastJson=j; DB=JSON.parse(j);
    if(!started){ started=true; bindNav(); switchTab("home"); } else { render(curTab); }
  }, function(err){ toast("동기화 오류: "+(err.code||err.message)); });
}
function boot(){
  firebase.initializeApp(window.FIREBASE_CONFIG);
  FB.auth=firebase.auth(); FB.db=firebase.firestore(); FB.provider=new firebase.auth.GoogleAuthProvider();
  var lb=document.getElementById("loginBtn");
  if(lb) lb.onclick=function(){ FB.auth.signInWithRedirect(FB.provider); };
  try{ FB.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL); }catch(e){}
  FB.auth.getRedirectResult().catch(function(e){ if(e&&e.code) toast("로그인 오류: "+e.code); });
  FB.auth.onAuthStateChanged(function(user){ if(user){ showApp(); } else { showLogin(); } });
}
boot();
