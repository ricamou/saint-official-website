
const SC=window.SANCTUARY_CONFIG;
const LEVELS=[
{name:"Supporter",min:1,next:100000},{name:"Guardian",min:100000,next:500000},
{name:"Saint",min:500000,next:2000000},{name:"Archangel",min:2000000,next:10000000},
{name:"Founder",min:10000000,next:50000000},{name:"Whale",min:50000000,next:100000000},
{name:"Legend",min:100000000,next:null}
];
document.addEventListener("DOMContentLoaded",()=>{
 const form=document.getElementById("sanctuaryForm");
 if(!form)return;
 form.addEventListener("submit",async e=>{
  e.preventDefault(); const a=document.getElementById("walletAddress").value.trim();
  if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)){fail("Invalid Solana wallet address.");return}
  await verify(a);
 });
});
async function verify(address){
 scan(true); say("Let me verify this wallet on Solana...");
 try{
  const r=await fetch(SC.rpc,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"getTokenAccountsByOwner",params:[address,{mint:SC.mint},{encoding:"jsonParsed",commitment:"confirmed"}]})});
  const j=await r.json(); if(j.error)throw new Error(j.error.message);
  const accounts=j?.result?.value||[];
  const balance=accounts.reduce((s,x)=>s+Number(x?.account?.data?.parsed?.info?.tokenAmount?.uiAmountString||0),0);
  show(address,balance);
 }catch(e){console.error(e);fail("Blockchain query failed. Please try again.");}
 finally{scan(false)}
}
function show(address,balance){
 const holder=balance>0, level=getLevel(balance), result=document.getElementById("sanctuaryResult");
 text("resultWallet",address.slice(0,6)+"..."+address.slice(-6));
 text("resultBalance",new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(balance)+" SAINT");
 text("resultRank",holder?level.name:"Not a holder"); text("resultStatus",holder?"Verified Holder":"No SAINT Found");
 text("resultTitle",holder?"Wallet Verified":"No SAINT Found");
 text("resultSubtitle",holder?"Welcome to The Holders Sanctuary.":"Become a holder before entering.");
 text("statusText",holder?"Verification complete. The Sanctuary is open.":"No SAINT balance was found.");
 say(holder?"Welcome, Saint. The Sanctuary awaits.":"I could not find SAINT in this wallet yet.");
 const enter=document.getElementById("enterSanctuaryButton"), buy=document.getElementById("buySaintButton");
 if(holder){enter.href=SC.telegram;enter.target="_blank";enter.classList.remove("disabled");buy.style.display="none";result.classList.add("holder-success")}
 else{enter.href="#";enter.classList.add("disabled");buy.style.display="inline-flex";result.classList.remove("holder-success")}
 progress(balance,level); result.scrollIntoView({behavior:"smooth",block:"center"});
}
function getLevel(b){if(b<=0)return{name:"Not a holder",min:0,next:1};return[...LEVELS].reverse().find(x=>b>=x.min)||LEVELS[0]}
function progress(b,l){
 const bar=document.getElementById("holderProgressBar");
 if(b<=0){bar.style.width="0%";text("rankCurrent","No holder level");text("rankNext","Hold at least 1 SAINT");return}
 if(!l.next){bar.style.width="100%";text("rankCurrent",l.name);text("rankNext","Highest level reached");return}
 const pct=Math.max(0,Math.min(100,(b-l.min)/(l.next-l.min)*100));
 bar.style.width=pct+"%";text("rankCurrent",l.name);text("rankNext",new Intl.NumberFormat("en-US").format(Math.max(0,l.next-b))+" SAINT to next level");
}
function fail(m){scan(false);text("statusText",m);text("resultTitle","Verification Error");text("resultSubtitle",m);say("Something interrupted the verification. Please try again.")}
function scan(on){const b=document.getElementById("verifyButton"),s=document.getElementById("sanctuaryStatus");b.disabled=on;b.textContent=on?"Scanning...":"Verify Holder";s.classList.toggle("scanning",on);if(on)text("statusText","Scanning the Solana blockchain...")}
function say(m){text("guardianMessage",m)} function text(id,v){const e=document.getElementById(id);if(e)e.textContent=v}
