/* ============================================================
   BEACON WARS v190 · FIRST COMMAND CAMPAIGN HONORS
   Persistent frame/title rewards plus the post-teaser award reveal.
   ============================================================ */
(function(){
  'use strict';

  const REWARD_FLAG='firstCommandCampaignComplete';
  const REVEAL_FLAG='firstCommandHonorsRevealed';
  const FRAME_ID='first_command';
  const TITLE_ID='first_command';
  let honorsDom=null;

  PROFILE_FRAME_ASSETS[FRAME_ID]='first_command_frame.png';
  PROFILE_FRAME_NAMES[FRAME_ID]='FIRST COMMAND';
  PROFILE_TITLE_ASSETS[TITLE_ID]='first_command_title.png';
  PROFILE_TITLE_NAMES[TITLE_ID]='FIRST COMMAND';

  function profile(){
    try{return getPlayerProfileData()}catch(err){return {}}
  }
  function save(data){
    try{savePlayerProfileData(data)}catch(err){}
    return data;
  }
  function completed(data=profile()){
    return data&&data[REWARD_FLAG]===true;
  }
  function wasRevealed(data=profile()){
    return data&&data[REVEAL_FLAG]===true;
  }
  function markRevealed(){
    const data=profile();
    data[REVEAL_FLAG]=true;
    save(data);
  }

  function installProfileChoices(){
    const gallery=document.querySelector('#playerProfile .profile-frame-gallery');
    if(gallery&&!gallery.querySelector('[data-profile-frame="first_command"]')){
      const none=gallery.querySelector('[data-profile-frame="none"]');
      const html=`<button class="profile-frame-choice first-command-frame-choice" data-profile-frame="first_command" type="button"
          onclick="selectProfileFrame('first_command')" title="FIRST COMMAND">
        <img src="first_command_frame_preview.png" alt="FIRST COMMAND profile frame">
        <span>FIRST COMMAND</span><b>SELECT</b>
      </button>`;
      if(none)none.insertAdjacentHTML('beforebegin',html);
      else gallery.insertAdjacentHTML('beforeend',html);
    }

    const titleScroll=document.querySelector('#profilePanelTitles .profile-title-scroll');
    if(titleScroll&&!titleScroll.querySelector('[data-profile-title="first_command"]')){
      const group=document.createElement('div');
      group.className='profile-title-group first-command-title-group';
      group.innerHTML=`<div class="profile-title-group-heading">
          <strong>CAMPAIGN HONORS</strong><span>1 TITLE</span>
        </div>
        <div class="profile-title-grid">
          <button class="profile-title-option first-command-title-option" data-profile-title="first_command" type="button"
              onclick="selectProfileTitle('first_command')">
            <img src="first_command_title.png" alt="First Command">
            <span>First Command</span><small>Complete the First Command campaign</small><b>LOCKED</b>
          </button>
        </div>`;
      titleScroll.appendChild(group);
    }
  }

  const previousFrameRule=bw127FrameRule;
  bw127FrameRule=function(frameId,stats=getPlayerStats()){
    if(frameId===FRAME_ID){
      const owned=completed();
      return {
        unlocked:owned,
        requirement:'Complete the First Command campaign',
        progress:owned?'CAMPAIGN COMPLETE':'CAMPAIGN REWARD'
      };
    }
    return previousFrameRule(frameId,stats);
  };

  const previousFrameUnlocked=isProfileFrameUnlocked;
  isProfileFrameUnlocked=function(frameId,stats=getPlayerStats()){
    if(frameId===FRAME_ID)return completed();
    return previousFrameUnlocked(frameId,stats);
  };

  const previousTitleUnlocked=isProfileTitleUnlocked;
  isProfileTitleUnlocked=function(titleId,stats=getPlayerStats()){
    if(titleId===TITLE_ID)return completed();
    return previousTitleUnlocked(titleId,stats);
  };

  const previousTitleRequirement=profileTitleRequirement;
  profileTitleRequirement=function(titleId){
    if(titleId===TITLE_ID){
      return completed()?'First Command campaign · Complete':'Complete the First Command campaign';
    }
    return previousTitleRequirement(titleId);
  };

  function refreshProfile(){
    installProfileChoices();
    try{updateProfileSelectionButtons(profile())}catch(err){}
    try{loadPlayerProfile()}catch(err){}
  }

  function grantCampaignHonors(){
    const data=profile();
    const newlyGranted=!completed(data);
    data[REWARD_FLAG]=true;
    save(data);
    refreshProfile();
    try{
      window.dispatchEvent(new CustomEvent('beaconWarsCampaignHonorsGranted',{
        detail:{frame:FRAME_ID,title:TITLE_ID,newlyGranted}
      }));
    }catch(err){}
    return newlyGranted;
  }

  function ensureHonors(){
    if(honorsDom&&honorsDom.root&&honorsDom.root.isConnected)return honorsDom;
    const app=document.getElementById('app')||document.body;
    const root=document.createElement('div');
    root.id='bw190CampaignHonors';
    root.setAttribute('role','dialog');
    root.setAttribute('aria-modal','true');
    root.setAttribute('aria-label','First Command campaign rewards');
    root.setAttribute('aria-hidden','true');
    root.innerHTML=`<div class="bw190-honors-backdrop" aria-hidden="true"></div>
      <section class="bw190-honors-panel">
        <div class="bw190-honors-kicker">STARFLEET CAMPAIGN RECORD</div>
        <h2>FIRST COMMAND COMPLETE</h2>
        <p>Your leadership of the Peregrine has earned two permanent profile honors.</p>
        <div class="bw190-honors-rewards">
          <article class="bw190-honors-card frame-card">
            <div class="bw190-honors-art"><img src="first_command_frame_preview.png" alt="First Command profile frame"></div>
            <small>PROFILE FRAME</small><strong>FIRST COMMAND</strong><span>UNLOCKED</span>
          </article>
          <article class="bw190-honors-card title-card">
            <div class="bw190-honors-art"><img src="first_command_title.png" alt="First Command profile title"></div>
            <small>PROFILE TITLE</small><strong>FIRST COMMAND</strong><span>UNLOCKED</span>
          </article>
        </div>
        <div class="bw190-honors-actions">
          <button class="bw190-equip" type="button">EQUIP BOTH</button>
          <button class="bw190-continue" type="button">CONTINUE</button>
        </div>
      </section>`;
    app.appendChild(root);
    honorsDom={
      root,
      equip:root.querySelector('.bw190-equip'),
      continueButton:root.querySelector('.bw190-continue')
    };
    honorsDom.equip.addEventListener('click',()=>{
      const data=profile();
      if(completed(data)){
        data.frame=FRAME_ID;
        data.title=TITLE_ID;
        save(data);
        refreshProfile();
      }
      try{if(typeof playSound==='function')playSound('commanderConfirmed',{volume:.8})}catch(err){}
      closeHonors();
    });
    honorsDom.continueButton.addEventListener('click',()=>{
      try{if(typeof playSound==='function')playSound('beep',{volume:.4})}catch(err){}
      closeHonors();
    });
    return honorsDom;
  }

  function showHonors(options={}){
    if(!completed())return false;
    const ui=ensureHonors();
    const data=profile();
    if(wasRevealed(data)&&options.force!==true)return false;
    ui.root.classList.remove('closing');
    ui.root.classList.add('active');
    ui.root.setAttribute('aria-hidden','false');
    window.setTimeout(()=>{try{ui.equip.focus({preventScroll:true})}catch(err){ui.equip.focus()}},80);
    return true;
  }

  function closeHonors(){
    const ui=honorsDom;if(!ui)return;
    if(ui.root.classList.contains('active'))markRevealed();
    ui.root.classList.add('closing');
    window.setTimeout(()=>{
      ui.root.classList.remove('active','closing');
      ui.root.setAttribute('aria-hidden','true');
    },220);
  }

  function schedulePendingHonors(delay=320){
    window.setTimeout(()=>{
      if(!completed()||wasRevealed())return;
      try{
        const story=window.BW180FirstCommandStory;
        if(story&&story.isReturnTeaserActive())return;
      }catch(err){}
      const menu=document.getElementById('menu');
      if(!menu||!menu.classList.contains('active')||menu.classList.contains('intro-active'))return;
      showHonors();
    },delay);
  }

  /* A player who completed Mission 3 in an earlier build still receives the
     honors. New completions use the normal post-teaser presentation. */
  function migrateCompletedCampaign(){
    let progress={};
    try{progress=JSON.parse(localStorage.getItem('beaconWarsV192CampaignProgress')||'{}')||{}}catch(err){}
    if(progress.mission3&&!completed())grantCampaignHonors();
  }

  if(typeof window.returnToCommandCenter==='function'){
    const previousReturnToCommandCenter=window.returnToCommandCenter;
    window.returnToCommandCenter=function(...args){
      const result=previousReturnToCommandCenter.apply(this,args);
      schedulePendingHonors();
      return result;
    };
  }

  if(typeof window.enterCommandCenter==='function'){
    const previousEnterCommandCenter=window.enterCommandCenter;
    window.enterCommandCenter=function(...args){
      const result=previousEnterCommandCenter.apply(this,args);
      schedulePendingHonors();
      return result;
    };
  }

  window.BW190FirstCommandHonors={
    grant:grantCampaignHonors,
    show:showHonors,
    close:closeHonors,
    installProfileChoices,
    isOwned:completed,
    wasRevealed,
    schedulePending:schedulePendingHonors
  };

  window.addEventListener('DOMContentLoaded',()=>{
    migrateCompletedCampaign();
    refreshProfile();
    schedulePendingHonors(500);
  });
  installProfileChoices();
})();
