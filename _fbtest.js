const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const key = require("./hoojecalendar-firebase-adminsdk-fbsvc-cf845ce323.json");
initializeApp({ credential: cert(key) });
const db = getFirestore();
(async()=>{
  try{
    const ref = db.collection("_cowork_test").doc("ping");
    await ref.set({ msg:"클로드가 코워크에서 씀", at:new Date().toISOString() });
    const snap = await ref.get();
    console.log("WRITE_OK", JSON.stringify(snap.data()));
    await ref.delete();
    console.log("DELETE_OK");
  }catch(e){ console.log("FAIL", e.code||"", (e.message||"").split("\n")[0]); }
  process.exit(0);
})();
