/* ============================================================
   BEACON WARS v194 · NERDY EXCHANGE
   - 30-minute catalog exchange shared by every player.
   - 10-minute featured exchange shared by every player.
   - Nerdy bundle/cosmetics, new color reactions, and frame art.
   ============================================================ */
(function(){
  'use strict';

  const EXCHANGE_MS=30*60*1000;
  const FEATURED_MS=10*60*1000;

  /* Global epoch slots make the same stock appear for everyone without a
     server read. Local timezone and page-open time cannot change the result. */
  function exchangeIndex(at=Date.now()){return Math.floor(Number(at)/EXCHANGE_MS);}
  function featuredIndex(at=Date.now()){return Math.floor(Number(at)/FEATURED_MS);}
  function nextBoundary(slotMs,at=Date.now()){
    return new Date((Math.floor(Number(at)/slotMs)+1)*slotMs);
  }
  window.bw194ExchangeIndex=exchangeIndex;
  window.bw194FeaturedIndex=featuredIndex;

  /* Identity assets used on profile, battle, result, and online snapshots. */
  Object.assign(PROFILE_FRAME_ASSETS,{
    nerdy:'PROFILE_CANVAS_FRAME_NERDY.png',
    delta:'PROFILE_CANVAS_FRAME_DELTA.png',
    ruby:'PROFILE_CANVAS_FRAME_RUBY.png',
    academy:'PROFILE_CANVAS_FRAME_ACADEMY.png',
    wood:'PROFILE_CANVAS_FRAME_WOOD.png',
    volt:'PROFILE_CANVAS_FRAME_VOLT.png',
    emergent:'PROFILE_CANVAS_FRAME_EMERGENT.png'
  });
  Object.assign(PROFILE_FRAME_NAMES,{
    nerdy:'NERDY',delta:'DELTA',ruby:'RUBY',academy:'ACADEMY'
  });
  PROFILE_TITLE_ASSETS.nerdy='TITLE_NERDY.png';
  PROFILE_TITLE_NAMES.nerdy='NERDY';

  /* All new reactions are tightly cropped for the shop, loadout, match picker,
     and opponent popup. Their ids are stable inventory keys. */
  const REACTIONS={
    bringit_green:{label:'BRING IT! · GREEN',asset:'REACTION_BRINGIT_GREEN.png'},
    nerdy:{label:'NERDY',asset:'REACTION_NERDY.png'},
    idareyou_gold:{label:'I DARE YOU! · GOLD',asset:'REACTION_IDAREYOU_GOLD.png'},
    idareyou_red:{label:'I DARE YOU! · RED',asset:'REACTION_IDAREYOU_RED.png'},
    highly_illogical:{label:'HIGHLY ILLOGICAL!',asset:'REACTION_HIGHLYILLOGICAL.png'},
    beam_me_up:{label:'BEAM ME UP!',asset:'REACTION_BEAMMEUP.png'},
    letsfly_green:{label:"LET'S FLY! · GREEN",asset:'REACTION_LETSFLY_GREEN.png'},
    engage_green:{label:'ENGAGE! · GREEN',asset:'REACTION_ENGAGE_GREEN.png'},
    livelong_green:{label:'LIVE LONG & PROSPER · GREEN',asset:'REACTION_LIVELONG_GREEN.png'},
    makeitso_green:{label:'MAKE IT SO · GREEN',asset:'REACTION_MAKEITSO_GREEN.png'},
    gg_green:{label:'GG · GREEN',asset:'REACTION_GG_GREEN.png'},
    hello_green:{label:'HELLO · GREEN',asset:'REACTION_HELLO_GREEN.png'}
  };
  Object.assign(BW119_REACTIONS,REACTIONS);
  Object.assign(BW110_REACTIONS,Object.fromEntries(
    Object.entries(REACTIONS).map(([id,reaction])=>[id,reaction.asset])
  ));
  Object.assign(BW135_REACTION_VARIANTS,REACTIONS);

  function reactionItem(id,name,price,asset){
    return {id:'reaction_'+id,type:'reaction',reactionId:id,name,price,asset,grants:['reaction:'+id]};
  }

  /* Additive catalog registration keeps all earlier purchases and inventory
     flags valid. Exact prices here are the v194 source of truth. */
  Object.assign(BW135_SHOP_ITEMS,{
    bundle_nerdy:{
      id:'bundle_nerdy',type:'bundle',name:'NERDY BUNDLE',price:2000,
      poster:'SHOP_BUNDLE_NERDY.png',
      description:'NERDY REACTION · NERDY TITLE · NERDY FRAME',
      grants:['bundle:nerdy','reaction:nerdy','title:nerdy','frame:nerdy']
    },
    frame_nerdy:{id:'frame_nerdy',type:'frame',name:'NERDY FRAME',price:1000,frameKind:'nerdy',asset:'PROFILE_FRAME_NERDY.png',grants:['frame:nerdy']},
    frame_delta:{id:'frame_delta',type:'frame',name:'DELTA FRAME',price:1000,frameKind:'delta',asset:'PROFILE_FRAME_DELTA.png',grants:['frame:delta']},
    frame_ruby:{id:'frame_ruby',type:'frame',name:'RUBY FRAME',price:1000,frameKind:'ruby',asset:'PROFILE_FRAME_RUBY.png',grants:['frame:ruby']},
    frame_academy:{id:'frame_academy',type:'frame',name:'ACADEMY FRAME',price:1000,frameKind:'academy',asset:'PROFILE_FRAME_ACADEMY.png',grants:['frame:academy']},
    title_nerdy:{id:'title_nerdy',type:'title',name:'NERDY',price:1000,titleId:'nerdy',asset:'TITLE_NERDY.png',grants:['title:nerdy']},
    reaction_bringit_green:reactionItem('bringit_green','BRING IT! · GREEN',100,'REACTION_BRINGIT_GREEN.png'),
    reaction_nerdy:reactionItem('nerdy','NERDY',1000,'REACTION_NERDY.png'),
    reaction_idareyou_gold:reactionItem('idareyou_gold','I DARE YOU! · GOLD',1000,'REACTION_IDAREYOU_GOLD.png'),
    reaction_idareyou_red:reactionItem('idareyou_red','I DARE YOU! · RED',500,'REACTION_IDAREYOU_RED.png'),
    reaction_highly_illogical:reactionItem('highly_illogical','HIGHLY ILLOGICAL!',500,'REACTION_HIGHLYILLOGICAL.png'),
    reaction_beam_me_up:reactionItem('beam_me_up','BEAM ME UP!',500,'REACTION_BEAMMEUP.png'),
    reaction_letsfly_green:reactionItem('letsfly_green',"LET'S FLY! · GREEN",100,'REACTION_LETSFLY_GREEN.png'),
    reaction_engage_green:reactionItem('engage_green','ENGAGE! · GREEN',100,'REACTION_ENGAGE_GREEN.png'),
    reaction_livelong_green:reactionItem('livelong_green','LIVE LONG · GREEN',100,'REACTION_LIVELONG_GREEN.png'),
    reaction_makeitso_green:reactionItem('makeitso_green','MAKE IT SO · GREEN',100,'REACTION_MAKEITSO_GREEN.png'),
    reaction_gg_green:reactionItem('gg_green','GG · GREEN',100,'REACTION_GG_GREEN.png'),
    reaction_hello_green:reactionItem('hello_green','HELLO · GREEN',100,'REACTION_HELLO_GREEN.png')
  });

  /* Commodore is no longer bundle-only. It joins the frame exchange at its
     existing 300-credit price. */
  Object.assign(BW135_SHOP_ITEMS.frame_commodore,{
    frameKind:'commodore',bundleOnly:false,price:300,
    description:'COMMODORE PROFILE FRAME',grants:['frame:commodore']
  });

  /* Preserve the Commodore entitlement for anyone who owned the retired
     Starfleet Officer bundle before the frame became a direct purchase. */
  try{
    const profile=getPlayerProfileData();
    if((profile.ownedBundles||[]).includes('starfleet_officer')&&!bw135Owns('frame:commodore')){
      const exchange=bw135ReadExchange();
      exchange.owned.push('frame:commodore');
      bw135SaveExchange(exchange);
    }
  }catch(err){}

  const BUNDLE_ORDER=['bundle_nerdy','bundle_vulcan','bundle_klingon'];
  const FRAME_ORDER=['frame_commodore','frame_delta','frame_ruby','frame_academy','frame_nerdy','frame_vulcan','frame_klingon'];
  const TITLE_ORDER=['title_nerdy','title_galactic_financier','title_private_captain','title_profit_commander','title_enterprise_owner','title_armada_owner'];
  const REACTION_ORDER=[
    'reaction_nerdy','reaction_idareyou_gold','reaction_idareyou_red','reaction_highly_illogical','reaction_beam_me_up','reaction_bringit_green',
    'reaction_letsfly_green','reaction_engage_green','reaction_livelong_green','reaction_makeitso_green','reaction_gg_green','reaction_hello_green',
    'reaction_klingons','reaction_fascinating','reaction_engage','reaction_letsfly',
    ...BW135_COLOR_REACTIONS
  ];
  const FEATURED_ORDER=[
    'bundle_nerdy','bundle_vulcan','bundle_klingon',
    'reaction_nerdy','bundle_nerdy','reaction_idareyou_gold','bundle_vulcan',
    'reaction_highly_illogical','bundle_klingon','reaction_beam_me_up'
  ];

  /* Keep compatibility with older code that asks for these functions. */
  bw135RotationIndex=function(){return exchangeIndex();};
  bw135NextExchangeTime=function(){return nextBoundary(EXCHANGE_MS);};
  bw135FeaturedPrice=function(item){
    if(!item)return 0;
    if(item.id==='bundle_nerdy')return 1200;
    if(item.type==='bundle')return 1500;
    return Math.round((Number(item.price)||0)*.70);
  };

  /* Generic ownership means future bundles no longer need a hard-coded name. */
  bw135ItemOwned=function(item){
    if(!item)return false;
    if(item.type==='bundle'){
      const flag=(item.grants||[]).find(grant=>String(grant).startsWith('bundle:'));
      return flag?bw135Owns(flag):(item.grants||[]).every(bw135Owns);
    }
    if(item.reactionId)return bw135ReactionOwned(item.reactionId);
    if(item.titleId)return bw135Owns('title:'+item.titleId);
    if(item.frameKind)return bw135Owns('frame:'+item.frameKind);
    return Array.isArray(item.grants)&&item.grants.length>0&&item.grants.every(bw135Owns);
  };

  function windowFrom(list,count,slot=exchangeIndex(),step=1){
    const start=((slot*step)%list.length+list.length)%list.length;
    return Array.from({length:Math.min(count,list.length)},(_,offset)=>list[(start+offset)%list.length]);
  }

  /* Preserve the established two-row bundle layout. Each exchange moves the
     next bundle to the top and the following bundle into row two. */
  bw135BundleCard=function(item){
    const owned=bw135ItemOwned(item);
    const tone=item.id.replace('bundle_','');
    const details=String(item.description||'').split('·').map(part=>part.trim()).filter(Boolean)
      .map(part=>`<span>${part}</span>`).join('');
    return `<article data-shop-item-id="${item.id}" class="shop-bundle-showcase ${tone} ${owned?'owned':''}" onclick="bw137SelectShopItem('${item.id}')">
      <div class="shop-bundle-showcase-poster"><img src="${item.poster}" alt="${item.name}"></div>
      <div class="shop-bundle-showcase-copy"><strong>${item.name}</strong>
        <div class="shop-bundle-includes">${details}</div>
        <div class="shop-bundle-price ${owned?'shop-item-owned':''}">${owned?'OWNED':item.price}<span>${owned?'':'CREDITS'}</span></div>
      </div>
    </article>`;
  };
  bw135RenderBundles=function(){
    const panel=document.getElementById('shopPanelBundles');if(!panel)return;
    const ids=windowFrom(BUNDLE_ORDER,2,exchangeIndex(),1);
    panel.innerHTML=`<div class="shop-bundle-showcase-list">${ids.map(id=>bw135BundleCard(BW135_SHOP_ITEMS[id])).join('')}</div>`;
  };

  bw135RenderFrames=function(){
    const panel=document.getElementById('shopPanelFrames');if(!panel)return;
    const ids=windowFrom(FRAME_ORDER,4,exchangeIndex(),1);
    panel.innerHTML=`<div class="shop-frame-grid">${ids.map(id=>{
      const item=BW135_SHOP_ITEMS[id],owned=bw135ItemOwned(item);
      return `<article data-shop-item-id="${id}" class="shop-frame-card frame-${item.frameKind} ${owned?'owned':''}" onclick="bw137SelectShopItem('${id}')">
        <div class="shop-frame-preview">${bw135FrameVisual(item)}</div><strong>${item.name}</strong>
        <div class="frame-price">${owned?'OWNED':item.price}<span>${owned?'':'CREDITS'}</span></div>
      </article>`;
    }).join('')}</div>`;
  };

  bw135RenderTitles=function(){
    const panel=document.getElementById('shopPanelTitles');if(!panel)return;
    const ids=windowFrom(TITLE_ORDER,5,exchangeIndex(),1);
    panel.innerHTML=`<div class="shop-title-list">${ids.map(id=>{
      const item=BW135_SHOP_ITEMS[id],owned=bw135ItemOwned(item);
      return `<article data-shop-item-id="${id}" class="shop-title-row ${owned?'owned':''}" onclick="bw137SelectShopItem('${id}')">
        <img src="${item.asset}" alt="${item.name}"><div class="price">${owned?'OWNED':item.price}</div><div class="credits">${owned?'':'CREDITS'}</div>
      </article>`;
    }).join('')}</div>`;
  };

  bw135RenderReactions=function(){
    const panel=document.getElementById('shopPanelReactions');if(!panel)return;
    const ids=windowFrom(REACTION_ORDER,6,exchangeIndex(),1);
    panel.innerHTML=`<div class="shop-reaction-grid">${ids.map(id=>{
      const item=BW135_SHOP_ITEMS[id],owned=bw135ItemOwned(item);
      return `<article data-shop-item-id="${id}" class="shop-reaction-card ${owned?'owned':''}" onclick="bw137SelectShopItem('${id}')">
        <div>${bw135ReactionSign(item)}</div><div class="reaction-price">${owned?'OWNED':item.price}</div><div class="reaction-credits">${owned?'':'CREDITS'}</div>
      </article>`;
    }).join('')}</div>`;
  };

  bw135RenderFeatured=function(){
    bw135CurrentFeaturedId=FEATURED_ORDER[featuredIndex()%FEATURED_ORDER.length];
    const item=BW135_SHOP_ITEMS[bw135CurrentFeaturedId];
    const price=bw135FeaturedPrice(item);
    const visual=document.getElementById('shopFeaturedVisual');
    if(visual){
      visual.innerHTML=bw135FeatureVisual(item);visual.dataset.shopItemId=item.id;
      visual.onclick=()=>bw137SelectShopItem(item.id);visual.title='Preview featured item';
    }
    const name=document.getElementById('shopFeaturedName');if(name)name.textContent=item.name;
    const old=document.getElementById('shopFeaturedOldPrice');if(old)old.innerHTML=`<strong>${item.price}</strong> <s>CREDITS</s>`;
    const now=document.getElementById('shopFeaturedPrice');if(now)now.innerHTML=`${price} <span>CREDITS</span>`;
    const buy=document.getElementById('shopFeaturedBuy');
    if(buy){
      const owned=bw135ItemOwned(item);buy.disabled=owned;
      buy.textContent=owned?'OWNED':`COMMIT BUY · ${price} CREDITS`;
      buy.onclick=()=>{bw137SelectedShopItemId=item.id;bw137CommitSelectedPurchase();};
    }
    if(!bw137SelectedShopItemId)bw137SelectedShopItemId=item.id;
  };

  let lastExchange=exchangeIndex();
  let lastFeatured=featuredIndex();
  bw135TickExchange=function(){
    const now=Date.now();
    let ms=Math.max(0,nextBoundary(EXCHANGE_MS,now).getTime()-now);
    const h=Math.floor(ms/3600000);ms-=h*3600000;
    const m=Math.floor(ms/60000);ms-=m*60000;
    const s=Math.floor(ms/1000);
    const timer=document.getElementById('shopExchangeTimer');
    if(timer)timer.textContent=[h,m,s].map(value=>String(value).padStart(2,'0')).join(':');

    const currentFeatured=featuredIndex(now);
    if(currentFeatured!==lastFeatured){
      lastFeatured=currentFeatured;
      bw135RenderFeatured();
      if(bw137SelectedShopItemId&&!document.querySelector(`[data-shop-item-id="${bw137SelectedShopItemId}"]`)){
        bw137SelectedShopItemId=bw135CurrentFeaturedId;
      }
      bw137PreviewSelectedItem();
    }
    const currentExchange=exchangeIndex(now);
    if(currentExchange!==lastExchange){
      lastExchange=currentExchange;
      bw135RenderCatalog();bw135ShowShopTab(bw135ShopTab);
      if(bw137SelectedShopItemId&&!document.querySelector(`[data-shop-item-id="${bw137SelectedShopItemId}"]`)){
        bw137SelectedShopItemId=bw135CurrentFeaturedId;
      }
      bw137PreviewSelectedItem();
    }
  };

  /* Nerdy bundle previews its exact three included cosmetics. */
  const previousPreview=bw137PreviewSelectedItem;
  bw137PreviewSelectedItem=function(){
    previousPreview();
    if(bw137SelectedShopItemId==='bundle_nerdy'){
      const data=getPlayerProfileData();
      bw137ApplyPreviewBadge(data.icon,'nerdy');
      bw137ApplyPreviewTitle('nerdy');
      bw137SetPreviewReaction('REACTION_NERDY.png',false);
    }
  };

  /* Exchange-owned cosmetics become selectable only after their matching flag
     is granted, including old accounts that already own the bundle. */
  const SHOP_FRAMES=['nerdy','delta','ruby','academy','commodore'];
  const previousFrameRule=bw127FrameRule;
  bw127FrameRule=function(frameId,stats=getPlayerStats()){
    if(SHOP_FRAMES.includes(frameId)){
      const owned=bw135Owns('frame:'+frameId);
      return {unlocked:owned,requirement:'Starfleet Exchange · '+PROFILE_FRAME_NAMES[frameId]+' Frame',progress:owned?'OWNED':'SHOP'};
    }
    return previousFrameRule(frameId,stats);
  };
  const previousFrameUnlocked=isProfileFrameUnlocked;
  isProfileFrameUnlocked=function(frameId,stats=getPlayerStats()){
    if(SHOP_FRAMES.includes(frameId))return bw135Owns('frame:'+frameId);
    return previousFrameUnlocked(frameId,stats);
  };
  const previousTitleUnlocked=isProfileTitleUnlocked;
  isProfileTitleUnlocked=function(titleId,stats=getPlayerStats()){
    if(titleId==='nerdy')return bw135Owns('title:nerdy');
    return previousTitleUnlocked(titleId,stats);
  };
  const previousTitleRequirement=profileTitleRequirement;
  profileTitleRequirement=function(titleId){
    if(titleId==='nerdy')return bw135Owns('title:nerdy')?'Starfleet Exchange · Owned':'Starfleet Exchange purchase';
    return previousTitleRequirement(titleId);
  };

  function installProfileChoices(){
    const gallery=document.querySelector('#playerProfile .profile-frame-gallery');
    const none=gallery&&gallery.querySelector('[data-profile-frame="none"]');
    const frames=[
      ['nerdy','PROFILE_FRAME_NERDY.png'],['delta','PROFILE_FRAME_DELTA.png'],
      ['ruby','PROFILE_FRAME_RUBY.png'],['academy','PROFILE_FRAME_ACADEMY.png']
    ];
    if(gallery){
      frames.forEach(([id,asset])=>{
        if(gallery.querySelector(`[data-profile-frame="${id}"]`))return;
        const html=`<button class="profile-frame-choice exchange-frame-choice" data-profile-frame="${id}" type="button" onclick="selectProfileFrame('${id}')" title="${PROFILE_FRAME_NAMES[id]}">
          <img src="${asset}" alt="${PROFILE_FRAME_NAMES[id]} profile frame"><span>${PROFILE_FRAME_NAMES[id]}</span><b>SELECT</b>
        </button>`;
        if(none)none.insertAdjacentHTML('beforebegin',html);else gallery.insertAdjacentHTML('beforeend',html);
      });
    }

    const prestige=document.querySelector('#profilePanelTitles .prestige-grid');
    if(prestige&&!prestige.querySelector('[data-profile-title="nerdy"]')){
      prestige.insertAdjacentHTML('beforeend',`<button class="profile-title-option prestige-option locked" type="button" data-profile-title="nerdy" onclick="selectProfileTitle('nerdy')" disabled>
        <img src="TITLE_NERDY.png" alt="Nerdy"><span>Nerdy</span><small>Starfleet Exchange purchase</small><b>LOCKED</b>
      </button>`);
      const count=document.querySelector('#profilePanelTitles .prestige-heading span');
      if(count)count.textContent='6 SPECIAL TITLES';
    }
  }

  window.addEventListener('DOMContentLoaded',()=>{
    installProfileChoices();
    /* Replace progression thumbnails with the corrected supplied variants. */
    [['wood','PROFILE_FRAME_WOOD.png'],['volt','PROFILE_FRAME_VOLT.png'],['emergent','PROFILE_FRAME_EMERGENT.png']]
      .forEach(([id,asset])=>{
        const img=document.querySelector(`#playerProfile [data-profile-frame="${id}"] img`);
        if(img)img.src=asset;
      });
    bw137SelectedShopItemId='';
    bw135RefreshShop();
    bw137SelectedShopItemId=bw135CurrentFeaturedId;
    bw135RenderCatalog();
    bw137PreviewSelectedItem();
    updateProfileSelectionButtons(getPlayerProfileData());
    bw119RenderProfileReactions();
    bw119RenderBattleReactionPicker();
  });
})();
