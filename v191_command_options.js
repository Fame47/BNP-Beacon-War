/* ============================================================
   BEACON WARS v191 · COMMAND OPTIONS
   Persistent master volume controls, synchronized battle/campaign HUD
   sliders, and one-use account redemption codes.
   ============================================================ */
(function(){
  'use strict';

  const AUDIO_KEY='beaconWarsV192AudioSettings';
  const VALID_CODES=new Set(['BNP2026','BOOTLEG','CAPNAYA']);
  const REWARD_CREDITS=1500;
  let prefs=readPrefs();

  function clampPercent(value){
    return Math.max(0,Math.min(100,Math.round(Number(value)||0)));
  }
  function readPrefs(){
    try{
      const saved=JSON.parse(localStorage.getItem(AUDIO_KEY)||'{}')||{};
      return {
        music:clampPercent(saved.music==null?100:saved.music),
        sound:clampPercent(saved.sound==null?100:saved.sound)
      };
    }catch(err){return {music:100,sound:100}}
  }
  function savePrefs(){
    try{localStorage.setItem(AUDIO_KEY,JSON.stringify(prefs))}catch(err){}
  }
  function musicScale(){return prefs.music/100}
  function soundScale(){return prefs.sound/100}

  function syncControls(){
    document.querySelectorAll('[data-audio-slider]').forEach(input=>{
      const channel=input.dataset.audioSlider;
      input.value=String(prefs[channel]??100);
      input.style.setProperty('--audio-fill',(prefs[channel]??100)+'%');
      input.setAttribute('aria-valuetext',(prefs[channel]??100)+' percent');
    });
    document.querySelectorAll('[data-audio-output]').forEach(output=>{
      const channel=output.dataset.audioOutput;
      output.textContent=(prefs[channel]??100)+'%';
    });
  }

  function syncToggleLabels(){
    const sound=document.getElementById('soundToggle');
    const music=document.getElementById('musicToggle');
    if(sound)sound.textContent='SOUND: '+(settings.sound?'ON':'OFF');
    if(music)music.textContent='MUSIC: '+(settings.music?'ON':'OFF');
  }

  function applyAudioLevels(){
    try{
      audioBus.loops.hum.volume=.18*musicScale();
      audioBus.loops.matchAmbiance.volume=.20*musicScale();
    }catch(err){}
    try{bw125MenuMusic.volume=.72*musicScale()}catch(err){}
    try{
      if(window.BW180FirstCommandStory&&typeof window.BW180FirstCommandStory.syncAudioLevels==='function'){
        window.BW180FirstCommandStory.syncAudioLevels();
      }
    }catch(err){}
    syncControls();
    syncToggleLabels();
  }

  function setVolume(channel,value,preview=false){
    if(channel!=='music'&&channel!=='sound')return;
    prefs[channel]=clampPercent(value);
    if(prefs[channel]>0){
      if(channel==='music')settings.music=true;
      else settings.sound=true;
    }
    savePrefs();
    applyAudioLevels();
    window.dispatchEvent(new CustomEvent('beaconWarsAudioChanged',{detail:{...prefs}}));
    if(preview&&channel==='sound'&&prefs.sound>0){
      try{playSound('beep',{volume:.55})}catch(err){}
    }
  }

  const previousPlaySound=playSound;
  playSound=function(name,options={}){
    const adjusted={...options};
    adjusted.volume=Math.max(0,Math.min(1,Number(options.volume==null?1:options.volume)*soundScale()));
    return previousPlaySound(name,adjusted);
  };

  const previousToggleSetting=toggleSetting;
  toggleSetting=function(key,...args){
    const result=previousToggleSetting.call(this,key,...args);
    applyAudioLevels();
    return result;
  };

  const previousShowDatabaseTab=showDatabaseTab;
  showDatabaseTab=function(tab){
    const options=tab==='options';
    if(!options)previousShowDatabaseTab(tab);
    const rules=tab==='rules';
    const units=tab==='units';
    document.getElementById('databaseRulesTab')?.classList.toggle('active',rules);
    document.getElementById('databaseUnitsTab')?.classList.toggle('active',units);
    document.getElementById('databaseOptionsTab')?.classList.toggle('active',options);
    document.getElementById('databaseRulesTab')?.setAttribute('aria-selected',String(rules));
    document.getElementById('databaseUnitsTab')?.setAttribute('aria-selected',String(units));
    document.getElementById('databaseOptionsTab')?.setAttribute('aria-selected',String(options));
    document.getElementById('databaseRulesPanel')?.classList.toggle('active',rules);
    document.getElementById('databaseUnitsPanel')?.classList.toggle('active',units);
    document.getElementById('databaseOptionsPanel')?.classList.toggle('active',options);
    const shell=document.querySelector('#help .database-shell');
    if(shell){
      shell.classList.toggle('rules-view',rules);
      shell.classList.toggle('units-view',units);
      shell.classList.toggle('options-view',options);
    }
    if(options){syncControls();refreshCredits();document.getElementById('bw191RedeemInput')?.focus({preventScroll:true})}
  };

  function redeemedCodes(){
    const data=getPlayerProfileData();
    const profileCodes=Array.isArray(data.redeemedCodes)?data.redeemedCodes.map(code=>String(code).toUpperCase()):[];
    let walletCodes=[];
    try{walletCodes=bw135ReadExchange().owned.filter(flag=>String(flag).startsWith('redeem:')).map(flag=>String(flag).slice(7).toUpperCase())}catch(err){}
    return new Set([...profileCodes,...walletCodes]);
  }

  function setRedeemStatus(message,state='ready'){
    const status=document.getElementById('bw191RedeemStatus');
    if(!status)return;
    status.textContent=message;
    status.dataset.state=state;
  }

  function refreshCredits(){
    const balance=document.getElementById('bw191CreditBalance');
    if(!balance)return;
    try{balance.textContent=bw135ReadExchange().credits.toLocaleString()}catch(err){balance.textContent='0'}
  }

  function redeem(rawCode){
    const code=String(rawCode||'').trim().toUpperCase();
    if(!code){setRedeemStatus('ENTER AN AUTHORIZATION CODE','error');return {ok:false,reason:'empty'}}
    if(!VALID_CODES.has(code)){
      setRedeemStatus('CODE NOT RECOGNIZED','error');
      try{playSound('back',{volume:.45})}catch(err){}
      return {ok:false,reason:'invalid'};
    }
    if(redeemedCodes().has(code)){
      setRedeemStatus(code+' · ALREADY REDEEMED','used');
      try{playSound('back',{volume:.45})}catch(err){}
      return {ok:false,reason:'used'};
    }

    const wallet=bw135ReadExchange();
    wallet.credits=Math.max(0,Number(wallet.credits)||0)+REWARD_CREDITS;
    wallet.owned=[...new Set([...(wallet.owned||[]),'redeem:'+code])];
    bw135SaveExchange(wallet);

    const profile=getPlayerProfileData();
    profile.redeemedCodes=[...new Set([...(Array.isArray(profile.redeemedCodes)?profile.redeemedCodes:[]),code])];
    savePlayerProfileData(profile);

    refreshCredits();
    try{if(typeof bw135RefreshShop==='function')bw135RefreshShop()}catch(err){}
    setRedeemStatus(code+' ACCEPTED · +1,500 CREDITS','success');
    try{playSound('commanderConfirmed',{volume:.72})}catch(err){}
    window.dispatchEvent(new CustomEvent('beaconWarsCodeRedeemed',{detail:{code,credits:REWARD_CREDITS}}));
    return {ok:true,code,credits:REWARD_CREDITS,balance:wallet.credits};
  }

  function bindUi(){
    document.querySelectorAll('[data-audio-slider]').forEach(input=>{
      input.addEventListener('input',()=>setVolume(input.dataset.audioSlider,input.value,false));
      input.addEventListener('change',()=>setVolume(input.dataset.audioSlider,input.value,true));
    });
    const form=document.getElementById('bw191RedeemForm');
    if(form&&!form.dataset.bound){
      form.dataset.bound='true';
      form.addEventListener('submit',event=>{
        event.preventDefault();
        const input=document.getElementById('bw191RedeemInput');
        const result=redeem(input?.value);
        if(result.ok&&input)input.value='';
      });
    }
  }

  window.BW191AudioOptions={
    get:()=>({...prefs}),
    set:setVolume,
    apply:applyAudioLevels,
    musicScale,
    soundScale,
    refreshCredits
  };

  bindUi();
  applyAudioLevels();
  refreshCredits();
  window.addEventListener('DOMContentLoaded',()=>{bindUi();applyAudioLevels();refreshCredits()});
})();
