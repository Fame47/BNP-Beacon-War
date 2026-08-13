
/* ============================================================
   BEACON WARS v135 · STARFLEET EXCHANGE NETWORK
   Visual + local offline economy. Multiplayer never reads this wallet.
   ============================================================ */

const BW135_EXCHANGE_KEY="beaconWarsV192Exchange";
const BW135_STARTER_REACTIONS=["hello","bringit","makeitso","livelong","gg"];
const BW135_PREMIUM_REACTIONS=["engage","letsfly","klingons_do_not","fascinating"];
let bw135ShopTab=0;
let bw135ExchangeTimer=null;
let bw135CurrentFeaturedId="bundle_klingon";

function bw135PremiumReactionSvg(kind){
  const isV=kind==="fascinating";
  const text=isV?"FASCINATING":"KLINGONS DO NOT!";
  const bg=isV?"#e7df22":"#17120c";
  const border=isV?"#e71919":"#5b3817";
  const fg=isV?"#101010":"#ffffff";
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 260"><rect x="45" y="45" rx="24" ry="24" width="510" height="135" fill="${bg}" stroke="${border}" stroke-width="18"/><path d="M210 176 L245 232 L275 178" fill="${bg}" stroke="${border}" stroke-width="15"/><text x="300" y="130" text-anchor="middle" font-family="Impact,Arial Black,sans-serif" font-size="62" fill="${fg}">${text}</text></svg>`;
  return "data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(svg);
}

/* Economy/Prestige title assets are already in the build. Register them. */
Object.assign(PROFILE_TITLE_ASSETS,{
  private_captain:"TITLE_PRIVATE_CAPTAIN.png",
  profit_commander:"TITLE_PROFIT_COMMANDER.png",
  enterprise_owner:"TITLE_ENTERPRISE_OWNER.png",
  galactic_financier:"TITLE_GALACTIC_FINANCIER.png",
  armada_owner:"TITLE_ARMADA_OWNER.png"
});
Object.assign(PROFILE_TITLE_NAMES,{
  private_captain:"PRIVATE CAPTAIN",
  profit_commander:"PROFIT COMMANDER",
  enterprise_owner:"ENTERPRISE OWNER",
  galactic_financier:"GALACTIC FINANCIER",
  armada_owner:"ARMADA OWNER"
});

/* Colored reactions are separate collectible variants. */
const BW135_REACTION_VARIANTS={
  hello_red:{label:"HELLO · RED",asset:"REACTION_HELLO_RED.png"},
  hello_yellow:{label:"HELLO · YELLOW",asset:"REACTION_HELLO_YELLOW.png"},
  bringit_red:{label:"BRING IT! · RED",asset:"REACTION_BRINGIT_RED.png"},
  bringit_yellow:{label:"BRING IT! · YELLOW",asset:"REACTION_BRINGIT_YELLOW.png"},
  makeitso_red:{label:"MAKE IT SO · RED",asset:"REACTION_MAKEITSO_RED.png"},
  makeitso_yellow:{label:"MAKE IT SO · YELLOW",asset:"REACTION_MAKEITSO_YELLOW.png"},
  livelong_red:{label:"LIVE LONG & PROSPER · RED",asset:"REACTION_LIVELONG_RED.png"},
  livelong_yellow:{label:"LIVE LONG & PROSPER · YELLOW",asset:"REACTION_LIVELONG_YELLOW.png"},
  gg_red:{label:"GG · RED",asset:"REACTION_GG_RED.png"},
  gg_yellow:{label:"GG · YELLOW",asset:"REACTION_GG_YELLOW.png"},
  klingons_do_not:{label:"KLINGONS DO NOT!",asset:"SHOP_REACTION_KLINGONS_DO_NOT.png"},
  fascinating:{label:"FASCINATING",asset:"SHOP_REACTION_FASCINATING.png"}
};
Object.assign(BW119_REACTIONS,BW135_REACTION_VARIANTS);
Object.assign(BW110_REACTIONS,Object.fromEntries(Object.entries(BW135_REACTION_VARIANTS).map(([id,r])=>[id,r.asset])));

function bw135ReadExchange(){
  const fallback={credits:0,owned:[]};
  try{
    const raw=JSON.parse(localStorage.getItem(BW135_EXCHANGE_KEY)||"null");
    if(raw && typeof raw==="object"){
      return {
        credits:Math.max(0,Number(raw.credits)||0),
        owned:Array.isArray(raw.owned)?[...new Set(raw.owned.map(String))]:[]
      };
    }
  }catch(err){}
  return fallback;
}
function bw135SaveExchange(state){
  state.credits=Math.max(0,Math.floor(Number(state.credits)||0));
  state.owned=[...new Set((state.owned||[]).map(String))];
  try{localStorage.setItem(BW135_EXCHANGE_KEY,JSON.stringify(state));}catch(err){}
  return state;
}
function bw135Owns(flag){return bw135ReadExchange().owned.includes(flag);}
function bw135ReactionOwned(id){
  return BW135_STARTER_REACTIONS.includes(id) || bw135Owns("reaction:"+id);
}
window.bw135Owns=bw135Owns;

const BW135_SHOP_ITEMS={
  bundle_klingon:{id:"bundle_klingon",type:"bundle",name:"KLINGON BUNDLE",price:2500,poster:"SHOP_BUNDLE_KLINGON.png",description:"BLUE + RED COMMANDER · KLINGONS DO NOT! · ARMADA OWNER · KLINGON FRAME · PROFILE PHOTO",grants:["bundle:klingon","reaction:klingons_do_not","title:armada_owner","frame:klingon","photo:commander_klingon"]},
  bundle_vulcan:{id:"bundle_vulcan",type:"bundle",name:"VULCAN BUNDLE",price:2500,poster:"SHOP_BUNDLE_VULCAN.png",description:"BLUE + RED COMMANDER · FASCINATING · PRIVATE CAPTAIN · VULCAN FRAME · PROFILE PHOTO",grants:["bundle:vulcan","reaction:fascinating","title:private_captain","frame:vulcan","photo:commander_vulcan"]},

  frame_vulcan:{id:"frame_vulcan",type:"frame",name:"VULCAN FRAME",price:300,frameKind:"vulcan",asset:"SHOP_FRAME_VULCAN.png",grants:["frame:vulcan"]},
  frame_klingon:{id:"frame_klingon",type:"frame",name:"KLINGON FRAME",price:300,frameKind:"klingon",asset:"SHOP_FRAME_KLINGON.png",grants:["frame:klingon"]},
  frame_commodore:{id:"frame_commodore",type:"frame",name:"COMMODORE FRAME",price:300,asset:"PROFILE_CANVAS_FRAME_COMMODORE.png",bundleOnly:true,description:"STARFLEET OFFICER BUNDLE"},

  title_galactic_financier:{id:"title_galactic_financier",type:"title",name:"GALACTIC FINANCIER",price:500,asset:"TITLE_GALACTIC_FINANCIER.png",titleId:"galactic_financier",grants:["title:galactic_financier"]},
  title_private_captain:{id:"title_private_captain",type:"title",name:"PRIVATE CAPTAIN",price:500,asset:"TITLE_PRIVATE_CAPTAIN.png",titleId:"private_captain",grants:["title:private_captain"]},
  title_profit_commander:{id:"title_profit_commander",type:"title",name:"PROFIT COMMANDER",price:500,asset:"TITLE_PROFIT_COMMANDER.png",titleId:"profit_commander",grants:["title:profit_commander"]},
  title_enterprise_owner:{id:"title_enterprise_owner",type:"title",name:"ENTERPRISE OWNER",price:1000,asset:"TITLE_ENTERPRISE_OWNER.png",titleId:"enterprise_owner",grants:["title:enterprise_owner"]},
  title_armada_owner:{id:"title_armada_owner",type:"title",name:"ARMADA OWNER",price:1000,asset:"TITLE_ARMADA_OWNER.png",titleId:"armada_owner",grants:["title:armada_owner"]},

  reaction_engage:{id:"reaction_engage",type:"reaction",reactionId:"engage",name:"ENGAGE!",price:500,asset:"REACTION_ENGAGE_YELLOW.png",premium:true,grants:["reaction:engage"]},
  reaction_letsfly:{id:"reaction_letsfly",type:"reaction",reactionId:"letsfly",name:"LET'S FLY!",price:500,asset:"REACTION_LETSFLY_YELLOW.png",premium:true,grants:["reaction:letsfly"]},
  reaction_klingons:{id:"reaction_klingons",type:"reaction",reactionId:"klingons_do_not",name:"KLINGONS DO NOT!",price:500,premiumKind:"klingon",asset:"SHOP_REACTION_KLINGONS_DO_NOT.png",premium:true,grants:["reaction:klingons_do_not"]},
  reaction_fascinating:{id:"reaction_fascinating",type:"reaction",reactionId:"fascinating",name:"FASCINATING",price:500,premiumKind:"fascinating",asset:"SHOP_REACTION_FASCINATING.png",premium:true,grants:["reaction:fascinating"]},

  reaction_hello_red:{id:"reaction_hello_red",type:"reaction",reactionId:"hello_red",name:"HELLO · RED",price:100,asset:"REACTION_HELLO_RED.png",grants:["reaction:hello_red"]},
  reaction_hello_yellow:{id:"reaction_hello_yellow",type:"reaction",reactionId:"hello_yellow",name:"HELLO · YELLOW",price:100,asset:"REACTION_HELLO_YELLOW.png",grants:["reaction:hello_yellow"]},
  reaction_bringit_red:{id:"reaction_bringit_red",type:"reaction",reactionId:"bringit_red",name:"BRING IT! · RED",price:100,asset:"REACTION_BRINGIT_RED.png",grants:["reaction:bringit_red"]},
  reaction_bringit_yellow:{id:"reaction_bringit_yellow",type:"reaction",reactionId:"bringit_yellow",name:"BRING IT! · YELLOW",price:100,asset:"REACTION_BRINGIT_YELLOW.png",grants:["reaction:bringit_yellow"]},
  reaction_makeitso_red:{id:"reaction_makeitso_red",type:"reaction",reactionId:"makeitso_red",name:"MAKE IT SO · RED",price:100,asset:"REACTION_MAKEITSO_RED.png",grants:["reaction:makeitso_red"]},
  reaction_makeitso_yellow:{id:"reaction_makeitso_yellow",type:"reaction",reactionId:"makeitso_yellow",name:"MAKE IT SO · YELLOW",price:100,asset:"REACTION_MAKEITSO_YELLOW.png",grants:["reaction:makeitso_yellow"]},
  reaction_livelong_red:{id:"reaction_livelong_red",type:"reaction",reactionId:"livelong_red",name:"LIVE LONG · RED",price:100,asset:"REACTION_LIVELONG_RED.png",grants:["reaction:livelong_red"]},
  reaction_livelong_yellow:{id:"reaction_livelong_yellow",type:"reaction",reactionId:"livelong_yellow",name:"LIVE LONG · YELLOW",price:100,asset:"REACTION_LIVELONG_YELLOW.png",grants:["reaction:livelong_yellow"]},
  reaction_gg_red:{id:"reaction_gg_red",type:"reaction",reactionId:"gg_red",name:"GG · RED",price:100,asset:"REACTION_GG_RED.png",grants:["reaction:gg_red"]},
  reaction_gg_yellow:{id:"reaction_gg_yellow",type:"reaction",reactionId:"gg_yellow",name:"GG · YELLOW",price:100,asset:"REACTION_GG_YELLOW.png",grants:["reaction:gg_yellow"]}
};

const BW135_FEATURED_ROTATION=["bundle_klingon","bundle_vulcan","reaction_engage","reaction_letsfly","reaction_klingons","reaction_fascinating"];
const BW135_TITLE_ROTATION=["title_galactic_financier","title_private_captain","title_profit_commander","title_enterprise_owner","title_armada_owner"];
const BW135_COLOR_REACTIONS=["reaction_bringit_red","reaction_bringit_yellow","reaction_makeitso_red","reaction_makeitso_yellow","reaction_livelong_red","reaction_livelong_yellow","reaction_hello_red","reaction_hello_yellow","reaction_gg_red","reaction_gg_yellow"];

function bw135LocalSlot(){return Math.floor(new Date().getHours()/2);}
function bw135RotationIndex(){return bw135LocalSlot()+3;}
function bw135NextExchangeTime(){
  const now=new Date();
  const next=new Date(now);
  const nextHour=(Math.floor(now.getHours()/2)+1)*2;
  if(nextHour>=24){next.setDate(next.getDate()+1);next.setHours(0,0,0,0);}
  else next.setHours(nextHour,0,0,0);
  return next;
}
function bw135FeaturedPrice(item){return item.type==="bundle"?1500:Math.round(item.price*.70);}
function bw135ItemOwned(item){
  if(!item) return false;
  if(item.type==="bundle") return bw135Owns("bundle:"+(item.id==="bundle_klingon"?"klingon":"vulcan"));
  if(item.reactionId) return bw135ReactionOwned(item.reactionId);
  if(item.titleId) return bw135Owns("title:"+item.titleId);
  if(item.frameKind) return bw135Owns("frame:"+item.frameKind);
  return Array.isArray(item.grants) && item.grants.length>0 && item.grants.every(bw135Owns);
}

function bw135GrantFlags(flags=[]){
  const s=bw135ReadExchange();
  const set=new Set(s.owned);
  flags.forEach(f=>set.add(f));
  s.owned=[...set];
  bw135SaveExchange(s);

  const data=getPlayerProfileData();
  const bundles=new Set(Array.isArray(data.ownedBundles)?data.ownedBundles:[]);
  if(set.has("bundle:klingon")) bundles.add("klingon_bundle");
  if(set.has("bundle:vulcan")) bundles.add("vulcan_bundle");
  data.ownedBundles=[...bundles];
  savePlayerProfileData(data);
}

function bw135BuyShopItem(itemId,overridePrice=null){
  const item=BW135_SHOP_ITEMS[itemId];
  if(!item || item.bundleOnly) return;
  if(bw135ItemOwned(item)){bw135ShopMessage("ITEM ALREADY OWNED");return;}
  const cost=overridePrice==null?item.price:Number(overridePrice);
  const state=bw135ReadExchange();
  if(state.credits<cost){bw135ShopMessage("INSUFFICIENT CREDITS");return;}
  state.credits-=cost;
  bw135SaveExchange(state);
  bw135GrantFlags(item.grants||[]);
  bw135ShopMessage(item.name+" ACQUIRED");
  if(typeof playSound==="function") playSound("beep",{volume:.5});
  bw135RefreshShop();
  if(typeof loadPlayerProfile==="function") loadPlayerProfile();
  if(typeof bw119RenderProfileReactions==="function") bw119RenderProfileReactions();
}
window.bw135BuyShopItem=bw135BuyShopItem;

function bw135ShopMessage(text){
  const el=document.getElementById("shopStatusLine");
  if(el) el.textContent=String(text||"");
}

function bw135RenderProfilePreview(){
  const data=getPlayerProfileData();
  const icon=document.getElementById("shopPreviewIcon");
  const frame=document.getElementById("shopPreviewFrame");
  if(typeof applyProfileBadge==="function") applyProfileBadge(icon,frame,data);
  const call=document.getElementById("shopPreviewCallsign");
  if(call) call.textContent=(data.callsign||"CADET").toUpperCase();
  const badge=document.getElementById("shopPreviewTitle");
  const txt=document.getElementById("shopPreviewTitleText");
  const asset=PROFILE_TITLE_ASSETS[data.title]||"";
  const title=PROFILE_TITLE_NAMES[data.title]||"CADET";
  if(badge){if(asset){badge.src=asset;badge.alt=title;badge.style.display="block";}else{badge.style.display="none";}}
  if(txt){txt.textContent=title;txt.style.display=asset?"none":"block";}
  const bal=document.getElementById("shopCreditBalance");
  if(bal) bal.textContent=bw135ReadExchange().credits.toLocaleString();
}

function bw135FeatureVisual(item){
  if(item.poster) return `<img src="${item.poster}" alt="${item.name}">`;
  if(item.type==="reaction") return `<div class="feature-reaction-card"><img src="${item.asset}" alt="${item.name}"></div>`;
  if(item.asset) return `<img src="${item.asset}" alt="${item.name}">`;
  return `<div>${item.name}</div>`;
}
function bw135RenderFeatured(){
  const idx=bw135RotationIndex()%BW135_FEATURED_ROTATION.length;
  bw135CurrentFeaturedId=BW135_FEATURED_ROTATION[idx];
  const item=BW135_SHOP_ITEMS[bw135CurrentFeaturedId];
  const price=bw135FeaturedPrice(item);
  const visual=document.getElementById("shopFeaturedVisual");if(visual)visual.innerHTML=bw135FeatureVisual(item);
  const name=document.getElementById("shopFeaturedName");if(name)name.textContent=item.name;
  const old=document.getElementById("shopFeaturedOldPrice");if(old)old.innerHTML=`<strong>${item.price}</strong> <s>CREDITS</s>`;
  const now=document.getElementById("shopFeaturedPrice");if(now)now.innerHTML=`${price} <span>CREDITS</span>`;
  const buy=document.getElementById("shopFeaturedBuy");
  if(buy){
    const owned=bw135ItemOwned(item);
    buy.disabled=owned;
    buy.textContent=owned?"OWNED":`PURCHASE · ${price} CREDITS`;
    buy.onclick=()=>bw135BuyShopItem(item.id,price);
  }
}

function bw135BundleCard(item){
  const owned=bw135ItemOwned(item);
  return `<article class="shop-item-card bundle-card ${owned?"owned":""}" onclick="bw135BuyShopItem('${item.id}')">
    <div class="shop-item-thumb"><img src="${item.poster}" alt="${item.name}"></div>
    <div class="shop-item-copy"><strong>${item.name}</strong><small>${item.description}</small></div>
    <div class="shop-item-price ${owned?"shop-item-owned":""}">${owned?"OWNED":item.price}<span>${owned?"":"CREDITS"}</span></div>
  </article>`;
}
function bw135RenderBundles(){
  const panel=document.getElementById("shopPanelBundles");if(!panel)return;
  const ids=(bw135RotationIndex()%2===0)?["bundle_klingon","bundle_vulcan"]:["bundle_vulcan","bundle_klingon"];
  panel.innerHTML=`<div class="shop-item-list">${ids.map(id=>bw135BundleCard(BW135_SHOP_ITEMS[id])).join("")}</div>`;
}

function bw135FrameVisual(item){
  if(item.asset) return `<img src="${item.asset}" alt="${item.name}">`;
  return `<div class="shop-frame-placeholder ${item.frameKind}"></div>`;
}
function bw135RenderFrames(){
  const panel=document.getElementById("shopPanelFrames");if(!panel)return;
  let ids=["frame_vulcan","frame_klingon","frame_commodore"];
  const rot=bw135RotationIndex()%ids.length;ids=ids.slice(rot).concat(ids.slice(0,rot));
  panel.innerHTML=`<div class="shop-frame-grid">${ids.map(id=>{
    const item=BW135_SHOP_ITEMS[id];const owned=bw135ItemOwned(item);
    return `<article class="shop-frame-card ${owned?"owned":""}" onclick="${item.bundleOnly?"bw135ShopMessage('COMMODORE FRAME · STARFLEET OFFICER BUNDLE')":`bw135BuyShopItem('${id}')`}">
      <div class="shop-frame-preview">${bw135FrameVisual(item)}</div>
      <strong>${item.name}</strong>
      <div class="frame-price">${owned?"OWNED":(item.bundleOnly?"BUNDLE":item.price)}<span>${item.bundleOnly?"STARFLEET OFFICER":(owned?"":"CREDITS")}</span></div>
    </article>`;
  }).join("")}</div>`;
}

function bw135RenderTitles(){
  const panel=document.getElementById("shopPanelTitles");if(!panel)return;
  const shift=bw135RotationIndex()%BW135_TITLE_ROTATION.length;
  const ids=BW135_TITLE_ROTATION.slice(shift).concat(BW135_TITLE_ROTATION.slice(0,shift));
  panel.innerHTML=`<div class="shop-title-list">${ids.map(id=>{
    const item=BW135_SHOP_ITEMS[id];const owned=bw135ItemOwned(item);
    return `<article class="shop-title-row ${owned?"owned":""}" onclick="bw135BuyShopItem('${id}')">
      <img src="${item.asset}" alt="${item.name}"><div class="price">${owned?"OWNED":item.price}</div><div class="credits">${owned?"":"CREDITS"}</div>
    </article>`;
  }).join("")}</div>`;
}

function bw135ReactionSign(item){
  return `<img src="${item.asset}" alt="${item.name}">`;
}
function bw135RenderReactions(){
  const panel=document.getElementById("shopPanelReactions");if(!panel)return;
  const premiumSets=[["reaction_klingons","reaction_fascinating"],["reaction_engage","reaction_letsfly"]];
  const pair=premiumSets[bw135RotationIndex()%2];
  const start=(bw135RotationIndex()*4)%BW135_COLOR_REACTIONS.length;
  const colors=[];for(let i=0;i<4;i++)colors.push(BW135_COLOR_REACTIONS[(start+i)%BW135_COLOR_REACTIONS.length]);
  const ids=pair.concat(colors);
  panel.innerHTML=`<div class="shop-reaction-grid">${ids.map(id=>{
    const item=BW135_SHOP_ITEMS[id];const owned=bw135ItemOwned(item);
    return `<article class="shop-reaction-card ${owned?"owned":""}" onclick="bw135BuyShopItem('${id}')">
      <div>${bw135ReactionSign(item)}</div><div class="reaction-price">${owned?"OWNED":item.price}</div><div class="reaction-credits">${owned?"":"CREDITS"}</div>
    </article>`;
  }).join("")}</div>`;
}

function bw135RenderCatalog(){bw135RenderBundles();bw135RenderFrames();bw135RenderTitles();bw135RenderReactions();}
function bw135ShowShopTab(index){
  bw135ShopTab=Math.max(0,Math.min(3,Number(index)||0));
  const track=document.getElementById("shopCatalogTrack");if(track)track.style.transform=`translateX(-${bw135ShopTab*25}%)`;
  document.querySelectorAll("#shop .exchange-tab").forEach((b,i)=>{b.classList.toggle("active",i===bw135ShopTab);b.setAttribute("aria-selected",i===bw135ShopTab?"true":"false");});
}
window.bw135ShowShopTab=bw135ShowShopTab;

function bw135TickExchange(){
  const now=new Date();const next=bw135NextExchangeTime();let ms=Math.max(0,next-now);
  const h=Math.floor(ms/3600000);ms-=h*3600000;const m=Math.floor(ms/60000);ms-=m*60000;const s=Math.floor(ms/1000);
  const timer=document.getElementById("shopExchangeTimer");if(timer)timer.textContent=[h,m,s].map(v=>String(v).padStart(2,"0")).join(":");
  if(ms<1200){setTimeout(()=>bw135RefreshShop(),1300);}
}
function bw135RefreshShop(){bw135RenderProfilePreview();bw135RenderFeatured();bw135RenderCatalog();bw135ShowShopTab(bw135ShopTab);bw135TickExchange();}
window.bw135RefreshShop=bw135RefreshShop;

/* Shop-owned prestige titles become usable in Player Profile. */
const BW135_isProfileTitleUnlocked=isProfileTitleUnlocked;
isProfileTitleUnlocked=function(titleId,stats=getPlayerStats()){
  if(["private_captain","profit_commander","enterprise_owner","galactic_financier","armada_owner"].includes(titleId)) return bw135Owns("title:"+titleId);
  return BW135_isProfileTitleUnlocked(titleId,stats);
};
const BW135_profileTitleRequirement=profileTitleRequirement;
profileTitleRequirement=function(titleId){
  if(["private_captain","profit_commander","enterprise_owner","galactic_financier","armada_owner"].includes(titleId)) return bw135Owns("title:"+titleId)?"Exchange purchase · Owned":"Starfleet Exchange purchase";
  return BW135_profileTitleRequirement(titleId);
};

/* Starter reactions stay free. Shop reactions are visible but locked until owned. */
const BW135_bw119EnsureProfileData=bw119EnsureProfileData;
bw119EnsureProfileData=function(){
  const data=BW135_bw119EnsureProfileData();
  data.equippedReactions=(data.equippedReactions||[]).filter(bw135ReactionOwned).slice(0,5);
  if(!data.equippedReactions.length) data.equippedReactions=[...BW119_DEFAULT_EQUIPPED];
  savePlayerProfileData(data);return data;
};
bw119RenderProfileReactions=function(){
  const data=bw119EnsureProfileData();const equipped=data.equippedReactions;
  const slots=document.getElementById("profileEquippedReactionSlots");const library=document.getElementById("profileReactionLibrary");const chip=document.getElementById("profileReactionCountChip");
  if(chip)chip.textContent=`${equipped.length} / 5 EQUIPPED`;
  if(slots){slots.innerHTML=Array.from({length:5},(_,i)=>{const id=equipped[i];if(!id)return `<div class="reaction-equipped-slot empty">EMPTY SLOT</div>`;const r=BW119_REACTIONS[id];return `<button class="reaction-equipped-slot" type="button" onclick="bw119ToggleReaction('${id}')"><img src="${r.asset}" alt="${r.label}"></button>`;}).join("");}
  if(library){library.innerHTML=Object.entries(BW119_REACTIONS).map(([id,r])=>{const owned=bw135ReactionOwned(id);const active=equipped.includes(id);const maxed=equipped.length>=5&&!active;return `<button class="reaction-library-card ${active?"equipped":""} ${owned?"":"locked"}" type="button" ${(maxed||!owned)?"disabled":""} onclick="bw119ToggleReaction('${id}')"><img src="${r.asset}" alt="${r.label}"><span>${r.label}</span><b>${!owned?"SHOP":(active?"EQUIPPED":(maxed?"5/5":"EQUIP"))}</b></button>`;}).join("");}
};
bw119ToggleReaction=function(id){
  if(!BW119_REACTIONS[id]||!bw135ReactionOwned(id))return;
  const data=bw119EnsureProfileData();let eq=[...data.equippedReactions];const at=eq.indexOf(id);if(at>=0)eq.splice(at,1);else{if(eq.length>=5)return;eq.push(id);}data.equippedReactions=eq;savePlayerProfileData(data);if(typeof playSound==="function")playSound("beep",{volume:.42});bw119RenderProfileReactions();bw119RenderBattleReactionPicker();
};
window.bw119ToggleReaction=bw119ToggleReaction;

/* Preserve the exact starter loadout for new profiles. */
window.bw135ResetStarterReactions=function(){const d=getPlayerProfileData();d.equippedReactions=[...BW119_DEFAULT_EQUIPPED];savePlayerProfileData(d);bw119RenderProfileReactions();};

/* Open the real Exchange instead of the old placeholder modal. */
openShopMenu=function(){showScreen("shop");bw135RefreshShop();};

window.addEventListener("DOMContentLoaded",()=>{
  bw135RefreshShop();
  if(bw135ExchangeTimer)clearInterval(bw135ExchangeTimer);
  bw135ExchangeTimer=setInterval(bw135TickExchange,1000);
  if(typeof bw119RenderProfileReactions==="function")bw119RenderProfileReactions();
  if(typeof updateProfileSelectionButtons==="function")updateProfileSelectionButtons(getPlayerProfileData());
});
