/* ============================================================
   BEACON WARS v189 · FIRST COMMAND STORY SYSTEM
   Cinematic campaign chapters, event-driven mission pop-ups, and
   scene-synchronized campaign audio and persistent tactic rewards.

   This module owns campaign presentation, audio, and reward ownership. Each
   mission remains an independent v179 gameplay engine and is launched through
   an explicit completion callback after its briefing.
   ============================================================ */
(function(){
  'use strict';

  const portraits={
    fleet:'fleet_captain_talk.png',
    battle:'battle_captain_talk.png',
    target:'target_specialist_talk.png',
    security:'security_chief_talk.png',
    recon:'recon_runner_talk.png',
    engineer:'tech_engineer_talk.png'
  };

  const tacticRewards={
    picardManeuver:{
      id:'SETUP_TACTIC_PICARD',
      tacticId:'picardManeuver',
      name:'Picard Maneuver',
      asset:'SETUP_TACTIC_PICARD.png',
      text:'Move the Commander any distance in a straight line for one activation. Once per match.',
      mission:'MISSION ONE'
    },
    sabotageProtocol:{
      id:'SETUP_TACTIC_SABOTAGE',
      tacticId:'sabotageProtocol',
      name:'Sabotage Protocol',
      asset:'SETUP_TACTIC_SABOTAGE.png',
      text:'Give the Commander the Tech Engineer’s ability to safely destroy up to 2 Shield Mines.',
      mission:'MISSION TWO'
    },
    batleth:{
      id:'SETUP_TACTIC_BATLETH',
      tacticId:'batleth',
      name:"Bat’leth",
      asset:'SETUP_TACTIC_BATLETH.png',
      text:'After moving, attack every enemy in the 1-square radius around the Commander.',
      mission:'MISSION THREE'
    }
  };

  const openingScenes=[
    {mode:'narration',bg:'S1.jpg',kicker:'FIRST COMMAND // THE PEREGRINE',speaker:'NAVIGATOR',body:'The USS Peregrine loses power during warp and makes an emergency landing on an unknown planet.',audio:'audio/first_command_sound_bit.mp3',audioChannel:'sound',audioVolume:1,exclusiveAudio:true,startCampaignScoreAfter:true},
    {mode:'dialogue',bg:'S1.jpg',portrait:portraits.fleet,panel:'right',kicker:'THE PEREGRINE // COMMAND DECK',speaker:'FLEET CAPTAIN',body:'First day in command and something had to go wrong.'},
    {mode:'command-opening',bg:'warp.jpg',deck:'first_command_ship_deck.png',logo:'first_command_logo.png',motion:'first-command-opening',button:'CONTINUE'},
    {mode:'dialogue',bg:'S2.jpg',portrait:portraits.battle,panel:'right',kicker:'THE PEREGRINE // SENSOR CONTACT',speaker:'BATTLE CAPTAIN',body:'Getting a reading from an unknown planet.'},
    {mode:'dialogue',bg:'S2.jpg',portrait:portraits.fleet,panel:'right',kicker:'THE PEREGRINE // COMMAND DECK',speaker:'FLEET CAPTAIN',body:'Take us down.'}
  ];

  const mission1Scenes=[
    {mode:'title',bg:'planet_bg.jpg',motion:'mission-start',kicker:'MISSION ONE',title:'BOLDLY GO!',body:'Identify three unknown lifeforms and return to the Peregrine.'},
    {mode:'dialogue',bg:'mission_1_talk_bg.jpg',portrait:portraits.target,panel:'right',kicker:'MISSION ONE // SURFACE TEAM',speaker:'TARGET SPECIALIST',body:'Captain, I’m detecting lifeforms, but nothing in our database matches them.'},
    {mode:'dialogue',bg:'mission_1_talk_bg.jpg',portrait:portraits.fleet,panel:'right',kicker:'MISSION ONE // COMMAND CHANNEL',speaker:'FLEET CAPTAIN',body:'Identify three of them, then everybody gets back to the Peregrine.',button:'BEGIN MISSION'}
  ];

  const thirdScanScenes=[
    {mode:'popup',portrait:portraits.target,panel:'right',kicker:'MISSION UPDATE // THIRD SCAN CONFIRMED',speaker:'TARGET SPECIALIST',body:'Species confirmed, Captain... and I’m fairly certain they already know we’re here.',button:'RETURN TO MISSION'}
  ];

  const mission2Scenes=[
    {mode:'title',bg:'planet_bg.jpg',motion:'mission-start',kicker:'MISSION TWO',title:'UNKNOWN PLANET',body:'While the team regroups, they discover one crew member never made it back.'},
    {mode:'dialogue',bg:'mission_2_talk_bg.jpg',portrait:portraits.fleet,panel:'right',kicker:'MISSION TWO // COMMAND CHANNEL',speaker:'FLEET CAPTAIN',body:'Hold on... where’s our Engineer?'},
    {mode:'dialogue',bg:'mission_2_talk_bg.jpg',portrait:portraits.security,panel:'left',kicker:'MISSION TWO // SURFACE TEAM',speaker:'SECURITY CHIEF',body:'His signal is coming from inside that structure, and he isn’t alone.'},
    {mode:'dialogue',bg:'mission_2_talk_bg.jpg',portrait:portraits.recon,panel:'right',kicker:'MISSION TWO // SURFACE TEAM',speaker:'RECON RUNNER',body:'You think they invited him over for dinner?',button:'BEGIN MISSION'}
  ];

  const engineerReleaseScenes=[
    {mode:'popup',portrait:portraits.engineer,panel:'left',kicker:'MISSION UPDATE // CELL RELEASED',speaker:'ENGINEER',body:'I was starting to wonder if you guys missed me.',button:'RETURN TO MISSION'}
  ];

  const mission3Scenes=[
    {mode:'title',bg:'planet_bg.jpg',motion:'mission-start',kicker:'MISSION THREE',title:'ESCAPE!',body:'The Engineer is recovered, but the route back to the Peregrine has been mined.'},
    {mode:'dialogue',bg:'mission_3_talk_bg.jpg',portrait:portraits.engineer,panel:'left',kicker:'MISSION THREE // SURFACE TEAM',speaker:'ENGINEER',body:'Good news, I found what we need. Bad news: we need to get through these mines to return with a stronger team.'},
    {mode:'dialogue',bg:'mission_3_talk_bg.jpg',portrait:portraits.security,panel:'left',kicker:'MISSION THREE // SURFACE TEAM',speaker:'SECURITY CHIEF',body:'Can you clear them?'},
    {mode:'dialogue',bg:'mission_3_talk_bg.jpg',portrait:portraits.engineer,panel:'left',kicker:'MISSION THREE // SURFACE TEAM',speaker:'ENGINEER',body:'Absolutely, assuming nobody decides to test one with their foot.'},
    {mode:'dialogue',bg:'mission_3_talk_bg.jpg',portrait:portraits.security,panel:'left',kicker:'MISSION THREE // SURFACE TEAM',speaker:'SECURITY CHIEF',body:'Then we’ll stay behind you.',button:'BEGIN MISSION'}
  ];

  const finaleScenes=[
    {mode:'popup',portrait:portraits.engineer,panel:'left',kicker:'MISSION UPDATE // EXTRACTION ROUTE CLEAR',speaker:'ENGINEER',body:'Path is clear, and I would strongly recommend we tell the Captain what I found.'},
    {mode:'narration',bg:'ship_crashed.jpg',kicker:'THE PEREGRINE // EMERGENCY BEACON',body:'The crew reaches the ship, but enemy forces have followed them and are attacking the emergency Beacon.',button:'VIEW MISSION RESULTS'}
  ];

  const returnTeaserFrames=[
    {src:'ship_space.jpg',hold:1500},
    {src:'S2.jpg',hold:1500},
    {src:'planet_bg.jpg',hold:1500},
    {src:'planet_close_bg.jpg',hold:1500},
    {src:'ship_crashed.jpg',hold:1500},
    {src:'next_mission.png',hold:1500},
    {src:'mission_menu.jpg',hold:3000,zoom:true,comingSoon:true}
  ];

  const runtime={active:false,scenes:[],index:0,onComplete:null,sceneSerial:0,startScoreOnFinish:false};
  const campaignSession={active:false,scoreReady:false,finale:false};
  const campaignScore=new Audio('audio/beyond_the_veil.mp3');
  campaignScore.preload='auto';
  campaignScore.loop=true;
  campaignScore.volume=.20;
  const returnTeaserAudio=new Audio('audio/first_contact_signal.mp3');
  returnTeaserAudio.preload='auto';
  returnTeaserAudio.loop=false;
  returnTeaserAudio.volume=.92;
  let dom=null;
  let mission3ReturnTeaserArmed=false;
  let returnTeaserActive=false;
  let returnTeaserTimer=0;
  let returnTeaserSwapTimer=0;
  let returnTeaserSerial=0;
  let returnTeaserDom=null;

  function audioScale(channel){
    try{
      const controls=window.BW191AudioOptions;
      if(!controls)return 1;
      return channel==='sound'?controls.soundScale():controls.musicScale();
    }catch(err){return 1}
  }

  function syncCampaignAudioLevels(){
    campaignScore.volume=.20*audioScale('music');
    returnTeaserAudio.volume=.92*audioScale('music');
    if(dom&&dom.audio&&runtime.active){
      const scene=runtime.scenes[runtime.index]||{};
      const base=Math.max(0,Math.min(1,Number(scene.audioVolume)||1));
      dom.audio.volume=base*audioScale(scene.audioChannel==='music'?'music':'sound');
    }
  }

  function safeCall(fn){
    if(typeof fn!=='function')return;
    try{fn()}catch(err){window.setTimeout(()=>{throw err},0)}
  }

  function ensureOverlay(){
    if(dom&&dom.root&&dom.root.isConnected)return dom;
    const app=document.getElementById('app')||document.body;
    const root=document.createElement('div');
    root.id='bw180StoryOverlay';
    root.setAttribute('role','dialog');
    root.setAttribute('aria-modal','true');
    root.setAttribute('aria-label','First Command campaign story');
    root.setAttribute('aria-hidden','true');
    root.innerHTML=`
      <img class="bw180-story-bg" alt="">
      <img class="bw189-command-deck" alt="" aria-hidden="true">
      <img class="bw189-command-logo" alt="FIRST COMMAND">
      <div class="bw180-story-shade" aria-hidden="true"></div>
      <img class="bw180-story-portrait" alt="">
      <div class="bw180-story-scanlines" aria-hidden="true"></div>
      <div class="bw180-story-header">FIRST COMMAND</div>
      <div class="bw180-story-progress" aria-hidden="true"><i></i></div>
      <button class="bw180-story-skip" type="button">SKIP STORY</button>
      <audio class="bw180-story-audio" preload="auto" aria-hidden="true"></audio>
      <section class="bw180-story-copy" aria-live="polite">
        <div class="bw180-story-kicker"></div>
        <h2 class="bw180-story-title"></h2>
        <div class="bw180-story-speaker"></div>
        <p class="bw180-story-body"></p>
        <div class="bw180-story-footer">
          <span class="bw180-story-count"></span>
          <button class="bw180-story-next" type="button">CONTINUE</button>
        </div>
      </section>`;
    app.appendChild(root);
    dom={
      root,
      bg:root.querySelector('.bw180-story-bg'),
      deck:root.querySelector('.bw189-command-deck'),
      logo:root.querySelector('.bw189-command-logo'),
      portrait:root.querySelector('.bw180-story-portrait'),
      kicker:root.querySelector('.bw180-story-kicker'),
      title:root.querySelector('.bw180-story-title'),
      speaker:root.querySelector('.bw180-story-speaker'),
      body:root.querySelector('.bw180-story-body'),
      count:root.querySelector('.bw180-story-count'),
      progress:root.querySelector('.bw180-story-progress i'),
      next:root.querySelector('.bw180-story-next'),
      skip:root.querySelector('.bw180-story-skip'),
      audio:root.querySelector('.bw180-story-audio')
    };
    dom.next.addEventListener('click',advance);
    dom.skip.addEventListener('click',finish);
    return dom;
  }

  function buttonSound(){
    try{if(typeof playSound==='function')playSound('beep',{volume:.34})}catch(err){}
  }

  function quietBackgroundAudio(){
    try{if(typeof bw125StopMenuMusic==='function')bw125StopMenuMusic()}catch(err){}
    try{if(typeof stopLoop==='function'){stopLoop('hum');stopLoop('matchAmbiance')}}catch(err){}
  }

  function ensureReturnTeaser(){
    if(returnTeaserDom&&returnTeaserDom.root&&returnTeaserDom.root.isConnected)return returnTeaserDom;
    const app=document.getElementById('app')||document.body;
    const root=document.createElement('div');
    root.id='bw186ReturnTeaser';
    root.setAttribute('aria-hidden','true');
    root.innerHTML=`
      <img class="bw186-teaser-frame is-current" alt="">
      <img class="bw186-teaser-frame is-next" alt="">
      <div class="bw188-teaser-coming-soon">COMING SOON</div>
      <div class="bw186-teaser-flash" aria-hidden="true"></div>`;
    app.appendChild(root);
    returnTeaserDom={
      root,
      current:root.querySelector('.is-current'),
      next:root.querySelector('.is-next'),
      flash:root.querySelector('.bw186-teaser-flash')
    };
    return returnTeaserDom;
  }

  function preloadReturnTeaser(){
    returnTeaserFrames.forEach(frame=>{const img=new Image();img.decoding='async';img.src=frame.src});
  }

  function stopReturnTeaserAudio(reset=true){
    returnTeaserAudio.onloadedmetadata=null;
    try{
      returnTeaserAudio.pause();
      if(reset)returnTeaserAudio.currentTime=0;
    }catch(err){}
  }

  function startReturnTeaserAudio(){
    stopReturnTeaserAudio(true);
    if(!campaignMusicEnabled())return;
    const start=()=>{
      /* The visual sequence lasts 12.54 seconds including its six flashes.
         Starting the 14.6-second stinger at 2.05 seconds aligns its tail with
         the final flash, where the Command Center loop begins underneath it. */
      try{returnTeaserAudio.currentTime=2.05}catch(err){}
      returnTeaserAudio.volume=.92*audioScale('music');
      try{
        const playback=returnTeaserAudio.play();
        if(playback&&typeof playback.catch==='function')playback.catch(()=>{});
      }catch(err){}
    };
    if(returnTeaserAudio.readyState>=1)start();
    else{
      returnTeaserAudio.onloadedmetadata=()=>{
        returnTeaserAudio.onloadedmetadata=null;
        if(returnTeaserActive)start();
      };
      try{returnTeaserAudio.load()}catch(err){}
    }
  }

  function stopReturnTeaser(){
    returnTeaserSerial++;
    if(returnTeaserTimer)window.clearTimeout(returnTeaserTimer);
    if(returnTeaserSwapTimer)window.clearTimeout(returnTeaserSwapTimer);
    returnTeaserTimer=0;returnTeaserSwapTimer=0;returnTeaserActive=false;
    stopReturnTeaserAudio(true);
    const ui=returnTeaserDom;
    if(!ui)return;
    ui.root.classList.remove('active','is-flashing','menu-zoom','coming-soon');
    ui.root.setAttribute('aria-hidden','true');
    ui.current.removeAttribute('src');ui.next.removeAttribute('src');
  }

  function startMenuBehindTeaser(){
    /* Start the actual Command Center and its music while the opaque teaser
       still covers the stage. The final flash then reveals an already-live
       menu with no audio gap. */
    abortCampaignSession({preserveTeaser:true,preserveMission3Return:true});
    try{if(typeof unlockAudio==='function')unlockAudio()}catch(err){}
    try{if(typeof startCommandCenterAudio==='function')startCommandCenterAudio({announce:false})}catch(err){}
    try{if(typeof showScreen==='function')showScreen('menu')}catch(err){}
    const menu=document.getElementById('menu');if(menu)menu.classList.remove('intro-active');
    try{if(typeof setCommandCamera==='function')setCommandCamera('center','COMMAND CENTER')}catch(err){}
    try{if(typeof startHubSimulation==='function')startHubSimulation()}catch(err){}
  }

  function playReturnTeaser(onComplete){
    if(returnTeaserActive)return;
    const ui=ensureReturnTeaser(),serial=++returnTeaserSerial;
    let index=0;
    try{if(window.BW190FirstCommandHonors)window.BW190FirstCommandHonors.grant()}catch(err){}
    returnTeaserActive=true;
    campaignSession.finale=true;
    campaignSession.scoreReady=false;
    stopCampaignScore(true);
    quietBackgroundAudio();
    startReturnTeaserAudio();
    ui.current.src=returnTeaserFrames[0].src;
    ui.current.classList.add('is-current');
    ui.next.removeAttribute('src');
    ui.root.classList.remove('is-flashing','menu-zoom','coming-soon');
    ui.root.classList.add('active');
    ui.root.setAttribute('aria-hidden','false');

    const finishTeaser=()=>{
      if(serial!==returnTeaserSerial)return;
      ui.root.classList.add('is-flashing');
      startMenuBehindTeaser();
      returnTeaserTimer=window.setTimeout(()=>{
        if(serial!==returnTeaserSerial)return;
        ui.root.classList.remove('active','is-flashing','menu-zoom','coming-soon');
        ui.root.setAttribute('aria-hidden','true');
        returnTeaserActive=false;returnTeaserTimer=0;
        stopReturnTeaserAudio(true);
        try{if(window.BW190FirstCommandHonors)window.BW190FirstCommandHonors.show()}catch(err){}
        safeCall(onComplete);
      },180);
    };

    const scheduleFrame=()=>{
      const frame=returnTeaserFrames[index];
      ui.root.classList.toggle('menu-zoom',!!frame.zoom);
      ui.root.classList.toggle('coming-soon',!!frame.comingSoon);
      returnTeaserTimer=window.setTimeout(()=>{
        if(serial!==returnTeaserSerial)return;
        if(index>=returnTeaserFrames.length-1){finishTeaser();return}
        const nextFrame=returnTeaserFrames[index+1];
        ui.next.src=nextFrame.src;
        ui.root.classList.add('is-flashing');
        returnTeaserSwapTimer=window.setTimeout(()=>{
          if(serial!==returnTeaserSerial)return;
          const oldCurrent=ui.current;ui.current=ui.next;ui.next=oldCurrent;
          ui.current.classList.add('is-current');ui.next.classList.remove('is-current');
          ui.next.removeAttribute('src');
          returnTeaserSwapTimer=0;
          index++;
          ui.root.classList.toggle('menu-zoom',!!returnTeaserFrames[index].zoom);
          ui.root.classList.toggle('coming-soon',!!returnTeaserFrames[index].comingSoon);
          window.requestAnimationFrame(()=>ui.root.classList.remove('is-flashing'));
          scheduleFrame();
        },90);
      },frame.hold);
    };
    scheduleFrame();
  }

  function campaignMusicEnabled(){
    return typeof settings!=='object'||!settings||settings.music!==false;
  }

  function stopCampaignScore(reset=false){
    try{
      campaignScore.pause();
      if(reset)campaignScore.currentTime=0;
    }catch(err){}
  }

  function resumeCampaignScore(){
    if(!campaignSession.active||!campaignSession.scoreReady||campaignSession.finale||!campaignMusicEnabled())return;
    quietBackgroundAudio();
    campaignScore.loop=true;
    campaignScore.volume=.20*audioScale('music');
    try{
      const playback=campaignScore.play();
      if(playback&&typeof playback.catch==='function')playback.catch(()=>{});
    }catch(err){}
  }

  function armCampaignScore(){
    if(!campaignSession.active||campaignSession.finale)return;
    if(!campaignSession.scoreReady){
      campaignSession.scoreReady=true;
      try{campaignScore.currentTime=0}catch(err){}
    }
    resumeCampaignScore();
  }

  function beginCampaignSession(){
    abortCampaignSession();
    campaignSession.active=true;
    campaignSession.scoreReady=false;
    campaignSession.finale=false;
    stopCampaignScore(true);
  }

  function stopSceneAudio(ui=dom){
    runtime.sceneSerial++;
    if(!ui||!ui.root)return;
    ui.root.classList.remove('bw181-coming-soon-visible','bw181-coming-soon-ending');
    ui.root.style.removeProperty('--bw181-finale-fade-in');
    ui.root.style.removeProperty('--bw181-finale-fade-out');
    if(!ui.audio)return;
    ui.audio.onloadedmetadata=null;
    ui.audio.ontimeupdate=null;
    ui.audio.onended=null;
    ui.audio.onerror=null;
    try{ui.audio.pause();ui.audio.currentTime=0}catch(err){}
    ui.audio.removeAttribute('src');
  }

  function sceneAudioEnabled(scene){
    if(!scene.audio)return false;
    if(typeof settings!=='object'||!settings)return true;
    return scene.audioChannel==='music'?settings.music!==false:settings.sound!==false;
  }

  function startSceneAudio(scene,ui){
    if(scene.audioChannel==='music'&&scene.exclusiveAudio&&campaignSession.active){
      campaignSession.finale=true;
      campaignSession.scoreReady=false;
      stopCampaignScore(true);
    }
    if(!sceneAudioEnabled(scene)||!ui.audio)return;
    if(scene.exclusiveAudio)quietBackgroundAudio();

    const serial=++runtime.sceneSerial;
    const audio=ui.audio;
    audio.src=scene.audio;
    audio.preload='auto';
    audio.volume=Math.max(0,Math.min(1,Number(scene.audioVolume)||1))*audioScale(scene.audioChannel==='music'?'music':'sound');

    const beginFinaleFade=()=>{
      if(serial!==runtime.sceneSerial||scene.cinematic!=='coming-soon')return;
      const duration=Number(audio.duration),current=Number(audio.currentTime);
      if(!Number.isFinite(duration)||!Number.isFinite(current)||duration<=0)return;
      const remaining=Math.max(0,duration-current);
      const fadeOut=Math.max(.4,Number(scene.fadeOut)||4);
      if(remaining<=fadeOut&&!ui.root.classList.contains('bw181-coming-soon-ending')){
        ui.root.style.setProperty('--bw181-finale-fade-out',Math.max(.25,remaining)+'s');
        ui.root.classList.add('bw181-coming-soon-ending');
      }
    };

    audio.onloadedmetadata=()=>{
      if(serial!==runtime.sceneSerial)return;
      if(scene.cinematic==='coming-soon'){
        ui.root.style.setProperty('--bw181-finale-fade-in',Math.max(.4,Number(scene.fadeIn)||4)+'s');
        ui.root.style.setProperty('--bw181-finale-fade-out',Math.max(.4,Number(scene.fadeOut)||4)+'s');
      }
    };
    audio.ontimeupdate=beginFinaleFade;
    audio.onended=()=>{
      if(serial!==runtime.sceneSerial)return;
      if(scene.startCampaignScoreAfter)armCampaignScore();
      if(scene.cinematic==='coming-soon')ui.root.classList.add('bw181-coming-soon-ending');
      if(scene.autoFinishOnAudioEnd)finish();
    };
    audio.onerror=()=>{if(scene.startCampaignScoreAfter)armCampaignScore()};
    try{
      audio.currentTime=0;
      const playback=audio.play();
      if(playback&&typeof playback.catch==='function')playback.catch(()=>{});
    }catch(err){}
  }

  function renderScene(){
    const ui=ensureOverlay(),scene=runtime.scenes[runtime.index];
    if(!scene){finish();return}
    stopSceneAudio(ui);
    ui.root.dataset.mode=scene.mode||'dialogue';
    ui.root.dataset.panel=scene.panel||'center';
    if(scene.motion)ui.root.dataset.motion=scene.motion;
    else delete ui.root.dataset.motion;
    if(scene.cinematic)ui.root.dataset.cinematic=scene.cinematic;
    else delete ui.root.dataset.cinematic;
    if(scene.bg){ui.bg.src=scene.bg;ui.bg.style.display='block'}
    else{ui.bg.removeAttribute('src');ui.bg.style.display='none'}
    if(scene.deck){ui.deck.src=scene.deck;ui.deck.style.display='block'}
    else{ui.deck.removeAttribute('src');ui.deck.style.display='none'}
    if(scene.logo){ui.logo.src=scene.logo;ui.logo.style.display='block'}
    else{ui.logo.removeAttribute('src');ui.logo.style.display='none'}
    if(scene.portrait){ui.portrait.src=scene.portrait;ui.portrait.alt=scene.portraitAlt||'';ui.portrait.style.display='block'}
    else{ui.portrait.removeAttribute('src');ui.portrait.alt='';ui.portrait.style.display='none'}
    ui.kicker.textContent=scene.kicker||'';
    ui.title.textContent=scene.title||'';
    ui.speaker.textContent=scene.speaker||'';
    ui.speaker.style.display=scene.speaker?'block':'none';
    ui.body.textContent=scene.body||'';
    ui.count.textContent=String(runtime.index+1).padStart(2,'0')+' / '+String(runtime.scenes.length).padStart(2,'0');
    ui.progress.style.width=((runtime.index+1)/runtime.scenes.length*100)+'%';
    ui.next.textContent=scene.button||(runtime.index===runtime.scenes.length-1?'CONTINUE':'NEXT');
    ui.skip.hidden=scene.mode==='reward';
    ui.root.classList.remove('scene-enter','bw181-coming-soon-visible','bw181-coming-soon-ending');
    void ui.root.offsetWidth;
    ui.root.classList.add('scene-enter');
    if(scene.cinematic==='coming-soon'){
      ui.root.style.setProperty('--bw181-finale-fade-in',Math.max(.4,Number(scene.fadeIn)||4)+'s');
      ui.root.style.setProperty('--bw181-finale-fade-out',Math.max(.4,Number(scene.fadeOut)||4)+'s');
      window.requestAnimationFrame(()=>{
        if(runtime.active&&runtime.scenes[runtime.index]===scene)ui.root.classList.add('bw181-coming-soon-visible');
      });
    }
    startSceneAudio(scene,ui);
    window.setTimeout(()=>{try{ui.next.focus({preventScroll:true})}catch(err){ui.next.focus()}},40);
  }

  function play(scenes,onComplete,options={}){
    if(!Array.isArray(scenes)||!scenes.length){safeCall(onComplete);return}
    const ui=ensureOverlay();
    runtime.active=true;
    runtime.scenes=scenes.slice();
    runtime.index=0;
    runtime.onComplete=onComplete;
    runtime.startScoreOnFinish=options.startScoreOnFinish===true;
    ui.root.classList.add('active');
    ui.root.setAttribute('aria-hidden','false');
    const app=document.getElementById('app');
    if(app)app.classList.add('bw180-story-active');
    renderScene();
  }

  function advance(){
    if(!runtime.active)return;
    buttonSound();
    const leavingScene=runtime.scenes[runtime.index];
    if(runtime.index<runtime.scenes.length-1){
      runtime.index++;
      renderScene();
      if(leavingScene&&leavingScene.startCampaignScoreAfter)armCampaignScore();
      return;
    }
    finish();
  }

  function finish(){
    if(!runtime.active)return;
    const ui=ensureOverlay(),done=runtime.onComplete,startScore=runtime.startScoreOnFinish;
    runtime.active=false;
    runtime.scenes=[];
    runtime.index=0;
    runtime.onComplete=null;
    runtime.startScoreOnFinish=false;
    stopSceneAudio(ui);
    ui.root.classList.remove('active','scene-enter');
    ui.root.setAttribute('aria-hidden','true');
    delete ui.root.dataset.cinematic;
    delete ui.root.dataset.motion;
    const app=document.getElementById('app');
    if(app)app.classList.remove('bw180-story-active');
    if(startScore)armCampaignScore();
    safeCall(done);
  }

  function abortCampaignSession(options={}){
    const ui=dom;
    if(runtime.active){
      runtime.active=false;
      runtime.scenes=[];
      runtime.index=0;
      runtime.onComplete=null;
      runtime.startScoreOnFinish=false;
      stopSceneAudio(ui);
      if(ui&&ui.root){
        ui.root.classList.remove('active','scene-enter');
        ui.root.setAttribute('aria-hidden','true');
        delete ui.root.dataset.cinematic;
        delete ui.root.dataset.motion;
      }
      const app=document.getElementById('app');
      if(app)app.classList.remove('bw180-story-active');
    }
    campaignSession.active=false;
    campaignSession.scoreReady=false;
    campaignSession.finale=false;
    stopCampaignScore(true);
    if(!options.preserveMission3Return)mission3ReturnTeaserArmed=false;
    if(!options.preserveTeaser)stopReturnTeaser();
  }

  function normalizeTacticId(value){
    return String(value||'').trim().replace(/\.png$/i,'').toUpperCase();
  }

  function profileOwnsTactic(rewardKey){
    const reward=tacticRewards[rewardKey];
    if(!reward)return false;
    let data={};
    try{
      data=typeof getPlayerProfileData==='function'
        ? getPlayerProfileData()
        : JSON.parse(localStorage.getItem('beaconWarsV192PlayerProfile')||'{}');
    }catch(err){}
    const owned=[];
    ['unlockedTactics','ownedTactics'].forEach(key=>{
      if(Array.isArray(data&&data[key]))owned.push(...data[key]);
    });
    const accepted=new Set([
      normalizeTacticId(reward.id),
      normalizeTacticId(reward.asset),
      normalizeTacticId(rewardKey)
    ]);
    return owned.some(id=>accepted.has(normalizeTacticId(id)));
  }

  function syncUnlockedTactics(){
    if(typeof tactics==='undefined'||!Array.isArray(tactics))return [];
    const available=[];
    Object.entries(tacticRewards).forEach(([rewardKey,reward])=>{
      if(!profileOwnsTactic(rewardKey))return;
      available.push(reward.tacticId);
      if(!tactics.some(tactic=>tactic.id===reward.tacticId)){
        tactics.push({id:reward.tacticId,name:reward.name,text:reward.text,campaignReward:true});
      }
    });
    try{if(typeof renderTactics==='function')renderTactics()}catch(err){}
    try{if(typeof bw119UpdateBriefing==='function')bw119UpdateBriefing()}catch(err){}
    return available;
  }

  function grantTactic(rewardKey){
    const reward=tacticRewards[rewardKey];
    if(!reward||profileOwnsTactic(rewardKey))return false;
    let data={};
    try{data=typeof getPlayerProfileData==='function'?getPlayerProfileData():{}}catch(err){}
    const unlocked=Array.isArray(data.unlockedTactics)?data.unlockedTactics.slice():[];
    unlocked.push(reward.id);
    data.unlockedTactics=[...new Set(unlocked.map(id=>normalizeTacticId(id)).filter(Boolean))];
    try{
      if(typeof savePlayerProfileData==='function')savePlayerProfileData(data);
      else localStorage.setItem('beaconWarsV192PlayerProfile',JSON.stringify(data));
    }catch(err){}
    syncUnlockedTactics();
    try{window.dispatchEvent(new CustomEvent('beaconWarsTacticUnlocked',{detail:{...reward,key:rewardKey}}))}catch(err){}
    return true;
  }

  function showTacticReward(rewardKey,onComplete){
    const reward=tacticRewards[rewardKey];
    if(!reward||!grantTactic(rewardKey)){
      safeCall(onComplete);
      return false;
    }
    play([{
      mode:'reward',
      portrait:reward.asset,
      portraitAlt:reward.name+' tactic card',
      panel:'right',
      kicker:reward.mission+' // CAMPAIGN REWARD',
      title:'NEW TACTIC UNLOCKED',
      speaker:reward.name,
      body:'This tactic has been added to your collection.',
      button:'CONTINUE'
    }],onComplete);
    return true;
  }

  const preloadAssets=[
    'warp.jpg','first_command_ship_deck.png','first_command_logo.png','S1.jpg','S2.jpg','planet_bg.jpg','planet_close_bg.jpg','ship_crashed.jpg',
    'first_command_frame.png','first_command_frame_preview.png','first_command_title.png',
    'ship_space.jpg','next_mission.png','mission_menu.jpg',
    'mission_1_talk_bg.jpg','mission_2_talk_bg.jpg','mission_3_talk_bg.jpg',
    ...Object.values(portraits),...Object.values(tacticRewards).map(reward=>reward.asset)
  ];
  preloadAssets.forEach(src=>{const img=new Image();img.decoding='async';img.src=src});
  preloadReturnTeaser();
  ['audio/first_command_sound_bit.mp3','audio/beyond_the_veil.mp3','audio/first_contact_signal.mp3'].forEach(src=>{
    try{const audio=new Audio();audio.preload='auto';audio.src=src}catch(err){}
  });

  syncUnlockedTactics();
  window.addEventListener('beaconWarsTacticUnlocked',syncUnlockedTactics);

  document.addEventListener('keydown',event=>{
    if(!runtime.active)return;
    if(event.key==='Enter'||event.key===' '||event.key==='ArrowRight'){
      event.preventDefault();advance();
    }else if(event.key==='Escape'){
      event.preventDefault();finish();
    }
  });

  if(typeof window.startMatchAudio==='function'){
    const previousStartMatchAudio=window.startMatchAudio;
    window.startMatchAudio=function(...args){
      if(campaignSession.active){
        quietBackgroundAudio();
        resumeCampaignScore();
        return;
      }
      return previousStartMatchAudio.apply(this,args);
    };
  }

  if(typeof window.toggleSetting==='function'){
    const previousToggleSetting=window.toggleSetting;
    window.toggleSetting=function(key,...args){
      const result=previousToggleSetting.call(this,key,...args);
      if(key==='music'&&campaignSession.active){
        if(campaignMusicEnabled())resumeCampaignScore();
        else stopCampaignScore(false);
      }
      return result;
    };
  }

  if(typeof window.returnToCommandCenter==='function'){
    const previousReturnToCommandCenter=window.returnToCommandCenter;
    window.returnToCommandCenter=function(...args){
      if(mission3ReturnTeaserArmed&&!returnTeaserActive){
        mission3ReturnTeaserArmed=false;
        playReturnTeaser();
        return;
      }
      abortCampaignSession();
      return previousReturnToCommandCenter.apply(this,args);
    };
  }

  if(typeof window.showTitleMenu==='function'){
    const previousShowTitleMenu=window.showTitleMenu;
    window.showTitleMenu=function(...args){
      abortCampaignSession();
      return previousShowTitleMenu.apply(this,args);
    };
  }

  window.BW180FirstCommandStory={
    startCampaign:onComplete=>{
      beginCampaignSession();
      play([...openingScenes,...mission1Scenes],onComplete,{startScoreOnFinish:true});
    },
    playMission2Intro:onComplete=>play(mission2Scenes,onComplete),
    playMission3Intro:onComplete=>play(mission3Scenes,onComplete),
    onThirdScan:onComplete=>play(thirdScanScenes,onComplete),
    onEngineerReleased:onComplete=>play(engineerReleaseScenes,onComplete),
    onMission3Complete:onComplete=>{
      mission3ReturnTeaserArmed=true;
      play(finaleScenes,onComplete);
    },
    showTacticReward,
    hasTactic:profileOwnsTactic,
    syncUnlockedTactics,
    leaveCampaign:abortCampaignSession,
    isCampaignActive:()=>campaignSession.active,
    campaignScoreState:()=>({
      active:campaignSession.active,
      ready:campaignSession.scoreReady,
      finale:campaignSession.finale,
      paused:campaignScore.paused,
      currentTime:Number(campaignScore.currentTime)||0,
      volume:campaignScore.volume,
      loop:campaignScore.loop,
      src:campaignScore.getAttribute?campaignScore.getAttribute('src'):'audio/beyond_the_veil.mp3'
    }),
    isActive:()=>runtime.active,
    isReturnTeaserArmed:()=>mission3ReturnTeaserArmed,
    isReturnTeaserActive:()=>returnTeaserActive,
    disarmMission3ReturnTeaser:()=>{mission3ReturnTeaserArmed=false},
    returnTeaserAudioState:()=>({
      paused:returnTeaserAudio.paused,
      currentTime:Number(returnTeaserAudio.currentTime)||0,
      volume:returnTeaserAudio.volume,
      src:returnTeaserAudio.getAttribute?returnTeaserAudio.getAttribute('src'):'audio/first_contact_signal.mp3'
    }),
    playReturnTeaser,
    returnTeaserFrames:returnTeaserFrames.map(frame=>({...frame})),
    syncAudioLevels:syncCampaignAudioLevels,
    currentScene:()=>runtime.active?{...runtime.scenes[runtime.index],index:runtime.index,total:runtime.scenes.length}:null,
    advance,
    skip:finish,
    sequences:{
      opening:openingScenes,
      mission1:mission1Scenes,
      thirdScan:thirdScanScenes,
      mission2:mission2Scenes,
      engineerRelease:engineerReleaseScenes,
      mission3:mission3Scenes,
      finale:finaleScenes,
      tacticRewards
    },
    tacticRewards
  };
})();
