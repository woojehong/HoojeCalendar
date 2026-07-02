const https=require("https"), crypto=require("crypto");
const key=require("./hoojecalendar-firebase-adminsdk-fbsvc-cf845ce323.json");
function b64url(b){return Buffer.from(b).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");}
function httpReq(o,b){return new Promise((res,rej)=>{const r=https.request(o,x=>{let d="";x.on("data",c=>d+=c);x.on("end",()=>res({status:x.statusCode,body:d}));});r.on("error",rej);if(b)r.write(b);r.end();});}
async function token(scope){
  const now=Math.floor(Date.now()/1000);
  const h=b64url(JSON.stringify({alg:"RS256",typ:"JWT"}));
  const c=b64url(JSON.stringify({iss:key.client_email,scope,aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600}));
  const sig=b64url(crypto.sign("RSA-SHA256",Buffer.from(h+"."+c),key.private_key));
  const body="grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion="+h+"."+c+"."+sig;
  const r=await httpReq({host:"oauth2.googleapis.com",path:"/token",method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Content-Length":Buffer.byteLength(body)}},body);
  return JSON.parse(r.body).access_token;
}
(async()=>{
  const tok=await token("https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/cloud-platform");
  if(!tok){console.log("토큰 실패");return;}
  const body=JSON.stringify({email:"hooje@hooje.app",password:"222222"});
  const r=await httpReq({host:"identitytoolkit.googleapis.com",path:"/v1/projects/hoojecalendar/accounts",method:"POST",headers:{"Authorization":"Bearer "+tok,"Content-Type":"application/json","Content-Length":Buffer.byteLength(body)}},body);
  console.log("계정생성:",r.status);
  const j=JSON.parse(r.body);
  if(j.localId) console.log("성공 · uid:",j.localId,"· email: hooje@hooje.app");
  else console.log(r.body.slice(0,300));
})();
