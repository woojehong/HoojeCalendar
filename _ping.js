const https = require("https");
function ping(host){
  return new Promise(res=>{
    const req = https.request({host,port:443,method:"HEAD",path:"/",timeout:8000}, r=>{ res(host+" -> HTTP "+r.statusCode); r.destroy(); });
    req.on("timeout", ()=>{ req.destroy(); res(host+" -> TIMEOUT"); });
    req.on("error", e=>res(host+" -> ERR "+(e.code||e.message)));
    req.end();
  });
}
(async()=>{
  const hosts=["oauth2.googleapis.com","firestore.googleapis.com","registry.npmjs.org","www.google.com"];
  for(const h of hosts) console.log(await ping(h));
})();
