/* ============================================================
   BEACON WARS v137 · EXCHANGE PREVIEW + OWNED INVENTORY ONLY
   - Catalog clicks PREVIEW. Nothing purchases until COMMIT BUY.
   - Player Preview live-previews frames, titles, reactions, bundles.
   - Player Profile only shows content the player actually owns/earned.
   - Corrected Vulcan/Klingon frame assets + normalized shop sizing.
   ============================================================ */

let bw137SelectedShopItemId="";

function bw137Item(itemId){ return BW135_SHOP_ITEMS[itemId] || null; }
function bw137IsFeatured(itemId){ return !!itemId && itemId===bw135CurrentFeaturedId; }
function bw137PriceFor(itemId){
  const item=bw137Item(itemId);
  if(!item) return 0;
  return bw137IsFeatured(itemId) ? bw135FeaturedPrice(item) : Number(item.price)||0;
}
function bw137IsPurchasable(item){ return !!item && !item.bundleOnly; }

function bw137SetPreviewReaction(asset="",premium=false){
  const shell=document.getElementById("shopPreviewReactionShell");
  const img=document.getElementById("shopPreviewReaction");
  if(!shell || !img) return;
  if(!asset){
    shell.classList.remove("active","premium-canvas");
    img.removeAttribute("src");
    img.alt="";
    return;
  }
  img.src=asset;
  img.alt="Reaction preview";
  shell.classList.toggle("premium-canvas",!!premium);
  shell.classList.add("active");
}

function bw137ApplyPreviewTitle(titleId){
  const badge=document.getElementById("shopPreviewTitle");
  const txt=document.getElementById("shopPreviewTitleText");
  const asset=PROFILE_TITLE_ASSETS[titleId]||"";
  const title=PROFILE_TITLE_NAMES[titleId]||"CADET";
  if(badge){
    if(asset){ badge.src=asset; badge.alt=title; badge.style.display="block"; }
    else { badge.style.display="none"; }
  }
  if(txt){ txt.textContent=title; txt.style.display=asset?"none":"block"; }
}

function bw137ApplyPreviewBadge(iconId,frameId){
  const icon=document.getElementById("shopPreviewIcon");
  const frame=document.getElementById("shopPreviewFrame");
  const data=getPlayerProfileData();
  const previewData={...data,icon:iconId||data.icon,frame:frameId||data.frame};
  if(typeof applyProfileBadge==="function") applyProfileBadge(icon,frame,previewData);
}

function bw137PreviewSelectedItem(){
  const item=bw137Item(bw137SelectedShopItemId);
  const data=getPlayerProfileData();
  bw137ApplyPreviewBadge(data.icon,data.frame);
  bw137ApplyPreviewTitle(data.title);
  bw137SetPreviewReaction();

  if(item){
    if(item.type==="frame"){
      const frameId=item.frameKind || (item.id==="frame_commodore"?"commodore":"");
      if(frameId) bw137ApplyPreviewBadge(data.icon,frameId);
    }else if(item.type==="title" && item.titleId){
      bw137ApplyPreviewTitle(item.titleId);
    }else if(item.type==="reaction"){
      bw137SetPreviewReaction(item.asset, /^SHOP_REACTION_/.test(item.asset||""));
    }else if(item.type==="bundle"){
      if(item.id==="bundle_vulcan"){
        bw137ApplyPreviewBadge("commander_vulcan","vulcan");
        bw137ApplyPreviewTitle("private_captain");
        bw137SetPreviewReaction("SHOP_REACTION_FASCINATING.png",true);
      }else if(item.id==="bundle_klingon"){
        bw137ApplyPreviewBadge("commander_klingon","klingon");
        bw137ApplyPreviewTitle("armada_owner");
        bw137SetPreviewReaction("SHOP_REACTION_KLINGONS_DO_NOT.png",true);
      }
    }
  }

  const selection=document.getElementById("shopPreviewSelection");
  const commit=document.getElementById("shopPreviewCommitBuy");
  if(selection){
    if(!item) selection.textContent="SELECT AN ITEM TO PREVIEW";
    else if(bw135ItemOwned(item)) selection.textContent=`${item.name} · OWNED`;
    else if(item.bundleOnly) selection.textContent=`${item.name} · BUNDLE ONLY`;
    else selection.textContent=`PREVIEW · ${item.name} · ${bw137PriceFor(item.id)} CREDITS`;
  }
  if(commit){
    if(!item){ commit.disabled=true; commit.textContent="SELECT AN ITEM"; commit.onclick=null; }
    else if(bw135ItemOwned(item)){ commit.disabled=true; commit.textContent="OWNED"; commit.onclick=null; }
    else if(item.bundleOnly){ commit.disabled=true; commit.textContent="BUNDLE ONLY"; commit.onclick=null; }
    else{
      const price=bw137PriceFor(item.id);
      commit.disabled=false;
      commit.textContent=`COMMIT BUY · ${price} CREDITS`;
      commit.onclick=()=>bw137CommitSelectedPurchase();
    }
  }
}

function bw137SelectShopItem(itemId){
  const item=bw137Item(itemId);
  if(!item) return;
  bw137SelectedShopItemId=itemId;
  document.querySelectorAll("#shop [data-shop-item-id]").forEach(el=>{
    el.classList.toggle("selected-preview",el.dataset.shopItemId===itemId);
  });
  bw137PreviewSelectedItem();
  if(typeof playSound==="function") playSound("beep",{volume:.25});
}
window.bw137SelectShopItem=bw137SelectShopItem;

function bw137CommitSelectedPurchase(){
  const item=bw137Item(bw137SelectedShopItemId);
  if(!bw137IsPurchasable(item) || bw135ItemOwned(item)) return;
  const price=bw137PriceFor(item.id);
  bw135BuyShopItem(item.id,price);
  bw137PreviewSelectedItem();
}
window.bw137CommitSelectedPurchase=bw137CommitSelectedPurchase;

/* ---------- Shop renderers: item click = preview, never instant-buy ---------- */

bw135FeatureVisual=function(item){
  if(item.poster) return `<img src="${item.poster}" alt="${item.name}">`;
  if(item.type==="reaction"){
    const premium=/^SHOP_REACTION_/.test(item.asset||"");
    return `<div class="feature-reaction-card ${premium?"premium-canvas":"direct-reaction"}"><img src="${item.asset}" alt="${item.name}"></div>`;
  }
  if(item.asset) return `<img src="${item.asset}" alt="${item.name}">`;
  return `<div>${item.name}</div>`;
};

bw135RenderFeatured=function(){
  const idx=bw135RotationIndex()%BW135_FEATURED_ROTATION.length;
  bw135CurrentFeaturedId=BW135_FEATURED_ROTATION[idx];
  const item=BW135_SHOP_ITEMS[bw135CurrentFeaturedId];
  const price=bw135FeaturedPrice(item);
  const visual=document.getElementById("shopFeaturedVisual");
  if(visual){
    visual.innerHTML=bw135FeatureVisual(item);
    visual.dataset.shopItemId=item.id;
    visual.onclick=()=>bw137SelectShopItem(item.id);
    visual.title="Preview featured item";
  }
  const name=document.getElementById("shopFeaturedName"); if(name) name.textContent=item.name;
  const old=document.getElementById("shopFeaturedOldPrice"); if(old) old.innerHTML=`<strong>${item.price}</strong> <s>CREDITS</s>`;
  const now=document.getElementById("shopFeaturedPrice"); if(now) now.innerHTML=`${price} <span>CREDITS</span>`;
  const buy=document.getElementById("shopFeaturedBuy");
  if(buy){
    const owned=bw135ItemOwned(item);
    buy.disabled=owned;
    buy.textContent=owned?"OWNED":`COMMIT BUY · ${price} CREDITS`;
    buy.onclick=()=>{bw137SelectedShopItemId=item.id;bw137CommitSelectedPurchase();};
  }
  if(!bw137SelectedShopItemId) bw137SelectedShopItemId=item.id;
};

bw135BundleCard=function(item){
  const owned=bw135ItemOwned(item);
  return `<article data-shop-item-id="${item.id}" class="shop-item-card bundle-card ${owned?"owned":""}" onclick="bw137SelectShopItem('${item.id}')">
    <div class="shop-item-thumb"><img src="${item.poster}" alt="${item.name}"></div>
    <div class="shop-item-copy"><strong>${item.name}</strong><small>${item.description}</small></div>
    <div class="shop-item-price ${owned?"shop-item-owned":""}">${owned?"OWNED":item.price}<span>${owned?"":"CREDITS"}</span></div>
  </article>`;
};

bw135RenderBundles=function(){
  const panel=document.getElementById("shopPanelBundles"); if(!panel)return;
  const ids=(bw135RotationIndex()%2===0)?["bundle_klingon","bundle_vulcan"]:["bundle_vulcan","bundle_klingon"];
  panel.innerHTML=`<div class="shop-item-list">${ids.map(id=>bw135BundleCard(BW135_SHOP_ITEMS[id])).join("")}</div>`;
};

bw135RenderFrames=function(){
  const panel=document.getElementById("shopPanelFrames"); if(!panel)return;
  let ids=["frame_vulcan","frame_klingon","frame_commodore"];
  const rot=bw135RotationIndex()%ids.length; ids=ids.slice(rot).concat(ids.slice(0,rot));
  panel.innerHTML=`<div class="shop-frame-grid">${ids.map(id=>{
    const item=BW135_SHOP_ITEMS[id],owned=bw135ItemOwned(item);
    return `<article data-shop-item-id="${id}" class="shop-frame-card frame-${item.frameKind||"commodore"} ${owned?"owned":""}" onclick="bw137SelectShopItem('${id}')">
      <div class="shop-frame-preview">${bw135FrameVisual(item)}</div>
      <strong>${item.name}</strong>
      <div class="frame-price">${owned?"OWNED":(item.bundleOnly?"BUNDLE":item.price)}<span>${item.bundleOnly?"STARFLEET OFFICER":(owned?"":"CREDITS")}</span></div>
    </article>`;
  }).join("")}</div>`;
};

bw135RenderTitles=function(){
  const panel=document.getElementById("shopPanelTitles"); if(!panel)return;
  const shift=bw135RotationIndex()%BW135_TITLE_ROTATION.length;
  const ids=BW135_TITLE_ROTATION.slice(shift).concat(BW135_TITLE_ROTATION.slice(0,shift));
  panel.innerHTML=`<div class="shop-title-list">${ids.map(id=>{
    const item=BW135_SHOP_ITEMS[id],owned=bw135ItemOwned(item);
    return `<article data-shop-item-id="${id}" class="shop-title-row ${owned?"owned":""}" onclick="bw137SelectShopItem('${id}')">
      <img src="${item.asset}" alt="${item.name}"><div class="price">${owned?"OWNED":item.price}</div><div class="credits">${owned?"":"CREDITS"}</div>
    </article>`;
  }).join("")}</div>`;
};

bw135ReactionSign=function(item){
  const premium=/^SHOP_REACTION_/.test(item.asset||"");
  return `<img class="${premium?"premium-canvas":"direct-reaction"}" src="${item.asset}" alt="${item.name}">`;
};

bw135RenderReactions=function(){
  const panel=document.getElementById("shopPanelReactions"); if(!panel)return;
  const premiumSets=[["reaction_klingons","reaction_fascinating"],["reaction_engage","reaction_letsfly"]];
  const pair=premiumSets[bw135RotationIndex()%2];
  const start=(bw135RotationIndex()*4)%BW135_COLOR_REACTIONS.length;
  const colors=[]; for(let i=0;i<4;i++) colors.push(BW135_COLOR_REACTIONS[(start+i)%BW135_COLOR_REACTIONS.length]);
  const ids=pair.concat(colors);
  panel.innerHTML=`<div class="shop-reaction-grid">${ids.map(id=>{
    const item=BW135_SHOP_ITEMS[id],owned=bw135ItemOwned(item);
    return `<article data-shop-item-id="${id}" class="shop-reaction-card ${owned?"owned":""}" onclick="bw137SelectShopItem('${id}')">
      <div>${bw135ReactionSign(item)}</div><div class="reaction-price">${owned?"OWNED":item.price}</div><div class="reaction-credits">${owned?"":"CREDITS"}</div>
    </article>`;
  }).join("")}</div>`;
};

bw135RenderCatalog=function(){
  bw135RenderBundles();
  bw135RenderFrames();
  bw135RenderTitles();
  bw135RenderReactions();
  document.querySelectorAll("#shop [data-shop-item-id]").forEach(el=>{
    el.classList.toggle("selected-preview",el.dataset.shopItemId===bw137SelectedShopItemId);
  });
};

const BW137_baseRenderProfilePreview=bw135RenderProfilePreview;
bw135RenderProfilePreview=function(){
  BW137_baseRenderProfilePreview();
  bw137PreviewSelectedItem();
};

bw135RefreshShop=function(){
  bw135RenderFeatured();
  if(!bw137SelectedShopItemId) bw137SelectedShopItemId=bw135CurrentFeaturedId;
  bw135RenderCatalog();
  bw135ShowShopTab(bw135ShopTab);
  BW137_baseRenderProfilePreview();
  bw137PreviewSelectedItem();
  bw135TickExchange();
};
window.bw135RefreshShop=bw135RefreshShop;

/* ---------- Player Profile: only show content actually owned/earned ---------- */
function bw137PhotoOwned(iconId){
  if(iconId==="academy_ai") return typeof bw126AiPhotoUnlocked==="function" ? bw126AiPhotoUnlocked() : false;
  if(iconId==="commander_vulcan") return bw135Owns("bundle:vulcan") || bw135Owns("photo:commander_vulcan");
  if(iconId==="commander_klingon") return bw135Owns("bundle:klingon") || bw135Owns("photo:commander_klingon");
  return !!PROFILE_ICON_ASSETS[iconId];
}

function bw137FilterOwnedProfileInventory(data=getPlayerProfileData()){
  const stats=getPlayerStats();
  let photoCount=0,frameCount=0,titleCount=0;

  document.querySelectorAll("#playerProfile [data-profile-icon]").forEach(btn=>{
    const owned=bw137PhotoOwned(btn.dataset.profileIcon);
    btn.style.display=owned?"":"none";
    if(owned) photoCount++;
  });

  document.querySelectorAll("#playerProfile [data-profile-frame]").forEach(btn=>{
    const owned=isProfileFrameUnlocked(btn.dataset.profileFrame,stats);
    btn.style.display=owned?"":"none";
    if(owned) frameCount++;
  });

  document.querySelectorAll("#playerProfile [data-profile-title]").forEach(btn=>{
    const owned=isProfileTitleUnlocked(btn.dataset.profileTitle,stats);
    btn.style.display=owned?"":"none";
    if(owned) titleCount++;
  });

  document.querySelectorAll("#profilePanelTitles .profile-title-group").forEach(group=>{
    const any=[...group.querySelectorAll("[data-profile-title]")].some(btn=>btn.style.display!=="none");
    group.style.display=any?"":"none";
  });

  const customChip=document.querySelector("#profilePanelCustomization .profile-chip");
  if(customChip) customChip.textContent=`${photoCount} PHOTOS + ${frameCount} FRAMES`;
  const titleChip=document.querySelector("#profilePanelTitles .profile-chip");
  if(titleChip) titleChip.textContent=`${titleCount} OWNED TITLES`;
}
window.bw137FilterOwnedProfileInventory=bw137FilterOwnedProfileInventory;

const BW137_updateProfileSelectionButtons=updateProfileSelectionButtons;
updateProfileSelectionButtons=function(data){
  BW137_updateProfileSelectionButtons(data);
  bw137FilterOwnedProfileInventory(data);
};

bw119RenderProfileReactions=function(){
  const data=bw119EnsureProfileData();
  const ownedEntries=Object.entries(BW119_REACTIONS).filter(([id])=>bw135ReactionOwned(id));
  const ownedIds=new Set(ownedEntries.map(([id])=>id));
  data.equippedReactions=(data.equippedReactions||[]).filter(id=>ownedIds.has(id)).slice(0,5);
  if(!data.equippedReactions.length){
    data.equippedReactions=BW119_DEFAULT_EQUIPPED.filter(id=>ownedIds.has(id)).slice(0,5);
  }
  savePlayerProfileData(data);
  const equipped=data.equippedReactions;
  const slots=document.getElementById("profileEquippedReactionSlots");
  const library=document.getElementById("profileReactionLibrary");
  const chip=document.getElementById("profileReactionCountChip");
  if(chip) chip.textContent=`${equipped.length} / 5 EQUIPPED`;
  if(slots){
    slots.innerHTML=Array.from({length:5},(_,i)=>{
      const id=equipped[i];
      if(!id) return `<div class="reaction-equipped-slot empty">EMPTY SLOT</div>`;
      const r=BW119_REACTIONS[id];
      const premium=/^SHOP_REACTION_/.test(r.asset||"");
      return `<button class="reaction-equipped-slot ${premium?"premium-canvas":""}" type="button" onclick="bw119ToggleReaction('${id}')"><img src="${r.asset}" alt="${r.label}"></button>`;
    }).join("");
  }
  if(library){
    library.innerHTML=ownedEntries.map(([id,r])=>{
      const active=equipped.includes(id);
      const maxed=equipped.length>=5&&!active;
      const premium=/^SHOP_REACTION_/.test(r.asset||"");
      return `<button class="reaction-library-card ${active?"equipped":""} ${premium?"premium-canvas":""}" type="button" ${maxed?"disabled":""} onclick="bw119ToggleReaction('${id}')"><img src="${r.asset}" alt="${r.label}"><span>${r.label}</span><b>${active?"EQUIPPED":(maxed?"5/5":"EQUIP")}</b></button>`;
    }).join("");
  }
};

/* Keep both collection tabs first-class and re-run owned filters on entry. */
showProfileTab=function(tab){
  const ids=["customization","stats","achievements","titles","reactions"];
  if(!ids.includes(tab)) tab="customization";
  ids.forEach(name=>{
    const cap=name.charAt(0).toUpperCase()+name.slice(1);
    const button=document.getElementById("profileTab"+cap);
    const panel=document.getElementById("profilePanel"+cap);
    if(button) button.classList.toggle("active",name===tab);
    if(panel) panel.classList.toggle("active",name===tab);
  });
  if(tab==="stats") renderPlayerStats();
  if(tab==="achievements") renderPlayerAchievements();
  if(tab==="titles") updateProfileSelectionButtons(getPlayerProfileData());
  if(tab==="reactions") bw119RenderProfileReactions();
  if(tab==="customization") updateProfileSelectionButtons(getPlayerProfileData());
};

window.addEventListener("DOMContentLoaded",()=>{
  /* Keep prestige/shop titles inside the same scrollable collection so they
     are reachable instead of being clipped below the Titles panel. */
  const titleScroll=document.querySelector("#profilePanelTitles .profile-title-scroll");
  const prestige=document.querySelector("#profilePanelTitles .prestige-title-group");
  if(titleScroll && prestige && prestige.parentElement!==titleScroll) titleScroll.appendChild(prestige);

  /* Corrected uploaded frame files replace the older shop copies. */
  BW135_SHOP_ITEMS.frame_vulcan.asset="SHOP_FRAME_VULCAN.png";
  BW135_SHOP_ITEMS.frame_klingon.asset="SHOP_FRAME_KLINGON.png";
  PROFILE_FRAME_ASSETS.vulcan="SHOP_FRAME_VULCAN.png";
  PROFILE_FRAME_ASSETS.klingon="SHOP_FRAME_KLINGON.png";

  bw137SelectedShopItemId="";
  bw135RefreshShop();
  updateProfileSelectionButtons(getPlayerProfileData());
  bw119RenderProfileReactions();
});
