// 후제 캘린더 관리자 도구 (Cowork 전용) — Firestore REST 직접 제어
const https=require("https"), crypto=require("crypto"), fs=require("fs");
const key=require("./hoojecalendar-firebase-adminsdk-fbsvc-cf845ce323.json");
const PROJECT=key.project_id;
const DOCPATH="/app/state";
function b64url(b){return Buffer.from(b).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");}
function httpReq(opts,body){return new Promise((res,rej)=>{const r=https.request(opts,x=>{let d="";x.on("data",c=>d+=c);x.on("end",()=>res({status:x.statusCode,body:d}));});r.on("error",rej);if(body)r.write(body);r.end();});}
async function token(){
  const now=Math.floor(Date.now()/1000);
  const h=b64url(JSON.stringify({alg:"RS256",typ:"JWT"}));
  const c=b64url(JSON.stringify({iss:key.client_email,scope:"https://www.googleapis.com/auth/datastore",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600}));
  const sig=b64url(crypto.sign("RSA-SHA256",Buffer.from(h+"."+c),key.private_key));
  const body="grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion="+h+"."+c+"."+sig;
  const r=await httpReq({host:"oauth2.googleapis.com",path:"/token",method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Content-Length":Buffer.byteLength(body)}},body);
  return JSON.parse(r.body).access_token;
}
async function fsCall(method,path,tok,fields){
  const p="/v1/projects/"+PROJECT+"/databases/(default)/documents"+path;
  const body=fields?JSON.stringify({fields}):null;
  const headers={"Authorization":"Bearer "+tok};
  if(body){headers["Content-Type"]="application/json";headers["Content-Length"]=Buffer.byteLength(body);}
  return httpReq({host:"firestore.googleapis.com",path:p,method,headers},body);
}
async function getState(tok){
  const r=await fsCall("GET",DOCPATH,tok);
  if(r.status===404)return null;
  const j=JSON.parse(r.body);
  return j.fields&&j.fields.json?JSON.parse(j.fields.json.stringValue):null;
}
async function putState(tok,DB){
  return fsCall("PATCH",DOCPATH,tok,{json:{stringValue:JSON.stringify(DB)},updatedAt:{stringValue:new Date().toISOString()}});
}
// --- 날짜 유틸 ---
function pad(n){return String(n).padStart(2,"0");}
function ymd(d){return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x;}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function cleanSeed(){
  return {
    categories:[{id:"personal",name:"개인",color:"#5b9dff"},{id:"health",name:"건강",color:"#46d17f"},{id:"wow",name:"와우",color:"#8788EE"},{id:"work",name:"업무",color:"#9ba1ab"},{id:"ai",name:"AI",color:"#C9A84C"}],
    events:[],
    routines:[{id:uid(),title:"공복 영양제",cadence:"daily",time:"07:00",catId:"health"},{id:uid(),title:"아침 영양제",cadence:"daily",time:"08:30",catId:"health"},{id:uid(),title:"물 2L 마시기",cadence:"daily",catId:"health"},{id:uid(),title:"영어 공부 30분",cadence:"daily",catId:"personal"},{id:uid(),title:"장보기",cadence:"weekly",catId:"personal"},{id:uid(),title:"주간 결산",cadence:"weekly",catId:"work"}],
    routineDone:{},
    wowChars:[{id:"hooje",name:"후제"},{id:"meo",name:"메오"},{id:"mago",name:"마고"},{id:"gro",name:"그로"},{id:"mutong",name:"무통"}],
    wowQuests:[{id:uid(),charId:"hooje",title:"신화레이드",type:"check"},{id:uid(),charId:"hooje",title:"쐐기",type:"counter",target:4},{id:uid(),charId:"meo",title:"신화레이드",type:"check"},{id:uid(),charId:"meo",title:"영웅레이드",type:"check"}],
    wowProgress:{},health:{},
    hubBlocks:[{id:"stats",on:true},{id:"timeline",on:true},{id:"daily",on:true},{id:"weekGeneral",on:true},{id:"weekWow",on:true},{id:"health",on:false},{id:"upcoming",on:false}]
  };
}
// --- CLI ---
(async()=>{
  const cmd=process.argv[2];
  const tok=await token();
  if(!tok){console.log("TOKEN_FAIL");return;}
  if(cmd==="seed"){
    const r=await putState(tok,cleanSeed());
    console.log("SEED",r.status);
  } else if(cmd==="show"){
    const DB=await getState(tok);
    if(!DB){console.log("상태 없음");return;}
    console.log("events:",DB.events.length,"| routines:",DB.routines.length,"| wowQuests:",DB.wowQuests.length,"| cats:",DB.categories.map(c=>c.name).join());
  } else if(cmd==="day"){
    const DB=await getState(tok);const d=process.argv[3];
    const list=DB.events.filter(e=>e.date===d||(e.endDate&&e.date<=d&&e.endDate>=d));
    console.log(d,"일정:",JSON.stringify(list.map(e=>({t:e.title,c:e.catId,s:e.start||"종일"}))));
  } else if(cmd==="testadd"){
    const DB=await getState(tok);
    const d=ymd(addDays(new Date(),1));
    DB.events.push({id:uid(),catId:"personal",title:"치과",date:d,allDay:false,start:"15:00",end:"16:00",imp:1,repeat:"none"});
    const r=await putState(tok,DB);
    console.log("TESTADD",r.status,"→ 내일("+d+") 15:00 치과 추가");
  }
})();
