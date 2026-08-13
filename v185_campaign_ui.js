/* Beacon Wars v188 · shared objective and completion presentation */
(function(){
  'use strict';

  const OBJECTIVES={
    mission1:{art:'mission_1_objectives.jpg',label:'Begin Mission 1'},
    mission2:{art:'mission_2_objectives.jpg',label:'Begin Mission 2'},
    mission3:{art:'mission_3_objectives.jpg',label:'Begin Mission 3'}
  };
  const PROGRESS_KEY='beaconWarsV192CampaignProgress';
  let beginCallback=null;
  let closing=false;

  function byId(id){return document.getElementById(id)}

  function readProgress(){
    try{return JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}')||{}}
    catch(err){return{}}
  }

  function saveBestTokens(missionId,count){
    const data=readProgress();
    data.completionTokens=data.completionTokens&&typeof data.completionTokens==='object'?data.completionTokens:{};
    data.completionTokens[missionId]=Math.max(Number(data.completionTokens[missionId])||0,count);
    try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(data))}catch(err){}
    return data.completionTokens[missionId];
  }

  function showObjective(missionId,onBegin){
    const overlay=byId('campaignObjectiveOverlay');
    const art=byId('campaignObjectiveArt');
    const button=byId('campaignObjectiveBegin');
    const config=OBJECTIVES[missionId];
    if(!overlay||!art||!button||!config){if(typeof onBegin==='function')onBegin();return}

    closing=false;
    beginCallback=typeof onBegin==='function'?onBegin:null;
    art.src=config.art;
    art.alt='Mission objectives';
    button.textContent='BEGIN MISSION';
    button.setAttribute('aria-label',config.label);
    overlay.classList.remove('closing','ship-arrived');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden','false');
    window.requestAnimationFrame(()=>window.requestAnimationFrame(()=>{
      overlay.classList.add('ship-arrived');
      button.focus({preventScroll:true});
    }));
  }

  function beginObjective(){
    if(closing)return;
    const overlay=byId('campaignObjectiveOverlay');
    if(!overlay)return;
    closing=true;
    const callback=beginCallback;
    beginCallback=null;

    /* Build and activate the destination mission while the objective art is
       still fully opaque. Fading first exposed whichever screen happened to
       be underneath: the Command Center for Mission 1 and the previous
       mission's completion panel for Missions 2 and 3. */
    if(callback)callback();
    overlay.classList.add('closing');
    window.setTimeout(()=>{
      overlay.classList.remove('active','closing','ship-arrived');
      overlay.setAttribute('aria-hidden','true');
      closing=false;
    },230);
  }

  function hideObjective(){
    const overlay=byId('campaignObjectiveOverlay');
    if(!overlay)return;
    beginCallback=null;closing=false;
    overlay.classList.remove('active','closing','ship-arrived');
    overlay.setAttribute('aria-hidden','true');
  }

  function calculateTokens(bonusAchieved,moves,moveTarget){
    return 1+(bonusAchieved?1:0)+(Number(moves)<=Number(moveTarget)?1:0);
  }

  function addToken(host){
    const crop=document.createElement('span');
    crop.className='campaign-completion-token';
    const img=document.createElement('img');
    img.src='completion_token.png';
    img.alt='Completion token';
    crop.appendChild(img);host.appendChild(crop);
  }

  function showCompletion(options){
    const opts=options||{};
    const result=byId(opts.resultId);
    const prefix=String(opts.prefix||'');
    if(!result||!prefix)return false;

    const moves=Math.max(0,Number(opts.moves)||0);
    const target=Math.max(0,Number(opts.moveTarget)||0);
    const bonus=!!opts.bonusAchieved;
    const tokens=calculateTokens(bonus,moves,target);
    saveBestTokens(opts.missionId,tokens);

    const xp=byId(prefix+'CompletionXP');
    const credits=byId(prefix+'CompletionCredits');
    const moveReadout=byId(prefix+'CompletionMoves');
    const tokenHost=byId(prefix+'CompletionTokens');
    const note=byId(prefix+'CompletionNote');
    if(xp)xp.textContent=String(Math.max(0,Number(opts.xp)||0));
    if(credits)credits.textContent='$'+String(Math.max(0,Number(opts.credits)||0));
    if(moveReadout)moveReadout.textContent=moves+' / '+target;
    if(tokenHost){tokenHost.innerHTML='';for(let i=0;i<tokens;i++)addToken(tokenHost)}
    if(note){
      const parts=['OBJECTIVE'];
      if(bonus)parts.push('BONUS');
      if(moves<=target)parts.push('MOVE TARGET');
      if(opts.firstClear)parts.push('FIRST CLEAR');
      note.textContent='SECURED · '+parts.join(' · ');
    }

    result.classList.remove('failure');
    result.classList.add('active');
    return true;
  }

  function hideResult(resultId){
    const result=byId(resultId);if(result)result.classList.remove('active','failure');
  }

  window.addEventListener('DOMContentLoaded',()=>{
    const button=byId('campaignObjectiveBegin');
    if(button)button.addEventListener('click',beginObjective);
  });

  window.BW185CampaignUI={
    showObjective,
    beginObjective,
    hideObjective,
    showCompletion,
    hideResult,
    calculateTokens,
    readProgress
  };
})();
