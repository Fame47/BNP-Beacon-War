/* ============================================================
   BEACON WARS v187 · ECONOMY + SIMULATION TRANSITIONS
   - AI/Campaign credits
   - 4-second Command Center boot
   - 4-second starship battle transit
   ============================================================ */
(function(){
  'use strict';

  const TRANSITION_MS=4000;
  const READY_SOUND_AT=3760;
  let transitionSerial=0;
  let percentTimer=null;
  let rewardToastTimer=null;

  const rewardState={
    mode:'ai',
    missionId:null,
    earned:0,
    breakdown:[],
    victoryAwarded:false
  };
  window.BW159BattleRewardState=rewardState;

  function loader(){return document.getElementById('transitionLoader');}
  function setLoaderText(title,sub,kicker='STARFLEET SIMULATION NETWORK'){
    const t=document.getElementById('bw159LoaderTitle');
    const s=document.getElementById('bw159LoaderSub');
    const k=document.getElementById('bw159LoaderKicker');
    if(t)t.textContent=title;
    if(s)s.textContent=sub;
    if(k)k.textContent=kicker;
  }
  function restartLoaderAnimations(root){
    if(!root)return;
    root.querySelectorAll('.bw159-route-fill,.bw159-loader-ship,.bw159-loader-stars').forEach(el=>{
      el.style.animation='none';
      void el.offsetWidth;
      el.style.animation='';
    });
  }
  function runTransition({mode='battle',campaign=false,title='SIMULATION LOADING',sub='Synchronizing tactical systems...',kicker,onReady,onComplete}={}){
    const root=loader();
    if(!root){if(typeof onComplete==='function')onComplete();return;}
    transitionSerial++;
    const serial=transitionSerial;
    if(percentTimer){clearInterval(percentTimer);percentTimer=null;}
    root.classList.remove('holodeck-mode','battle-mode','campaign-mode','loading-complete');
    root.classList.add('active',mode==='holodeck'?'holodeck-mode':'battle-mode');
    if(campaign)root.classList.add('campaign-mode');
    root.setAttribute('aria-hidden','false');
    setLoaderText(title,sub,kicker);
    const status=document.getElementById('bw159LoaderStatus');
    const pct=document.getElementById('bw159LoaderPercent');
    if(status)status.textContent=mode==='holodeck'?'HOLODECK CORE BOOT':'STARSHIP IN TRANSIT';
    if(pct)pct.textContent='0%';
    restartLoaderAnimations(root);

    const started=performance.now();
    percentTimer=setInterval(()=>{
      if(serial!==transitionSerial)return;
      const progress=Math.min(99,Math.floor(((performance.now()-started)/TRANSITION_MS)*100));
      if(pct)pct.textContent=progress+'%';
      if(status){
        if(progress>=75)status.textContent=mode==='holodeck'?'FINALIZING SIMULATION':'TACTICAL GRID APPROACH';
        else if(progress>=42)status.textContent=mode==='holodeck'?'BUILDING HOLO ENVIRONMENT':'WARP CORRIDOR STABLE';
      }
    },80);

    window.setTimeout(()=>{
      if(serial!==transitionSerial)return;
      root.classList.add('loading-complete');
      if(pct)pct.textContent='100%';
      if(status)status.textContent='SIMULATION READY';
      if(typeof onReady==='function')onReady();
    },READY_SOUND_AT);

    window.setTimeout(()=>{
      if(serial!==transitionSerial)return;
      if(percentTimer){clearInterval(percentTimer);percentTimer=null;}
      root.classList.remove('active','holodeck-mode','battle-mode','campaign-mode','loading-complete');
      root.setAttribute('aria-hidden','true');
      if(typeof onComplete==='function')onComplete();
    },TRANSITION_MS);
  }
  window.bw159RunTransition=runTransition;

  function resetRewardState(){
    rewardState.earned=0;
    rewardState.breakdown=[];
    rewardState.victoryAwarded=false;
    rewardState.mode=onlineState && onlineState.enabled ? 'online' : (window.BW159RequestedBattleMode||'ai');
    rewardState.missionId=window.BW159RequestedMissionId||null;
    if(rewardState.mode!=='campaign') rewardState.missionId=null;
  }
  window.bw159SetBattleMode=function(mode='ai',missionId=null){
    window.BW159RequestedBattleMode=mode;
    window.BW159RequestedMissionId=missionId;
  };

  function walletAdd(amount){
    amount=Math.max(0,Math.floor(Number(amount)||0));
    if(!amount)return 0;
    if(typeof bw135ReadExchange==='function' && typeof bw135SaveExchange==='function'){
      const state=bw135ReadExchange();
      state.credits=Math.max(0,Number(state.credits)||0)+amount;
      bw135SaveExchange(state);
      return state.credits;
    }
    return 0;
  }
  function showCreditToast(amount,label){
    const game=document.getElementById('game');
    if(!game)return;
    let toast=document.getElementById('bw159CreditToast');
    if(!toast){
      toast=document.createElement('div');
      toast.id='bw159CreditToast';
      toast.className='bw159-credit-toast';
      game.appendChild(toast);
    }
    toast.textContent=`+${amount} CREDITS · ${label}`;
    toast.classList.add('show');
    if(rewardToastTimer)clearTimeout(rewardToastTimer);
    rewardToastTimer=setTimeout(()=>toast.classList.remove('show'),1050);
  }
  function awardCredits(amount,label){
    if(rewardState.mode==='online')return;
    amount=Math.max(0,Math.floor(Number(amount)||0));
    if(!amount)return;
    walletAdd(amount);
    rewardState.earned+=amount;
    rewardState.breakdown.push({amount,label});
    showCreditToast(amount,label);
    if(typeof log==='function')log(`+${amount} CREDITS · ${label}`);
  }

  function isPlayerVictory(msg){
    const upper=String(msg||'').toUpperCase();
    if(upper.includes('DRAW'))return false;
    const mine=String(teamLabel(playerTeam())).toUpperCase();
    return upper.startsWith(mine+' ') || upper.startsWith(String(playerTeam()).toUpperCase()+' ');
  }
  function campaignProgress(){
    try{return JSON.parse(localStorage.getItem('beaconWarsV192CampaignProgress')||'{}')||{};}catch(err){return {};}
  }
  function markCampaignClear(missionId){
    const progress=campaignProgress();
    const key=String(missionId||'mission1');
    const first=!progress[key];
    progress[key]=true;
    try{localStorage.setItem('beaconWarsV192CampaignProgress',JSON.stringify(progress));}catch(err){}
    return first;
  }
  function renderRewardSummary(){
    const host=document.getElementById('matchResultMessage');
    if(!host)return;
    const old=document.getElementById('bw159CreditResult');
    if(old)old.remove();
    if(rewardState.mode==='online')return;
    const box=document.createElement('div');
    box.id='bw159CreditResult';
    box.className='bw159-credit-result';
    box.textContent=rewardState.earned>0 ? `MATCH EARNINGS +${rewardState.earned} CREDITS` : 'MATCH EARNINGS 0 CREDITS';
    host.insertAdjacentElement('afterend',box);
  }

  /* Track mode as players enter the two current battle paths. */
  if(typeof startLocalGameFlow==='function'){
    const original=startLocalGameFlow;
    startLocalGameFlow=function(){
      window.BW159RequestedBattleMode='ai';
      window.BW159RequestedMissionId=null;
      return original.apply(this,arguments);
    };
  }
  if(typeof openOnlineMatch==='function'){
    const original=openOnlineMatch;
    openOnlineMatch=function(){
      window.BW159RequestedBattleMode='online';
      window.BW159RequestedMissionId=null;
      return original.apply(this,arguments);
    };
  }

  /* Command Center boot: full screen holo initialization, then SIMULATION READY. */
  enterCommandCenter=function(){
    const menu=document.getElementById('menu');
    if(!menu)return;
    unlockAudio();
    if(typeof bw125StopMenuMusic==='function')bw125StopMenuMusic();
    stopLoop('matchAmbiance');
    startLoop('hum');
    playSound('scanner',{volume:.42});

    runTransition({
      mode:'holodeck',
      kicker:'STARFLEET HOLODECK CONTROL',
      title:'HOLODECK INITIALIZATION',
      sub:'Building command environment and synchronizing tactical systems...',
      onReady:()=>playSound('simulationReady',{volume:.95}),
      onComplete:()=>{
        startCommandCenterAudio({announce:false});
        menu.classList.remove('intro-active');
        commandCameraBusy=false;
        setCommandCamera('center','COMMAND CENTER');
        startHubSimulation();
      }
    });
  };

  /* Battle entry: no instant board cut. Stars + a 4-second starship transit first. */
  startGame=function(fieldId=null){
    unlockAudio();
    playSound('commanderConfirmed',{volume:.9});
    if(typeof bw125StopMenuMusic==='function')bw125StopMenuMusic();
    stopLoop('hum');
    stopLoop('matchAmbiance');
    playSound('shipWarp',{volume:.95,delay:250});

    if(fieldId && battlefields[fieldId])setup.battlefield=fieldId;
    const bf=currentBattlefield();
    const layer=document.getElementById('boardLayer');
    if(layer)layer.style.backgroundImage=`url("${bf.image}")`;
    preloadBattlefield(bf.id);

    runTransition({
      mode:'battle',
      kicker:'STARFLEET TACTICAL TRANSIT',
      title:'ENTERING BATTLESPACE',
      sub:`Starship en route to ${String(bf.name||'TACTICAL GRID').toUpperCase()} · Preparing holo-board deployment...`,
      onComplete:()=>{
        showScreen('game');
        window.setTimeout(()=>initGame(),0);
      }
    });
  };

  /* Reward state is reset at the true game reset point. */
  if(typeof initGame==='function'){
    const original=initGame;
    initGame=function(){
      resetRewardState();
      return original.apply(this,arguments);
    };
  }

  /* AI/Campaign elimination economy. Online intentionally pays zero. */
  if(typeof capturePiece==='function'){
    const original=capturePiece;
    capturePiece=function(winnerTeam,loser){
      const result=original.apply(this,arguments);
      if(rewardState.mode!=='online' && loser && winnerTeam===playerTeam()){
        if(loser.beacon) awardCredits(10,'BEACON CAPTURE');
        else if(loser.rank===10 || loser.id==='FC') awardCredits(10,'COMMANDER ELIMINATION');
        else if(!loser.mine) awardCredits(3,'UNIT ELIMINATION');
      }
      return result;
    };
  }

  /* Win economy. Losses keep elimination earnings. Online still pays zero. */
  if(typeof endGame==='function'){
    const original=endGame;
    endGame=function(msg){
      const victory=isPlayerVictory(msg);
      if(victory && !rewardState.victoryAwarded && rewardState.mode!=='online'){
        rewardState.victoryAwarded=true;
        if(rewardState.mode==='campaign'){
          awardCredits(100,'CAMPAIGN VICTORY');
          if(markCampaignClear(rewardState.missionId||'mission1')) awardCredits(150,'FIRST CLEAR BONUS');
        }else{
          awardCredits(75,'ACADEMY A.I. VICTORY');
        }
      }
      const result=original.apply(this,arguments);
      window.setTimeout(renderRewardSummary,0);
      return result;
    };
  }

  /* Future campaign screen hook. Mission 1 can call this before startGame(). */
  window.bw159BeginCampaignMission=function(missionId='mission1',fieldId='mars'){
    if(typeof resetOnlineState==='function')resetOnlineState();
    window.BW159RequestedBattleMode='campaign';
    window.BW159RequestedMissionId=missionId;
    if(fieldId && battlefields[fieldId])setup.battlefield=fieldId;
    if(typeof renderSides==='function')renderSides();
    if(typeof showScreen==='function')showScreen('setup');
    if(typeof syncSetupScreenMode==='function')syncSetupScreenMode();
  };
})();
