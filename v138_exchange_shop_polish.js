/* ============================================================
   BEACON WARS v138 · EXCHANGE SHOP POLISH
   - Bundle catalog follows the user's large two-row poster layout.
   - Premium Vulcan/Klingon reactions are normalized in battle UI.
   - Existing v137 preview / commit-purchase behavior stays intact.
   ============================================================ */

function bw138PremiumReactionAsset(asset=""){
  return /^SHOP_REACTION_/.test(String(asset));
}

/* Bundle rows: poster on the left, contents + 2500-credit price on the right. */
bw135BundleCard=function(item){
  const owned=bw135ItemOwned(item);
  const tone=item.id.includes("vulcan") ? "vulcan" : "klingon";
  const details=String(item.description||"")
    .split("·")
    .map(part=>part.trim())
    .filter(Boolean)
    .map(part=>`<span>${part}</span>`)
    .join("");
  return `<article data-shop-item-id="${item.id}" class="shop-bundle-showcase ${tone} ${owned?"owned":""}" onclick="bw137SelectShopItem('${item.id}')">
    <div class="shop-bundle-showcase-poster"><img src="${item.poster}" alt="${item.name}"></div>
    <div class="shop-bundle-showcase-copy">
      <strong>${item.name}</strong>
      <div class="shop-bundle-includes">${details}</div>
      <div class="shop-bundle-price ${owned?"shop-item-owned":""}">${owned?"OWNED":item.price}<span>${owned?"":"CREDITS"}</span></div>
    </div>
  </article>`;
};

bw135RenderBundles=function(){
  const panel=document.getElementById("shopPanelBundles");
  if(!panel) return;
  const ids=(bw135RotationIndex()%2===0)
    ? ["bundle_klingon","bundle_vulcan"]
    : ["bundle_vulcan","bundle_klingon"];
  panel.innerHTML=`<div class="shop-bundle-showcase-list">${ids.map(id=>bw135BundleCard(BW135_SHOP_ITEMS[id])).join("")}</div>`;
};

/* Make the premium 1024-canvas reactions first-class citizens in the battle
   picker. The CSS uses this class to magnify only their transparent canvas. */
bw119RenderBattleReactionPicker=function(){
  const picker=document.getElementById("reactionPicker");
  if(!picker) return;
  const data=bw119EnsureProfileData();
  const equipped=data.equippedReactions.slice(0,5);
  picker.innerHTML=`
    <div class="reaction-picker-header">
      <strong>EQUIPPED REACTIONS</strong>
      <span>SELECT TO SEND</span>
    </div>
    <div class="reaction-picker-grid">
      ${equipped.map(id=>{
        const r=BW119_REACTIONS[id];
        const premium=bw138PremiumReactionAsset(r.asset);
        return `<button class="${premium?"premium-reaction-button":""}" type="button" onclick="sendMatchReaction('${id}',event)"><img class="${premium?"premium-canvas":""}" src="${r.asset}" alt="${r.label}"></button>`;
      }).join("")}
    </div>`;
};

/* When a reaction is sent/received, tag the popup image as premium so
   Klingons Do Not! and Fascinating display at the same visual weight as the
   regular reaction PNGs. */
bw110SetReactionImage=function(side,key){
  const img=document.getElementById(side==="player"?"playerReactionImage":"opponentReactionImage");
  if(!img || !BW110_REACTIONS[key]) return;
  img.src=BW110_REACTIONS[key];
  img.classList.toggle("premium-canvas",bw138PremiumReactionAsset(BW110_REACTIONS[key]));
};

window.addEventListener("DOMContentLoaded",()=>{
  bw119RenderBattleReactionPicker();
  if(typeof bw135RefreshShop==="function") bw135RefreshShop();
});
