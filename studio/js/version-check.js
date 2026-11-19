(async()=>{
 const key="cross-studio-version";
 async function check(){
  try{
   const r=await fetch("./version.json?ts="+Date.now(),{cache:"no-store"});
   if(!r.ok)return;
   const data=await r.json();
   const old=sessionStorage.getItem(key);
   if(old && old!==data.version){
    sessionStorage.setItem(key,data.version);
    location.reload();
    return;
   }
   sessionStorage.setItem(key,data.version);
  }catch(e){}
 }
 await check();
 setInterval(check,3000);
})();
