/* ============================================================
   BEACON WARS v139 · FRAME REFRESH + PREMIUM REACTION FIX
   - Uses trimmed battle-only assets for Klingons Do Not / Fascinating.
   - Tunes the featured panel layout and tab framing via CSS hooks.
   - Leaves the store categories (bundles / frames / titles / reactions) intact.
   ============================================================ */
(function(){
  const BATTLE_PREMIUM_REACTION_ASSETS={
    klingons_do_not:"BATTLE_REACTION_KLINGONS_DO_NOT.png",
    fascinating:"BATTLE_REACTION_FASCINATING.png"
  };

  function bw139BattleReactionAsset(key){
    if(BATTLE_PREMIUM_REACTION_ASSETS[key]) return BATTLE_PREMIUM_REACTION_ASSETS[key];
    return (typeof BW110_REACTIONS!=='undefined' && BW110_REACTIONS[key]) ? BW110_REACTIONS[key] : '';
  }

  window.bw139BattleReactionAsset=bw139BattleReactionAsset;

  /* Featured poster: no blue frame, larger art, centered sale price. */
  if(typeof bw135FeatureVisual === 'function'){
    const prev=bw135FeatureVisual;
    bw135FeatureVisual=function(item){
      if(item && item.poster) return `<img class="exchange-feature-poster" src="${item.poster}" alt="${item.name}">`;
      if(item && item.type==="reaction") return `<div class="feature-reaction-card ${(/^SHOP_REACTION_/.test(item.asset||''))?'premium-canvas':''}"><img src="${item.asset}" alt="${item.name}"></div>`;
      return prev(item);
    };
  }

  /* Refresh the battle equipped-reactions menu with correctly cropped assets. */
  bw119RenderBattleReactionPicker=function(){
    const picker=document.getElementById('reactionPicker');
    if(!picker) return;
    const data=bw119EnsureProfileData();
    const equipped=(data.equippedReactions||[]).slice(0,5);
    picker.innerHTML=`
      <div class="reaction-picker-header">
        <strong>EQUIPPED REACTIONS</strong>
        <span>SELECT TO SEND</span>
      </div>
      <div class="reaction-picker-grid">
        ${equipped.map(id=>{
          const r=BW119_REACTIONS[id];
          const src=bw139BattleReactionAsset(id)||r.asset;
          const premium=!!BATTLE_PREMIUM_REACTION_ASSETS[id];
          return `<button class="${premium?'premium-reaction-button':''}" type="button" onclick="sendMatchReaction('${id}',event)"><img class="${premium?'battle-premium-reaction':''}" src="${src}" alt="${r.label}"></button>`;
        }).join('')}
      </div>`;
  };

  /* Use the battle-cropped premium signs in the popup shell too. */
  bw110SetReactionImage=function(side,key){
    const img=document.getElementById(side==='player'?'playerReactionImage':'opponentReactionImage');
    if(!img) return;
    const src=bw139BattleReactionAsset(key);
    if(!src) return;
    img.src=src;
    img.classList.toggle('battle-premium-reaction',!!BATTLE_PREMIUM_REACTION_ASSETS[key]);
  };

  window.addEventListener('DOMContentLoaded',()=>{
    if(typeof bw119RenderBattleReactionPicker==='function') bw119RenderBattleReactionPicker();
    if(typeof bw135RefreshShop==='function') bw135RefreshShop();
  });
})();
