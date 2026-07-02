const https=require("https"), crypto=require("crypto");
const key=require("./hoojecalendar-firebase-adminsdk-fbsvc-cf845ce323.json");
function b64url(b){return Buffer.from(b).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");}
function req(o,b){return new Promise((res,rej)=>{const r=https.request(o,x=>{let d="";x.on("data",c=>d+=c);x.on("end",()=>res({status:x.statusCode,body:d}));});r.on("error",rej);if(b)r.write(b);r.end();});}
async function token(scope){const now=Math.floor(Date.now()/1000);const h=b64url(JSON.stringify({alg:"RS256",typ:"JWT"}));const c=b64url(JSON.stringify({iss:key.client_email,scope,aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600}));const sig=b64url(crypto.sign("RSA-SHA256",Buffer.from(h+"."+c),key.private_key));const body="grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion="+h+"."+c+"."+sig;const r=await req({host:"oauth2.googleapis.com",path:"/token",method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Content-Length":Buffer.byteLength(body)}},body);return JSON.parse(r.body).access_token;}
const RULES=`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null && request.auth.token.email == "hooje@hooje.app";
    }
  }
}`;
(async()=>{
  const tok=await token("https://www.googleapis.com/auth/firebase.rules https://www.googleapis.com/auth/cloud-platform");
  const H={"Authorization":"Bearer "+tok,"Content-Type":"application/json"};
  // 1) ruleset 생성
  const rb=JSON.stringify({source:{files:[{name:"firestore.rules",content:RULES}]}});
  let r=await req({host:"firebaserules.googleapis.com",path:"/v1/projects/hoojecalendar/rulesets",method:"POST",headers:Object.assign({"Content-Length":Buffer.byteLength(rb)},H)},rb);
  console.log("ruleset 생성:",r.status);
  const rs=JSON.parse(r.body);
  if(!rs.name){console.log(r.body.slice(0,300));return;}
  console.log("ruleset:",rs.name);
  // 2) release 갱신 (cloud.firestore)
  const relBody=JSON.stringify({release:{name:"projects/hoojecalendar/releases/cloud.firestore",rulesetName:rs.name}});
  r=await req({host:"firebaserules.googleapis.com",path:"/v1/projects/hoojecalendar/releases/cloud.firestore",method:"PATCH",headers:Object.assign({"Content-Length":Buffer.byteLength(relBody)},H)},relBody);
  console.log("release 갱신:",r.status, r.status<300?"✅ 규칙 적용됨 (hooje@hooje.app 허용)":r.body.slice(0,300));
})();
