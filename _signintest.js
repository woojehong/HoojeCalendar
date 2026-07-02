const https=require("https");
const APIKEY="AIzaSyDmsTTLzlajXV7kqfdJK0bv7lRikLCxCec";
function httpReq(o,b){return new Promise((res,rej)=>{const r=https.request(o,x=>{let d="";x.on("data",c=>d+=c);x.on("end",()=>res({status:x.statusCode,body:d}));});r.on("error",rej);if(b)r.write(b);r.end();});}
(async()=>{
  const body=JSON.stringify({email:"hooje@hooje.app",password:"222222",returnSecureToken:true});
  const r=await httpReq({host:"identitytoolkit.googleapis.com",path:"/v1/accounts:signInWithPassword?key="+APIKEY,method:"POST",headers:{"Content-Type":"application/json","Content-Length":Buffer.byteLength(body)}},body);
  console.log("signIn status:",r.status);
  const j=JSON.parse(r.body);
  if(j.idToken) console.log("✅ 로그인 성공 · email:",j.email,"· localId:",j.localId);
  else console.log("❌ 실패:",JSON.stringify(j.error&&j.error.message||j));
})();
