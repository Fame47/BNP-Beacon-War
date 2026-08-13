/* ============================================================
   BEACON WARS v136 · EXCHANGE ECONOMY + SHOP UNLOCKS
   Wires purchased content into profile/setup and maintains the
   zero-credit clean-launch wallet.
   ============================================================ */

const BW136_EXCHANGE_KEY="beaconWarsV192Exchange";

/* Clean launch wallet: every new account starts at zero credits. */
bw135ReadExchange=function(){
  const fallback={credits:0,owned:[]};
  try{
    const raw=JSON.parse(localStorage.getItem(BW136_EXCHANGE_KEY)||"null");
    if(raw && typeof raw==="object"){
      return {
        credits:Math.max(0,Math.floor(Number(raw.credits)||0)),
        owned:Array.isArray(raw.owned)?[...new Set(raw.owned.map(String))]:[]
      };
    }
  }catch(err){}
  return fallback;
};

bw135SaveExchange=function(state){
  state=state||{};
  const clean={
    credits:Math.max(0,Math.floor(Number(state.credits)||0)),
    owned:[...new Set((Array.isArray(state.owned)?state.owned:[]).map(String))]
  };
  try{localStorage.setItem(BW136_EXCHANGE_KEY,JSON.stringify(clean));}catch(err){}
  return clean;
};

/* Refresh displays only; purchases remain debited from the clean-launch wallet. */
bw135RefreshShop=function(){
  bw135RenderProfilePreview();
  bw135RenderFeatured();
  bw135RenderCatalog();
  bw135ShowShopTab(bw135ShopTab);
  bw135TickExchange();
};
window.bw135RefreshShop=bw135RefreshShop;

/* Real uploaded Exchange art. */
BW135_REACTION_VARIANTS.klingons_do_not.asset="SHOP_REACTION_KLINGONS_DO_NOT.png";
BW135_REACTION_VARIANTS.fascinating.asset="SHOP_REACTION_FASCINATING.png";
BW110_REACTIONS.klingons_do_not="SHOP_REACTION_KLINGONS_DO_NOT.png";
BW110_REACTIONS.fascinating="SHOP_REACTION_FASCINATING.png";
if(BW119_REACTIONS.klingons_do_not) BW119_REACTIONS.klingons_do_not.asset="SHOP_REACTION_KLINGONS_DO_NOT.png";
if(BW119_REACTIONS.fascinating) BW119_REACTIONS.fascinating.asset="SHOP_REACTION_FASCINATING.png";
BW135_SHOP_ITEMS.reaction_klingons.asset="SHOP_REACTION_KLINGONS_DO_NOT.png";
BW135_SHOP_ITEMS.reaction_fascinating.asset="SHOP_REACTION_FASCINATING.png";
BW135_SHOP_ITEMS.frame_vulcan.asset="SHOP_FRAME_VULCAN.png";
BW135_SHOP_ITEMS.frame_klingon.asset="SHOP_FRAME_KLINGON.png";

/* Register the two purchased frames everywhere the identity system is used. */
PROFILE_FRAME_ASSETS.vulcan="SHOP_FRAME_VULCAN.png";
PROFILE_FRAME_ASSETS.klingon="SHOP_FRAME_KLINGON.png";
PROFILE_FRAME_NAMES.vulcan="VULCAN";
PROFILE_FRAME_NAMES.klingon="KLINGON";

const BW136_bw127FrameRule=bw127FrameRule;
bw127FrameRule=function(frameId,stats=getPlayerStats()){
  if(frameId==="vulcan"){
    const owned=bw135Owns("frame:vulcan");
    return {unlocked:owned,requirement:"Starfleet Exchange · Vulcan Frame",progress:owned?"OWNED":"SHOP"};
  }
  if(frameId==="klingon"){
    const owned=bw135Owns("frame:klingon");
    return {unlocked:owned,requirement:"Starfleet Exchange · Klingon Frame",progress:owned?"OWNED":"SHOP"};
  }
  return BW136_bw127FrameRule(frameId,stats);
};

const BW136_isProfileFrameUnlocked=isProfileFrameUnlocked;
isProfileFrameUnlocked=function(frameId,stats=getPlayerStats()){
  if(frameId==="vulcan") return bw135Owns("frame:vulcan");
  if(frameId==="klingon") return bw135Owns("frame:klingon");
  return BW136_isProfileFrameUnlocked(frameId,stats);
};

/* Insert the two new frame choices into Customization once. */
function bw136InstallShopFrameChoices(){
  const gallery=document.querySelector("#playerProfile .profile-frame-gallery");
  if(!gallery || gallery.querySelector('[data-profile-frame="vulcan"]')) return;
  const none=gallery.querySelector('[data-profile-frame="none"]');
  const html=`
    <button class="profile-frame-choice shop-bundle-frame" data-profile-frame="vulcan" type="button"
            onclick="selectProfileFrame('vulcan')" title="VULCAN">
      <img src="SHOP_FRAME_VULCAN.png" alt="VULCAN profile frame">
      <span>VULCAN</span><b>SELECT</b>
    </button>
    <button class="profile-frame-choice shop-bundle-frame" data-profile-frame="klingon" type="button"
            onclick="selectProfileFrame('klingon')" title="KLINGON">
      <img src="SHOP_FRAME_KLINGON.png" alt="KLINGON profile frame">
      <span>KLINGON</span><b>SELECT</b>
    </button>`;
  if(none) none.insertAdjacentHTML("beforebegin",html);
  else gallery.insertAdjacentHTML("beforeend",html);

  const chip=document.querySelector("#profilePanelCustomization .profile-chip");
  if(chip) chip.textContent="16 PHOTOS + 18 FRAMES";
}

/* Bundle commanders + matching profile photos are real Shop unlocks now. */
function bw136BundleForCommander(id){
  if(id==="vulcan" || id==="commander_vulcan") return "vulcan";
  if(id==="klingon" || id==="commander_klingon") return "klingon";
  return "";
}
function bw136BundleOwned(kind){return !!kind && bw135Owns("bundle:"+kind);}

const BW136_selectProfileIcon=selectProfileIcon;
selectProfileIcon=function(iconId){
  const bundle=bw136BundleForCommander(iconId);
  if(bundle && !bw136BundleOwned(bundle)){
    bw135ShopMessage(bundle.toUpperCase()+" BUNDLE REQUIRED");
    return;
  }
  return BW136_selectProfileIcon(iconId);
};

const BW136_updateProfileSelectionButtons=updateProfileSelectionButtons;
updateProfileSelectionButtons=function(data){
  bw136InstallShopFrameChoices();
  BW136_updateProfileSelectionButtons(data);

  ["vulcan","klingon"].forEach(kind=>{
    const btn=document.querySelector(`[data-profile-icon="commander_${kind}"]`);
    if(!btn) return;
    const owned=bw136BundleOwned(kind);
    const active=owned && data.icon===`commander_${kind}`;
    btn.classList.toggle("locked",!owned);
    btn.classList.toggle("shop-owned",owned);
    btn.disabled=!owned;
    btn.title=owned?`${kind.toUpperCase()} COMMANDER`:`${kind.toUpperCase()} BUNDLE · STARFLEET EXCHANGE`;
    let req=btn.querySelector("small");
    if(!req){req=document.createElement("small");req.className="bundle-photo-requirement";btn.appendChild(req);}
    req.textContent=owned?"BUNDLE OWNED":`${kind.toUpperCase()} BUNDLE`;
    const label=btn.querySelector("b");
    if(label) label.textContent=!owned?"LOCKED":(active?"SELECTED":"SELECT");
  });
};

/* Normalize a saved selection when the clean-launch wallet does not own it. */
function bw136NormalizeShopCosmetics(){
  const data=getPlayerProfileData();
  let changed=false;
  const iconBundle=bw136BundleForCommander(data.icon);
  if(iconBundle && !bw136BundleOwned(iconBundle)){data.icon="infiltrator";changed=true;}
  if((data.frame==="vulcan" || data.frame==="klingon") && !isProfileFrameUnlocked(data.frame)){
    data.frame="rookie";changed=true;
  }
  if(changed) savePlayerProfileData(data);
  return data;
}

/* Enforce bundle ownership anywhere the registered preview assets appear. */
bw132EnsurePreviewUnlocked=function(){
  ["vulcan","klingon"].forEach(kind=>{
    const owned=bw136BundleOwned(kind);
    document.querySelectorAll(`[data-commander="${kind}"]`).forEach(el=>{
      el.disabled=!owned;
      el.classList.toggle("shop-locked",!owned);
      el.setAttribute("aria-label",owned?`${kind} commander`:`${kind} commander · bundle locked`);
    });
    document.querySelectorAll(`[data-profile-icon="commander_${kind}"]`).forEach(el=>{
      el.disabled=!owned;
      el.classList.toggle("locked",!owned);
    });
  });
};

const BW136_renderCommanders=renderCommanders;
renderCommanders=function(){
  if((setup.commander==="vulcan" && !bw136BundleOwned("vulcan")) ||
     (setup.commander==="klingon" && !bw136BundleOwned("klingon"))){
    setup.commander="fleet";
  }
  BW136_renderCommanders();
  ["vulcan","klingon"].forEach(kind=>{
    const btn=document.querySelector(`#commanderBox [data-commander="${kind}"]`);
    if(!btn) return;
    const owned=bw136BundleOwned(kind);
    btn.disabled=!owned;
    btn.classList.toggle("shop-locked",!owned);
    if(!owned){
      const lock=document.createElement("span");
      lock.className="commander-shop-lock";
      lock.textContent="SHOP BUNDLE";
      btn.appendChild(lock);
    }
  });
};

/* Purchases immediately refresh all places where the unlock can appear. */
const BW136_buyShopItem=bw135BuyShopItem;
bw135BuyShopItem=function(itemId,overridePrice=null){
  const before=bw135ReadExchange();
  const result=BW136_buyShopItem(itemId,overridePrice);
  const after=bw135ReadExchange();
  if(after.credits<before.credits){
    bw136NormalizeShopCosmetics();
    bw136InstallShopFrameChoices();
    if(typeof updateProfileSelectionButtons==="function") updateProfileSelectionButtons(getPlayerProfileData());
    if(typeof bw119RenderProfileReactions==="function") bw119RenderProfileReactions();
    if(typeof renderCommanders==="function") renderCommanders();
    bw135RenderProfilePreview();
  }
  return result;
};
window.bw135BuyShopItem=bw135BuyShopItem;

window.addEventListener("DOMContentLoaded",()=>{
  bw136InstallShopFrameChoices();
  bw136NormalizeShopCosmetics();
  updateProfileSelectionButtons(getPlayerProfileData());
  renderCommanders();
  bw135RefreshShop();
});
