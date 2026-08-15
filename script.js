/* =========================================================
   BEACON WARS v194 SMART ACADEMY A.I. CORE
   =========================================================
   1. CONFIG: board constants, art, units, tactics, battlefields
   2. SETUP UI: side, commander, tactic, battlefield cards
   3. GAME INIT: map loading, deployment safety, board reset
   4. BOARD HELPERS: blocked cells, center coordinates, placement
   5. RENDERING: unit tray, board pieces, markers, console
   6. INPUT: click, drag, scan confirm, tactical warp confirm
   7. COMBAT: rank resolution, mines, beacon, commander defeat
   8. AI: fair/no-psychic movement and attack scoring
   9. UTILITY: logs, modals, calibration, help screen
*/
const ROWS=8, COLS=10, BLUE='blue', RED='red';
const settings={sound:true,music:true};

/* =========================================================
   v69 AUDIO SYSTEM
   ========================================================= */
const AUDIO_FILES={
  beep:'audio/beep.mp3',
  back:'audio/longer_beep.mp3',
  hum:'audio/hum.mp3',
  teleport:'audio/teleport.mp3',
  shipWarp:'audio/ship_warp.mp3',
  redAlert:'audio/red_alert.mp3',
  matchAmbiance:'audio/star_ship_ambiance.mp3',
  simulationReady:'audio/simulation_ready.mp3',
  commanderConfirmed:'audio/commander_confirmed.mp3',
  mirlock:'audio/give_us_motion.mp3',
  jayy:'audio/jayy.mp3',
  jamal:'audio/jamal.mp3',
  attack:'audio/attack.mp3',
  movePiece:'audio/move_piece.mp3',
  scanner:'audio/use_scanner.mp3',
  shields:'audio/shields.mp3',
  bomb:'audio/bomb.mp3',
  win:'audio/win.mp3',
  intro:'audio/intro.mp3'
};
const audioBus={
  unlocked:false,
  simulationTimer:null,
  loops:{
    hum:new Audio(AUDIO_FILES.hum),
    matchAmbiance:new Audio(AUDIO_FILES.matchAmbiance)
  }
};
audioBus.loops.hum.loop=true;
audioBus.loops.hum.volume=.18;
audioBus.loops.matchAmbiance.loop=true;
audioBus.loops.matchAmbiance.volume=.20;

function unlockAudio(){audioBus.unlocked=true;}
function playSound(name,{volume=1,delay=0}={}){
  if(!settings.sound || !AUDIO_FILES[name]) return;
  const run=()=>{
    const sound=new Audio(AUDIO_FILES[name]);
    sound.volume=Math.max(0,Math.min(1,volume));
    sound.play().catch(()=>{});
  };
  if(delay>0) window.setTimeout(run,delay); else run();
}
function stopLoop(name){
  const loop=audioBus.loops[name];
  if(!loop) return;
  loop.pause();
  loop.currentTime=0;
}
function startLoop(name){
  const loop=audioBus.loops[name];
  if(!loop || !settings.music) return;
  Object.entries(audioBus.loops).forEach(([key,audio])=>{if(key!==name){audio.pause();audio.currentTime=0;}});
  loop.play().catch(()=>{});
}
function startCommandCenterAudio({announce=false}={}){
  stopLoop('matchAmbiance');
  startLoop('hum');
  if(audioBus.simulationTimer) clearTimeout(audioBus.simulationTimer);
  if(announce){
    audioBus.simulationTimer=window.setTimeout(()=>playSound('simulationReady',{volume:.9}),3000);
  }
}
function startMatchAudio(){
  if(audioBus.simulationTimer) clearTimeout(audioBus.simulationTimer);
  stopLoop('hum');
  startLoop('matchAmbiance');
}
function playBeaconAlert(){playSound('redAlert',{volume:.9});}

// Menu sound language: short beep moves forward, long beep moves back.
document.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button || button.closest('#game')) return;
  unlockAudio();
  const label=(button.textContent||button.getAttribute('aria-label')||'').trim().toUpperCase();
  const isBack=button.classList.contains('database-back') || button.classList.contains('communications-back') || button.classList.contains('ai-back-button') || button.classList.contains('btn-red') || /BACK|RETURN TO COMMAND CENTER/.test(label);
  playSound(isBack?'back':'beep',{volume:isBack?.8:.55});
},{capture:true});
const setup={side:'blue', commander:'fleet', tactic:'tacticalWarp', battlefield:'mars'};
const onlineState={
  enabled:false,
  role:'local',
  roomCode:null,
  hostColor:null,
  playerColor:null,
  opponentColor:null,
  firstAttackTeam:null,
  firebaseReady:false,
  uid:null,
  roomUnsub:null,
  moveSeq:0,
  firebaseError:null,
  pendingCommit:false,
  lastCommitId:null,
  lastRoomData:null,
  pendingMove:null,
  lastAppliedCommitId:null,
  opponentDeploymentId:null,
  opponentProfile:null,
  lastReactionId:null,
  resultRecorded:false
};
let showCenterDots=false, showAllEnemies=false;

// Main rule: the middle of the A on the base is the anchor.
// Every piece is normalized to 118 x 129. This anchor can be nudged live.
const BASE_ANCHOR = {x:54, y:119};
let anchorOffset = {x:0,y:0};

// Hidden pieces use the exact same 118x129 canvas and A/base anchor path
// as every visible game piece. There is no second grid, legacy question-mark
// offset, row scaling, or perspective correction layer.
const HIDDEN_BW_ASSET={
  [BLUE]:'HIDDEN_BW_BLUE_EXACT.png',
  [RED]:'HIDDEN_BW_RED_EXACT.png'
};
function hiddenBWAsset(team){return HIDDEN_BW_ASSET[team]||HIDDEN_BW_ASSET[RED]}

const TILE_CENTERS=[
  [{x:555.5,y:748.3},{x:646.5,y:748.3},{x:737.4,y:748.3},{x:828.3,y:748.3},{x:919.2,y:748.3},{x:1010.1,y:748.3},{x:1101.0,y:748.3},{x:1192.0,y:748.3},{x:1282.9,y:748.3},{x:1373.8,y:748.3}],
  [{x:569.1,y:677.0},{x:657.0,y:677.0},{x:744.9,y:677.0},{x:832.7,y:677.0},{x:920.6,y:677.0},{x:1008.4,y:677.0},{x:1096.3,y:677.0},{x:1184.1,y:677.0},{x:1272.0,y:677.0},{x:1359.9,y:677.0}],
  [{x:582.7,y:605.8},{x:667.5,y:605.8},{x:752.3,y:605.8},{x:837.1,y:605.8},{x:921.9,y:605.8},{x:1006.7,y:605.8},{x:1091.5,y:605.8},{x:1176.3,y:605.8},{x:1261.1,y:605.8},{x:1345.9,y:605.8}],
  [{x:596.4,y:534.6},{x:678.1,y:534.6},{x:759.8,y:534.6},{x:841.6,y:534.6},{x:923.3,y:534.6},{x:1005.0,y:534.6},{x:1086.8,y:534.6},{x:1168.5,y:534.6},{x:1250.3,y:534.6},{x:1332.0,y:534.6}],
  [{x:610.0,y:463.4},{x:688.6,y:463.4},{x:767.3,y:463.4},{x:846.0,y:463.4},{x:924.7,y:463.4},{x:1003.3,y:463.4},{x:1082.0,y:463.4},{x:1160.7,y:463.4},{x:1239.4,y:463.4},{x:1318.1,y:463.4}],
  [{x:623.6,y:392.1},{x:699.2,y:392.1},{x:774.8,y:392.1},{x:850.4,y:392.1},{x:926.0,y:392.1},{x:1001.6,y:392.1},{x:1077.3,y:392.1},{x:1152.9,y:392.1},{x:1228.5,y:392.1},{x:1304.1,y:392.1}],
  [{x:637.2,y:320.9},{x:709.7,y:320.9},{x:782.3,y:320.9},{x:854.8,y:320.9},{x:927.4,y:320.9},{x:1000.0,y:320.9},{x:1072.5,y:320.9},{x:1145.1,y:320.9},{x:1217.6,y:320.9},{x:1290.2,y:320.9}],
  [{x:650.8,y:249.7},{x:720.3,y:249.7},{x:789.8,y:249.7},{x:859.3,y:249.7},{x:928.8,y:249.7},{x:998.3,y:249.7},{x:1067.8,y:249.7},{x:1137.3,y:249.7},{x:1206.8,y:249.7},{x:1276.2,y:249.7}]
];

const tactics=[
  {id:'tacticalWarp', name:'Tactical Warp', text:'Teleport the Commander up to 3 spaces.'},
  {id:'emergencyShield', name:'Emergency Shield', text:'Protects the Commander from one otherwise-losing attack, including a bomb attack. The shield is consumed immediately when attacked.'}
];

const battlefields={
  mars:{
    id:'mars',
    name:'Mars Training Grounds',
    image:'MARS_BATTLE_BOARD.png',
    desc:'Open red-planet training terrain with wreckage lanes.',
    status:'Original training map',
    log:'Mars Training Grounds',
    blocked:['3,2','3,3','4,2','4,3','3,6','3,7','4,6','4,7']
  }
};
function currentBattlefield(){return battlefields[setup.battlefield]||battlefields.mars;}


// Deployment rows are locked: AI owns the top 3 rows, player owns the bottom 3 rows.
// Middle rows are the only safe place for impassable objects on an 8x10 board.
const AI_DEPLOY_ROWS=[0,1,2];
const PLAYER_DEPLOY_ROWS=[5,6,7];
const SAFE_BLOCK_ROWS=[3,4];

function totalUnitCount(){return unitDefs.reduce((sum,def)=>sum+def.count,0)}
function isDeployRow(r){return AI_DEPLOY_ROWS.includes(r)||PLAYER_DEPLOY_ROWS.includes(r)}
function normalizeBlockedCells(rawCells){
  const clean=[];
  const seen=new Set();
  (rawCells||[]).forEach(cell=>{
    const [r,c]=String(cell).split(',').map(Number);
    if(!Number.isInteger(r)||!Number.isInteger(c)) return;
    if(r<0||r>=ROWS||c<0||c>=COLS) return;
    // Do not allow battlefield blockers to steal deployment squares.
    if(isDeployRow(r)) return;
    const key=`${r},${c}`;
    if(!seen.has(key)){seen.add(key);clean.push(key)}
  });
  return clean;
}
function deploymentSpots(rows){
  const spots=[];
  rows.forEach(r=>{
    for(let c=0;c<COLS;c++){
      if(!isBlocked(r,c) && !board[r][c]) spots.push([r,c]);
    }
  });
  return spots;
}
function assertDeploymentCapacity(label, spots){
  const needed=totalNeeded();
  if(spots.length<needed){
    console.warn(`${label} has only ${spots.length} deployment spaces for ${needed} units. Check battlefield blocked cells.`);
    return false;
  }
  return true;
}

const commanders=[
  {id:'fleet', name:'Fleet Commander', role:'Standard Academy command profile.', piece:'CMD_FLEET.png', redPiece:'RED_CMD_FLEET.png', profile:'PROF_CMD_FLEET.jpg'},
  {id:'mirlock', name:'Commander Mirlock', role:'Aggressive field commander.', piece:'CMD_MIRLOCK.png', redPiece:'RED_CMD_MIRLOCK.png', profile:'PROF_CMD_MIRLOCK.jpg'},
  {id:'naya', name:'Commander Naya', role:'Calm tactical specialist.', piece:'CMD_NAYA.png', redPiece:'RED_CMD_NAYA.png', profile:'PROF_CMD_NAYA.jpg'},
  {id:'jay', name:'Commander Jayy', role:'Bold frontline leader.', piece:'CMD_JAY.png', redPiece:'RED_CMD_JAY.png', profile:'PROF_CMD_JAY.jpg'}
];

function currentCommander(){
  return commanders.find(c=>c.id===setup.commander)||commanders[0];
}
function playerTeam(){return setup.side===RED?RED:BLUE}
function enemyTeam(){return playerTeam()===BLUE?RED:BLUE}
function teamLabel(team){return team===RED?'RED':'BLUE'}
function sideLabel(side){return side===RED?'RED ACADEMY':'BLUE ACADEMY'}
function commanderPieceForTeam(commander, team){return team===RED ? (commander.redPiece||commander.piece) : commander.piece}

const unitDefs=[
  {id:'FC', display:'10', name:'Fleet Commander', count:1, rank:10, ability:'One-time commander tactic. Reveals after use.'},
  {id:'BC', display:'9', name:'Battle Captain', count:1, rank:9, ability:'High command attacker.'},
  {id:'TO', display:'8', name:'Tactical Officer', count:1, rank:8, ability:'Elite tactical pressure unit.'},
  {id:'SC', display:'7', name:'Security Chief', count:1, rank:7, ability:'Strong defensive leader.'},
  {id:'SL', display:'6', name:'Strike Leader', count:2, rank:6, ability:'Assault unit built for pressure and lane control.'},
  {id:'SO', display:'5', name:'Squad Officer', count:2, rank:5, ability:'Reliable mid-rank support unit.'},
  {id:'FCD', display:'4', name:'Field Cadet', count:2, rank:4, ability:'Basic unit for baiting and blocking.'},
  {id:'TE', display:'3', name:'Tech Engineer', count:5, rank:3, engineer:true, ability:'Can safely disable Shield Mines.'},
  {id:'RR', display:'2', name:'Recon Runner', count:5, rank:2, recon:true, ability:'Moves any number of open squares in a straight line.'},
  {id:'TS', display:'1', name:'Target Specialist', count:2, rank:1, specialist:true, ability:'SCAN up to 2 spaces. Cannot scan behind an enemy.'},
  {id:'I', display:'I', name:'Infiltrator', count:1, rank:0, infiltrator:true, ability:'Defeats Fleet Commander only when attacking first.'},
  {id:'M', display:'M', name:'Shield Mine', count:6, rank:null, mine:true, movable:false, ability:'Immobile defense. Destroys attackers unless hit by Tech Engineer.'},
  {id:'B', display:'B', name:'Academy Beacon', count:1, rank:null, beacon:true, movable:false, ability:'Objective. Capture it to win.'}
];

const blueImgMap={FC:'FC.png',BC:'BC.png',TO:'TO.png',SC:'SC.png',SL:'SL.png',SO:'SO.png',FCD:'FCD.png',TE:'TE.png',RR:'RR.png',TS:'TS.png',I:'I.png',M:'M.png',B:'B.png'};
const redImgMap={FC:'RED_FC.png',BC:'RED_BC.png',TO:'RED_TO.png',SC:'RED_SC.png',SL:'RED_SL.png',SO:'RED_SO.png',FCD:'RED_FCD.png',TE:'RED_TE.png',RR:'RED_RR.png',TS:'RED_TS.png',I:'RED_I.png',M:'RED_M.png',B:'RED_B.png'};
const imgMap=blueImgMap;
const profileMap={FC:'PROF_FC.jpg',BC:'PROF_BC.jpg',TO:'PROF_TO.jpg',SC:'PROF_SC.jpg',SL:'PROF_SL.jpg',SO:'PROF_SO.jpg',FCD:'PROF_FCD.jpg',TE:'PROF_TE.jpg',RR:'PROF_RR.jpg',TS:'PROF_TS.jpg',I:'PROF_I.jpg',M:'PROF_BOMB.jpg',B:'PROF_BEACON.jpg'};
function teamImageMap(team){return team===RED ? redImgMap : blueImgMap}
function unitImage(id, team){
  if(id==='FC' && team===playerTeam()) return commanderPieceForTeam(currentCommander(), team);
  return teamImageMap(team)[id] || blueImgMap[id];
}

let blockedCells=[...currentBattlefield().blocked];

let board=[], phase='deploy', unitCounter=1, selectedTray=null, selectedPiece=null, legal=[], scanTargets=[], scanMode=false;
let pendingConfirm=null;
let dragState=null;
let abilityMoveMode=false;
let suppressNextBoardClick=false;
let commanderUse={blue:1, red:1}, shieldArmed={blue:false, red:false};
let captured={blue:[],red:[]};
let lastMoveGlow=null;
let profileStatsRecordedForMatch=false;
let aiMemory={
  turn:0,
  knownPlayer:new Map(),
  movedPlayerUids:new Set(),
  longMoverUids:new Set(),
  recentAiMoves:[],
  lastPlayerMove:null
};


function fitApp(){
  const scale=Math.min(window.innerWidth/1920, window.innerHeight/1080);
  document.documentElement.style.setProperty('--scale', scale);
}
window.addEventListener('resize', fitApp);
if(window.visualViewport) window.visualViewport.addEventListener('resize', fitApp);

// Keep the 1920x1080 stage locked as one scaled unit.
window.addEventListener('wheel',e=>{ if(e.ctrlKey){ e.preventDefault(); } },{passive:false});
window.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey) && ['+','-','=','0'].includes(e.key)) e.preventDefault();
});
document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});
fitApp();

function syncSetupScreenMode(){
  const online=!!onlineState.enabled;
  const setupScreen=document.getElementById('setup');
  if(setupScreen) setupScreen.classList.toggle('online-match-setup',online);

  const kicker=document.getElementById('setupModeKicker');
  const title=document.getElementById('setupModeTitle');
  const sideLabel=document.getElementById('setupSideLabel');
  const chip=document.getElementById('setupMissionChip');
  const status=document.getElementById('setupBriefingStatus');
  const databaseBtn=document.getElementById('setupDatabaseButton');
  const startBtn=document.getElementById('setupStartButton');
  const oppImg=document.getElementById('setupBriefingOpponentImage');
  const oppLabel=document.getElementById('setupBriefingOpponentLabel');
  const oppName=document.getElementById('setupBriefingOpponentName');
  const oppText=document.getElementById('setupBriefingOpponentText');

  if(online){
    const code=String(onlineState.roomCode||'------').toUpperCase();
    if(kicker) kicker.textContent='ONLINE MATCH';
    if(title) title.innerHTML='<span class="online-room-code-label">ROOM CODE</span><button class="online-room-code-big" type="button" onclick="copyActiveRoomCode()" title="Copy room code">'+code+'</button>';
    if(sideLabel) sideLabel.textContent='ROOM ASSIGNMENT';
    if(chip) chip.innerHTML='<span>LIVE</span> MULTIPLAYER LINK';
    if(status) status.innerHTML='<span></span> ONLINE ROOM READY';
    if(databaseBtn) databaseBtn.style.display='none';
    if(startBtn) startBtn.textContent='START ONLINE MATCH';
    if(oppImg){oppImg.src='LOGO_CROP.png';oppImg.alt='Beacon Wars online match';}
    if(oppLabel) oppLabel.textContent='OPPOSING COMMAND';
    if(oppName) oppName.textContent=onlineState.role==='host'?'AWAITING CHALLENGER':'HOST COMMAND';
    if(oppText) oppText.textContent=onlineState.role==='host'
      ? 'Give the room code to your challenger. Their command profile will synchronize when they join.'
      : 'Secure room link established. Your Academy side is locked for this online match.';
  }else{
    if(kicker) kicker.textContent='TACTICAL OPERATIONS';
    if(title) title.textContent='PLAY A.I.';
    if(sideLabel) sideLabel.textContent='SELECT SIDE';
    if(chip) chip.innerHTML='<span>MARS</span> TRAINING GROUNDS';
    if(status) status.innerHTML='<span></span> SIMULATION READY';
    if(databaseBtn) databaseBtn.style.display='';
    if(startBtn) startBtn.textContent='START MISSION';
    if(oppImg){oppImg.src='AI_PROFILE_RILEY.png';oppImg.alt='Academy A.I. holographic medical officer';}
    if(oppLabel) oppLabel.textContent='OPPOSING COMMAND';
    if(oppName) oppName.textContent='ACADEMY A.I.';
    if(oppText) oppText.textContent='Mars tactical simulation. Enemy identities remain classified until revealed.';
  }
}
function copyActiveRoomCode(){
  const code=String(onlineState.roomCode||'').toUpperCase();
  if(!code) return;
  const done=()=>{
    const btn=document.querySelector('.online-room-code-big');
    if(!btn) return;
    const original=btn.textContent;
    btn.textContent='COPIED!';
    setTimeout(()=>{ if(btn) btn.textContent=original; },900);
  };
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(code).then(done).catch(()=>fallbackCopyRoomCode(code,done));
  }else fallbackCopyRoomCode(code,done);
}
function fallbackCopyRoomCode(code,done){
  const ta=document.createElement('textarea');
  ta.value=code; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{document.execCommand('copy')}catch(e){}
  ta.remove(); if(done) done();
}
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(id==='setup') syncSetupScreenMode();
}
function toggleSetting(k){
  settings[k]=!settings[k];
  document.getElementById(k+'Toggle').textContent=k.toUpperCase()+': '+(settings[k]?'ON':'OFF');
  if(k==='music'){
    if(!settings.music){stopLoop('hum');stopLoop('matchAmbiance');}
    else if(phase==='deploy'||phase==='player'||phase==='ai'||phase==='waiting'||phase==='commit') startLoop('matchAmbiance');
    else startLoop('hum');
  }
}

function resetOnlineState(){
  stopRoomListener();
  onlineState.enabled=false;
  onlineState.role='local';
  onlineState.roomCode=null;
  onlineState.hostColor=null;
  onlineState.playerColor=null;
  onlineState.opponentColor=null;
  onlineState.firstAttackTeam=null;
  onlineState.moveSeq=0;
  onlineState.pendingCommit=false;
  onlineState.lastRoomData=null;
  onlineState.opponentProfile=null;
  onlineState.lastReactionId=null;
  onlineState.resultRecorded=false;
}
function startLocalGameFlow(){
  resetOnlineState();
  renderSides();
  showScreen('setup');
}
async function openOnlineMatch(){
  renderOnlineRoom();
  showScreen('online');
  setOnlineStatus('Connecting to Firebase...');
  const ready=await initFirebase();
  setOnlineStatus(ready ? 'Firebase connected. Create or join a room.' : 'Firebase not ready: '+(onlineState.firebaseError||'check config/rules'));
}
function generateRoomCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code='';
  for(let i=0;i<6;i++) code+=chars[Math.floor(Math.random()*chars.length)];
  return code;
}
function setOnlineStatus(msg){
  const el=document.getElementById('onlineStatus');
  if(el) el.innerHTML=msg;
}

let bwFirebaseApp=null;
let bwFirebaseAuth=null;
let bwFirestore=null;
let bwFirebaseSdkPromise=null;

const BW_FIREBASE_SDK={
  app:'https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js',
  auth:'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth-compat.js',
  firestore:'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore-compat.js',
  appCheck:'https://www.gstatic.com/firebasejs/12.17.1/firebase-app-check-compat.js'
};

function loadExternalScript(src){
  return new Promise((resolve,reject)=>{
    const existing=[...document.scripts].find(script=>script.src===src);
    if(existing){
      if(existing.dataset.loaded==='true')resolve();
      else{
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',()=>reject(new Error('Could not load '+src)),{once:true});
      }
      return;
    }
    const script=document.createElement('script');
    script.src=src;
    script.async=true;
    script.addEventListener('load',()=>{script.dataset.loaded='true';resolve()},{once:true});
    script.addEventListener('error',()=>reject(new Error('Could not load '+src)),{once:true});
    document.head.appendChild(script);
  });
}

async function loadFirebaseSdk(){
  if(typeof firebase!=='undefined')return true;
  if(!bwFirebaseSdkPromise){
    bwFirebaseSdkPromise=(async()=>{
      await loadExternalScript(BW_FIREBASE_SDK.app);
      await loadExternalScript(BW_FIREBASE_SDK.auth);
      await loadExternalScript(BW_FIREBASE_SDK.firestore);
      if(window.firebaseConfig&&window.firebaseConfig.appCheckSiteKey){
        await loadExternalScript(BW_FIREBASE_SDK.appCheck);
      }
      return true;
    })().catch(err=>{bwFirebaseSdkPromise=null;throw err});
  }
  return bwFirebaseSdkPromise;
}

function loadFirebaseConfig(){
  if(window.firebaseConfig)return Promise.resolve(true);
  return loadExternalScript('firebase-config.js');
}

function activateFirebaseAppCheck(){
  const siteKey=window.firebaseConfig&&window.firebaseConfig.appCheckSiteKey;
  if(!siteKey||!firebase.appCheck)return;
  try{
    firebase.appCheck().activate(
      new firebase.appCheck.ReCaptchaEnterpriseProvider(siteKey),
      true
    );
  }catch(err){
    console.warn('Firebase App Check was not activated:',err);
  }
}

async function initFirebase(){
  if(onlineState.firebaseReady && bwFirestore) return true;
  try{
    await loadFirebaseConfig();
    if(!window.firebaseConfig||!window.firebaseConfig.apiKey||String(window.firebaseConfig.apiKey).includes('PASTE_')){
      onlineState.firebaseReady=false;
      onlineState.firebaseError='Add the new project values to firebase-config.js before using Online Match.';
      return false;
    }
    await loadFirebaseSdk();
    if(!firebase.apps.length) bwFirebaseApp=firebase.initializeApp(window.firebaseConfig);
    else bwFirebaseApp=firebase.app();
    activateFirebaseAppCheck();
    bwFirebaseAuth=firebase.auth();
    bwFirestore=firebase.firestore();

    const cred=await bwFirebaseAuth.signInAnonymously();
    onlineState.uid=cred.user.uid;
    onlineState.firebaseReady=true;
    onlineState.firebaseError=null;
    return true;
  }catch(err){
    onlineState.firebaseReady=false;
    onlineState.firebaseError=err.message||String(err);
    console.error('Firebase init failed:', err);
    return false;
  }
}
function roomRef(code){
  return bwFirestore.collection('rooms').doc(code);
}
function stopRoomListener(){
  if(typeof onlineState.roomUnsub==='function'){
    try{onlineState.roomUnsub();}catch(e){}
  }
  onlineState.roomUnsub=null;
}
function sanitizeOnlineId(value,fallback,allowed){
  const id=String(value||'').toLowerCase();
  return allowed.includes(id)?id:fallback;
}
function onlineProfileSnapshot(){
  const profile=typeof getPlayerProfileData==='function'?getPlayerProfileData():{};
  const callsign=String(profile.callsign||'CADET').toUpperCase().replace(/[^A-Z0-9 _-]/g,'').slice(0,12)||'CADET';
  const iconIds=typeof PROFILE_ICON_ASSETS==='object'?Object.keys(PROFILE_ICON_ASSETS):['infiltrator'];
  const frameIds=typeof PROFILE_FRAME_ASSETS==='object'?Object.keys(PROFILE_FRAME_ASSETS):['rookie'];
  const titleIds=typeof PROFILE_TITLE_NAMES==='object'?Object.keys(PROFILE_TITLE_NAMES):['cadet'];
  const reactionIds=typeof BW119_REACTIONS==='object'?Object.keys(BW119_REACTIONS):['hello'];
  const normalizedTactic=String(setup.tactic||'tacticalWarp');
  const tacticIds=tactics.map(item=>String(item.id));
  const reactions=(Array.isArray(profile.equippedReactions)?profile.equippedReactions:[])
    .map(id=>String(id).toLowerCase()).filter((id,index,list)=>reactionIds.includes(id)&&list.indexOf(id)===index).slice(0,5);
  return {
    callsign,
    icon:sanitizeOnlineId(profile.icon,'infiltrator',iconIds),
    frame:sanitizeOnlineId(profile.frame,'rookie',frameIds),
    title:sanitizeOnlineId(profile.title,'cadet',titleIds),
    commander:String(setup.commander||'fleet').slice(0,32),
    tactic:(tacticIds.includes(normalizedTactic)?normalizedTactic:'tacticalWarp').slice(0,32),
    reactions
  };
}
async function firebaseCreateRoom(roomCode, hostColor){
  const ready=await initFirebase();
  if(!ready) throw new Error(onlineState.firebaseError||'Firebase unavailable.');
  const guestColor=hostColor===BLUE?RED:BLUE;
  const now=firebase.firestore.Timestamp.now();
  const expiresAt=firebase.firestore.Timestamp.fromMillis(now.toMillis()+6*60*60*1000);
  const profile=onlineProfileSnapshot();
  await roomRef(roomCode).set({
    roomCode,
    hostUid:onlineState.uid,
    guestUid:null,
    hostProfile:profile,
    guestProfile:null,
    hostColor,
    guestColor,
    firstAttackTeam:guestColor,
    phase:'lobby',
    turnRole:null,
    turnTeam:null,
    moveSeq:0,
    createdAt:firebase.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  });
  firebaseListenRoom(roomCode);
}
async function firebaseJoinRoom(roomCode){
  const ready=await initFirebase();
  if(!ready) throw new Error(onlineState.firebaseError||'Firebase unavailable.');
  const snap=await roomRef(roomCode).get();
  if(!snap.exists) throw new Error('Room not found.');
  const data=snap.data()||{};
  if(!data.hostColor) throw new Error('Host has not picked a color yet.');
  if(data.guestUid && data.guestUid!==onlineState.uid) throw new Error('Room already has two players.');

  const guestColor=data.hostColor===BLUE?RED:BLUE;
  await roomRef(roomCode).update({
    guestUid:onlineState.uid,
    guestProfile:onlineProfileSnapshot(),
    guestColor,
    firstAttackTeam:guestColor,
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  });
  firebaseListenRoom(roomCode);
  return {...data, guestColor, firstAttackTeam:guestColor};
}
function firebaseListenRoom(roomCode){
  if(!bwFirestore) return;
  stopRoomListener();
  onlineState.roomUnsub=roomRef(roomCode).onSnapshot(snap=>{
    if(!snap.exists) return;
    handleRoomSnapshot(snap.data()||{});
  }, err=>{
    console.error('Room listener error:', err);
    if(onlineState.enabled) log('Firebase room listener error: '+(err.message||err));
  });
}
function handleRoomSnapshot(data){
  if(!onlineState.enabled) return;
  onlineState.lastRoomData=data;

  if(data.moveSeq!=null) onlineState.moveSeq=data.moveSeq;
  if(data.hostColor) onlineState.hostColor=data.hostColor;

  // Re-assert role from Firebase uid. This saves us if the page refreshed mid-room.
  if(onlineState.uid){
    if(data.hostUid===onlineState.uid) onlineState.role='host';
    if(data.guestUid===onlineState.uid) onlineState.role='guest';
  }

  if(onlineState.role==='host' && data.hostColor){
    onlineState.playerColor=data.hostColor;
    onlineState.opponentColor=data.guestColor || (data.hostColor===BLUE?RED:BLUE);
    setup.side=onlineState.playerColor;
  }
  if(onlineState.role==='guest' && (data.guestColor || data.hostColor)){
    const guestColor=data.guestColor || (data.hostColor===BLUE?RED:BLUE);
    onlineState.playerColor=guestColor;
    onlineState.opponentColor=data.hostColor;
    setup.side=onlineState.playerColor;
  }
  if(data.firstAttackTeam) onlineState.firstAttackTeam=data.firstAttackTeam;
  onlineState.opponentProfile=onlineState.role==='host'?(data.guestProfile||null):(data.hostProfile||null);
  if(typeof syncMatchIdentityHud==='function')syncMatchIdentityHud();
  if(data.lastReaction&&data.lastReaction.id&&data.lastReaction.id!==onlineState.lastReactionId){
    onlineState.lastReactionId=data.lastReaction.id;
    if(data.lastReaction.byUid!==onlineState.uid&&typeof bw110ShowReaction==='function'){
      bw110ShowReaction('opponent',data.lastReaction.key,3000);
    }
  }
  installOpponentDeployment(data);

  // Do not let Firebase steal control during the local COMMIT step.
  if(phase==='commit') return;
  if(data.phase!=='battle') return;

  const activeUid=data.activeUid || data.turnUid || null;
  const activeRole=data.activeRole || data.turnRole;
  const activeTeam=data.activeTeam || data.turnTeam;

  // UID is the strongest source. Role/team are fallbacks for old rooms.
  const myTurnByUid = !!(activeUid && onlineState.uid && activeUid===onlineState.uid);
  const myTurnFallback = activeRole===onlineState.role || activeTeam===playerTeam();
  const myTurn = myTurnByUid || (!activeUid && myTurnFallback);

  if(myTurn){
    if(phase==='waiting'){
      phase='player';
      selectedPiece=null; legal=[]; scanTargets=[]; scanMode=false; abilityMoveMode=false;
      updateStatus(teamLabel(playerTeam())+' TURN','Opponent committed.','Your turn. Drag from a unit’s A/base to move.');
      updateStartBtn();
      renderBoard(); renderUnitList();
      log('Firebase turn passed to '+teamLabel(playerTeam())+'.');
    }
  } else {
    if(phase==='player'){
      phase='waiting';
      updateStatus('ONLINE WAITING','Opponent turn.','Waiting for the opponent to commit a move.');
      updateStartBtn();
    }
  }

  if(data.lastCommitId && data.lastCommitId!==onlineState.lastCommitId){
    const isOpponentCommit=data.lastCommitByUid!==onlineState.uid;
    onlineState.lastCommitId=data.lastCommitId;
    if(isOpponentCommit){
      const applied=applyAuthoritativeBoardSnapshot(data.boardSnapshot, data.lastMove && data.lastMove.payload);
      if(!applied) applyRemoteMovePayload(data.lastMove && data.lastMove.payload);
      log('Opponent commit received. Board synced. Turn is now '+(myTurn?'yours.':'theirs.'));
    }
  }
  updateBoardLock();
}

async function firebaseRecordOnlineResult(message){
  if(!onlineState.enabled||onlineState.resultRecorded||!onlineState.roomCode||!onlineState.uid)return false;
  const data=onlineState.lastRoomData||{};
  const msg=String(message||'').toUpperCase();
  const myTeam=teamLabel(playerTeam()).toUpperCase();
  const draw=msg.includes('DRAW');
  const won=!draw&&msg.startsWith(myTeam+' ');
  const winnerUid=draw?null:(won?onlineState.uid:(onlineState.role==='host'?data.guestUid:data.hostUid));
  const result=draw?'draw':'complete';
  onlineState.resultRecorded=true;
  try{
    await roomRef(onlineState.roomCode).update({
      phase:'complete',
      result,
      winnerUid:winnerUid||null,
      completedByUid:onlineState.uid,
      completedAt:firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    return true;
  }catch(err){
    onlineState.resultRecorded=false;
    console.warn('Online result could not be recorded:',err);
    return false;
  }
}

function deploymentFieldName(){
  return onlineState.role==='host' ? 'hostDeployment' : 'guestDeployment';
}
function deploymentIdFieldName(){
  return onlineState.role==='host' ? 'hostDeploymentId' : 'guestDeploymentId';
}
function serializePlayerDeployment(){
  const out=[];
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const p=board[r][c];
      if(!p || p.team!==playerTeam()) continue;
      out.push({
        id:p.id,
        name:p.name,
        display:p.display,
        rank:p.rank,
        movable:p.movable,
        mine:!!p.mine,
        beacon:!!p.beacon,
        engineer:!!p.engineer,
        recon:!!p.recon,
        specialist:!!p.specialist,
        infiltrator:!!p.infiltrator,
        commanderChoice:p.commanderChoice||null,
        r,c
      });
    }
  }
  return out;
}

function serializePieceForSync(p){
  if(!p) return null;
  return {
    id:p.id,
    name:p.name,
    display:p.display,
    rank:p.rank,
    team:p.team,
    movable:p.movable!==false,
    mine:!!p.mine,
    beacon:!!p.beacon,
    engineer:!!p.engineer,
    recon:!!p.recon,
    specialist:!!p.specialist,
    infiltrator:!!p.infiltrator,
    commanderChoice:p.commanderChoice||null,
    revealed:!!p.revealed,
    scanned:!!p.scanned,
    shielded:!!p.shielded,
    tacticRevealed:!!p.tacticRevealed,
    sabotageCharges:Math.max(0,Number(p.sabotageCharges)||0)
  };
}
function serializeBoardSnapshot(){
  const cells=[];
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const p=board[r][c];
      if(!p) continue;
      cells.push({r,c,piece:serializePieceForSync(p)});
    }
  }
  return {
    perspectiveTeam:playerTeam(),
    cells,
    captured:{
      blue:[...(captured.blue||[])],
      red:[...(captured.red||[])]
    },
    commanderUse:{blue:commanderUse.blue, red:commanderUse.red},
    shieldArmed:{blue:!!shieldArmed.blue, red:!!shieldArmed.red},
    phase,
    lastMoveGlow:lastMoveGlow ? {...lastMoveGlow} : null
  };
}
function pieceFromSyncData(data,r,c){
  if(!data) return null;
  const def=unitDefs.find(d=>d.id===data.id) || {id:data.id, display:data.display, name:data.name, rank:data.rank, ability:''};
  const p=unitCopy(def, data.team, r, c);
  p.name=data.name || p.name;
  p.display=data.display || p.display;
  p.rank=data.rank;
  p.movable=data.movable!==false;
  p.mine=!!data.mine;
  p.beacon=!!data.beacon;
  p.engineer=!!data.engineer;
  p.recon=!!data.recon;
  p.specialist=!!data.specialist;
  p.infiltrator=!!data.infiltrator;
  p.commanderChoice=data.commanderChoice||null;
  p.revealed=!!data.revealed;
  p.scanned=!!data.scanned;
  p.shielded=!!data.shielded;
  p.tacticRevealed=!!data.tacticRevealed;
  p.sabotageCharges=Math.max(0,Number(data.sabotageCharges)||0);
  p.profile=profileMap[p.id]||p.profile;
  p.img=(p.team===RED?redImgMap:blueImgMap)[p.id] || p.img;
  return p;
}
function applyAuthoritativeBoardSnapshot(snapshot, movePayload){
  if(!snapshot || !Array.isArray(snapshot.cells)) return false;

  // If the snapshot came from the other player's screen, rotate it into this player's view.
  const shouldMirror = snapshot.perspectiveTeam && snapshot.perspectiveTeam!==playerTeam();

  const nextBoard=Array.from({length:ROWS},()=>Array(COLS).fill(null));
  snapshot.cells.forEach(entry=>{
    if(!entry || !entry.piece) return;
    let cell={r:entry.r,c:entry.c};
    if(shouldMirror) cell=mirrorCell(cell);
    if(!inBounds(cell.r,cell.c) || isBlocked(cell.r,cell.c)) return;
    nextBoard[cell.r][cell.c]=pieceFromSyncData(entry.piece, cell.r, cell.c);
  });

  board=nextBoard;
  captured={
    blue:[...((snapshot.captured&&snapshot.captured.blue)||[])],
    red:[...((snapshot.captured&&snapshot.captured.red)||[])]
  };
  commanderUse={
    blue: snapshot.commanderUse && snapshot.commanderUse.blue!=null ? snapshot.commanderUse.blue : commanderUse.blue,
    red: snapshot.commanderUse && snapshot.commanderUse.red!=null ? snapshot.commanderUse.red : commanderUse.red
  };
  shieldArmed={
    blue: snapshot.shieldArmed && snapshot.shieldArmed.blue!=null ? !!snapshot.shieldArmed.blue : !!shieldArmed.blue,
    red: snapshot.shieldArmed && snapshot.shieldArmed.red!=null ? !!snapshot.shieldArmed.red : !!shieldArmed.red
  };

  if(movePayload && movePayload.to){
    lastMoveGlow = shouldMirror ? mirrorCell(movePayload.to) : {...movePayload.to};
  } else if(snapshot.lastMoveGlow){
    lastMoveGlow = shouldMirror ? mirrorCell(snapshot.lastMoveGlow) : {...snapshot.lastMoveGlow};
  }

  updateCaptured();
  renderBoard();
  return true;
}

function mirrorCell(cell){
  return {r:ROWS-1-cell.r, c:COLS-1-cell.c};
}
function installOpponentDeployment(data){
  if(!onlineState.enabled || !data) return false;
  const dep = onlineState.role==='host' ? data.guestDeployment : data.hostDeployment;
  const depId = onlineState.role==='host' ? data.guestDeploymentId : data.hostDeploymentId;
  if(!dep || !Array.isArray(dep) || !depId || onlineState.opponentDeploymentId===depId) return false;

  // Replace the temporary AI enemy layout with the real opponent layout.
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      if(board[r][c] && board[r][c].team===enemyTeam()) board[r][c]=null;
    }
  }

  dep.forEach(u=>{
    const cell=mirrorCell({r:u.r,c:u.c});
    if(!inBounds(cell.r,cell.c) || isBlocked(cell.r,cell.c)) return;
    const def=unitDefs.find(d=>d.id===u.id);
    if(!def) return;
    const p=unitCopy(def, enemyTeam(), cell.r, cell.c);
    p.name=u.name || p.name;
    p.display=u.display || p.display;
    p.rank=u.rank;
    p.movable=u.movable!==false;
    p.mine=!!u.mine;
    p.beacon=!!u.beacon;
    p.engineer=!!u.engineer;
    p.recon=!!u.recon;
    p.specialist=!!u.specialist;
    p.infiltrator=!!u.infiltrator;
    p.commanderChoice=u.commanderChoice||null;
    p.revealed=false;
    p.scanned=false;
    board[cell.r][cell.c]=p;
  });

  onlineState.opponentDeploymentId=depId;
  log('Opponent deployment synced from Firebase.');
  renderBoard();
  return true;
}
async function firebaseSubmitDeployment(){
  if(!onlineState.enabled || !onlineState.roomCode || onlineState.role==='local') return;
  const ready=await initFirebase();
  if(!ready) throw new Error(onlineState.firebaseError||'Firebase unavailable.');
  const dep=serializePlayerDeployment();
  if(dep.length!==totalNeeded()){
    throw new Error('Deployment incomplete. Place all units before starting.');
  }
  const field=deploymentFieldName();
  const idField=deploymentIdFieldName();
  const depId=(Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)).toUpperCase();
  const payload={
    [field]:dep,
    [idField]:depId,
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  };
  if(onlineState.role==='host') payload.hostReady=true;
  if(onlineState.role==='guest') payload.guestReady=true;
  await roomRef(onlineState.roomCode).set(payload,{merge:true});
  log('Your deployment uploaded to Firebase.');
}
function moveTextFor(p,from,to,target){
  const fromText=(from.c+1)+','+(ROWS-from.r);
  const toText=(to.c+1)+','+(ROWS-to.r);
  if(target) return `${teamLabel(p.team)} ${p.name} attacked at ${toText}.`;
  return `${teamLabel(p.team)} ${p.name} moved from ${fromText} to ${toText}.`;
}
function publicMoveText(from,to,target){
  const fromText=(from.c+1)+','+(ROWS-from.r);
  const toText=(to.c+1)+','+(ROWS-to.r);
  if(target) return `Opponent unit attacked at ${toText}.`;
  return `Opponent unit moved from ${fromText} to ${toText}.`;
}
function privateCommitText(){
  return onlineState.pendingMove && onlineState.pendingMove.privateText ? onlineState.pendingMove.privateText : 'Move committed.';
}
function publicCommitText(){
  return onlineState.pendingMove && onlineState.pendingMove.publicText ? onlineState.pendingMove.publicText : 'Opponent committed a move.';
}
function applyRemoteMovePayload(move){
  if(!move || !move.from || !move.to) return;
  // The other player sees the board rotated from our perspective.
  const from=mirrorCell(move.from);
  const to=mirrorCell(move.to);

  if(move.type==='move'){
    const p=board[from.r] && board[from.r][from.c];
    if(p && p.team===enemyTeam()){
      playSound('movePiece',{volume:.62});
      board[from.r][from.c]=null;
      p.r=to.r; p.c=to.c;
      board[to.r][to.c]=p;
      lastMoveGlow={r:to.r,c:to.c};
      renderBoard();
      log('Opponent move applied: '+(move.publicText||move.text||'Opponent unit moved.'));
    } else {
      lastMoveGlow={r:to.r,c:to.c};
      renderBoard();
      log('Opponent committed move: '+(move.publicText||move.text||'Opponent unit moved.')+' Could not auto-apply because the source square did not match.');
    }
  } else {
    lastMoveGlow={r:to.r,c:to.c};
    renderBoard();
    log('Opponent committed combat: '+(move.publicText||move.text||'Opponent unit attacked.'));
  }
}
async function firebaseStartBattle(){
  if(!onlineState.enabled || !onlineState.roomCode) return;
  const ready=await initFirebase();
  if(!ready){ log('Firebase not ready: '+(onlineState.firebaseError||'unknown error')); return; }

  const snap=await roomRef(onlineState.roomCode).get();
  const current=snap.exists ? (snap.data()||{}) : {};
  const hostColor=onlineState.hostColor || current.hostColor || BLUE;
  const guestColor=current.guestColor || (hostColor===BLUE?RED:BLUE);

  // Do not reset the room after commits begin.
  if(current.phase==='battle' && (current.moveSeq||0)>0){
    return;
  }

  // Guest attacks first. If guestUid exists, UID controls the turn.
  const firstUid=current.guestUid || null;

  await roomRef(onlineState.roomCode).set({
    phase:'battle',
    hostColor,
    guestColor,
    firstAttackTeam:guestColor,
    turnRole:current.turnRole || 'guest',
    activeRole:current.activeRole || 'guest',
    turnTeam:current.turnTeam || guestColor,
    activeTeam:current.activeTeam || guestColor,
    turnUid:current.turnUid || firstUid,
    activeUid:current.activeUid || firstUid,
    moveSeq:current.moveSeq || 0,
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  }, {merge:true});
}
async function firebaseSendTurn(){
  if(!onlineState.enabled || !onlineState.roomCode || onlineState.role==='local'){
    throw new Error('No active online room or player role.');
  }
  const ready=await initFirebase();
  if(!ready){
    throw new Error(onlineState.firebaseError||'Firebase unavailable.');
  }

  const current=onlineState.lastRoomData||{};
  if(!current.hostUid)throw new Error('Room state is not ready. Wait for Firebase to synchronize, then commit again.');

  // Re-identify role from uid right before commit.
  if(onlineState.uid){
    if(current.hostUid===onlineState.uid) onlineState.role='host';
    if(current.guestUid===onlineState.uid) onlineState.role='guest';
  }

  const nextRole=onlineState.role==='host'?'guest':'host';
  const nextTeam=onlineState.opponentColor || (playerTeam()===BLUE?RED:BLUE);
  const nextUid=nextRole==='host' ? current.hostUid : current.guestUid;

  if(!nextUid){
    throw new Error('Opponent has not joined the room yet. Cannot pass turn.');
  }

  const commitId=(Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)).toUpperCase();

  const payload={
    phase:'battle',
    turnRole:nextRole,
    activeRole:nextRole,
    turnTeam:nextTeam,
    activeTeam:nextTeam,
    turnUid:nextUid,
    activeUid:nextUid,
    moveSeq:firebase.firestore.FieldValue.increment(1),
    lastCommitId:commitId,
    lastCommitByRole:onlineState.role,
    lastCommitByTeam:playerTeam(),
    lastCommitByUid:onlineState.uid || null,
    lastMoveText:publicCommitText(),
    boardSnapshot:serializeBoardSnapshot(),
    lastMove:{
      commitId,
      byRole:onlineState.role,
      byTeam:playerTeam(),
      byUid:onlineState.uid || null,
      toRole:nextRole,
      toTeam:nextTeam,
      toUid:nextUid,
      payload:onlineState.pendingMove ? {
        type:onlineState.pendingMove.type,
        from:onlineState.pendingMove.from,
        to:onlineState.pendingMove.to,
        publicText:onlineState.pendingMove.publicText
      } : null,
      text:publicCommitText(),
      at:firebase.firestore.FieldValue.serverTimestamp()
    },
    updatedAt:firebase.firestore.FieldValue.serverTimestamp()
  };

  await roomRef(onlineState.roomCode).update(payload);

  onlineState.lastCommitId=commitId;
  onlineState.pendingMove=null;
}

function updateBoardLock(){
  const overlay=document.getElementById('boardLockOverlay');
  const text=document.getElementById('boardLockText');
  if(!overlay) return;
  const locked = phase==='waiting' || phase==='commit';
  overlay.classList.toggle('show', locked);
  if(text){
    if(phase==='commit') text.textContent='MOVE READY - PRESS COMMIT';
    else if(phase==='waiting') text.textContent='WAITING FOR OPPONENT';
    else text.textContent='BOARD LOCKED';
  }
}
async function commitOnlineMove(){
  if(!onlineState.enabled || phase!=='commit') return;
  onlineState.pendingCommit=false;
  phase='waiting';
  updateStatus('ONLINE WAITING','Move committed.','Turn sent through Firebase. Waiting for the opponent to respond.');
  updateStartBtn();
  try{
    await firebaseSendTurn();
    log('Move committed to Firebase. Hidden identity preserved for opponent. Turn passed.');
  }catch(err){
    const msg=err.message||String(err);
    console.error('Firebase commit failed:', err);
    log('Firebase commit failed: '+msg);
    phase='commit';
    onlineState.pendingCommit=true;
    updateStatus('COMMIT FAILED','Firebase error: '+msg,'Check Firestore Rules, Anonymous Auth, then press COMMIT again.');
    updateStartBtn();
  }
}
function createOnlineRoom(){
  onlineState.enabled=true;
  onlineState.role='host';
  onlineState.roomCode=generateRoomCode();
  onlineState.hostColor=null;
  onlineState.playerColor=null;
  onlineState.opponentColor=null;
  onlineState.firstAttackTeam=null;
  renderOnlineRoom();
  setOnlineStatus('Room created. Host chooses BLUE or RED. The joining player takes the other color and attacks first.');
}
function renderOnlineRoom(){
  const created=document.getElementById('createdRoom');
  const pick=document.getElementById('hostColorPick');
  if(created) created.textContent=onlineState.roomCode||'No room yet.';
  if(pick){
    if(onlineState.role==='host' && onlineState.roomCode){
      pick.innerHTML=`<button class="btn" onclick="hostChooseColor('${BLUE}')">HOST BLUE</button><button class="btn red" onclick="hostChooseColor('${RED}')">HOST RED</button>`;
    } else {
      pick.innerHTML='';
    }
  }
}
async function hostChooseColor(color){
  if(!onlineState.roomCode) createOnlineRoom();
  onlineState.enabled=true;
  onlineState.role='host';
  onlineState.hostColor=color;
  onlineState.playerColor=color;
  onlineState.opponentColor=color===BLUE?RED:BLUE;
  onlineState.firstAttackTeam=onlineState.opponentColor; // joining player attacks first
  setup.side=color;
  try{
    setOnlineStatus('Creating Firebase room...');
    await firebaseCreateRoom(onlineState.roomCode, color);
    setOnlineStatus('Room '+onlineState.roomCode+' live. Share this code with Player 2.');
  }catch(err){
    setOnlineStatus('Firebase room create failed: '+(err.message||err));
    log('Firebase create failed: '+(err.message||err));
  }

  renderSides();
  showScreen('setup');
}
async function joinOnlineRoom(){
  const input=document.getElementById('roomCodeInput');
  const code=(input?input.value:'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(!code){setOnlineStatus('Enter a room code to join.'); return;}

  onlineState.enabled=true;
  onlineState.role='guest';
  onlineState.roomCode=code;

  try{
    setOnlineStatus('Joining Firebase room...');
    const room=await firebaseJoinRoom(code);
    const hostColor=room.hostColor||BLUE;
    const guestColor=room.guestColor || (hostColor===BLUE?RED:BLUE);
    onlineState.hostColor=hostColor;
    onlineState.playerColor=guestColor;
    onlineState.opponentColor=hostColor;
    onlineState.firstAttackTeam=guestColor; // joining player attacks first
    setup.side=guestColor;
    setOnlineStatus('Joined room '+code+'. You are '+teamLabel(guestColor)+' and attack first.');
    renderSides();
    showScreen('setup');
    return;
  }catch(err){
    setOnlineStatus('Firebase join failed: '+(err.message||err));
    console.error(err);
  }
}
function onlineSummary(){
  if(!onlineState.enabled) return '';
  return `Room <b>${onlineState.roomCode||'LOCAL'}</b> · Role <b>${onlineState.role.toUpperCase()}</b> · UID <b>${(onlineState.uid||'...').slice(0,6)}</b> · You are <b>${teamLabel(playerTeam())}</b> · Opponent is <b>${teamLabel(enemyTeam())}</b> · First attack: <b>${teamLabel(onlineState.firstAttackTeam||enemyTeam())}</b>`;
}

function renderSides(){
  const box=document.getElementById('sideBox');
  if(!box) return;
  box.innerHTML='';
  if(onlineState.enabled){
    const role=(onlineState.role||'player').toUpperCase();
    const yours=teamLabel(playerTeam());
    const opponent=teamLabel(enemyTeam());
    const first=teamLabel(onlineState.firstAttackTeam||enemyTeam());
    box.innerHTML=`<div class="side-lock online-room-assignment"><div><span>ROLE</span><b>${role}</b></div><div><span>YOUR SIDE</span><b>${yours}</b></div><div><span>OPPONENT</span><b>${opponent}</b></div><div><span>FIRST ATTACK</span><b>${first}</b></div></div>`;
    syncSetupScreenMode();
    return;
  }
  [
    {id:BLUE, name:'BLUE ACADEMY', desc:'Start as BLUE. Your units use blue bases and RED becomes the opponent.'},
    {id:RED, name:'RED ACADEMY', desc:'Start as RED. Your units use red bases and BLUE becomes the opponent.'}
  ].forEach(side=>{
    const b=document.createElement('button');
    b.className='pick '+(setup.side===side.id?'active':'');
    b.innerHTML=side.name+'<br><span style="font-size:12px;color:#c8f8ff">'+side.desc+'</span>';
    b.onclick=()=>{setup.side=side.id; renderSides(); renderCommanders();};
    box.appendChild(b);
  });
}
function renderCommanders(){
  const box=document.getElementById('commanderBox');
  if(!box) return;
  box.innerHTML='';
  commanders.forEach(c=>{
    const b=document.createElement('button');
    b.className='commander-card '+(setup.commander===c.id?'active':'');
    b.innerHTML=`<img src="${commanderPieceForTeam(c, playerTeam())}" alt=""><div class="commander-name">${c.name}</div><div class="commander-role">${c.role}</div>`;
    b.onclick=()=>{
      setup.commander=c.id;
      renderCommanders();
      const voiceKey=String(c.voice||'');
      playSound(voiceKey&&AUDIO_FILES[voiceKey]?voiceKey:'commanderConfirmed',{volume:voiceKey ? .95 : .75,delay:voiceKey?120:80});
    };
    box.appendChild(b);
  });
}
renderSides();
renderCommanders();

function renderTactics(){
  const box=document.getElementById('tacticBox'); box.innerHTML='';
  tactics.forEach(t=>{
    const b=document.createElement('button');
    b.className='pick '+(setup.tactic===t.id?'active':'');
    b.innerHTML=t.name+'<br><span style="font-size:12px;color:#c8f8ff">'+t.text+'</span>';
    b.onclick=()=>{setup.tactic=t.id;renderTactics()};
    box.appendChild(b);
  });
}
renderTactics();
function renderBattlefields(){
  const box=document.getElementById('battlefieldBox');
  if(!box) return;
  box.innerHTML='';
  Object.values(battlefields).forEach(bf=>{
    const b=document.createElement('button');
    b.className='battlefield-card '+(setup.battlefield===bf.id?'active':'');
    b.innerHTML=`<img src="${bf.image}" alt=""><div class="battlefield-name">${bf.name.toUpperCase()}</div><div class="battlefield-desc">${bf.desc}</div><div class="battlefield-status">CLICK TO LOAD BATTLE</div>`;
    b.onclick=()=>{
      startGame(bf.id);
    };
    box.appendChild(b);
  });
}
renderBattlefields();
    function preloadBattlefield(id){
  const bf=battlefields[id]||battlefields.mars;
  const img=new Image();
  img.src=bf.image;
}
preloadBattlefield(setup.battlefield);
function currentTactic(){return tactics.find(t=>t.id===setup.tactic)||tactics[0]}
function startGame(fieldId=null){
  playSound('commanderConfirmed',{volume:.9});
  playSound('shipWarp',{volume:.95,delay:350});
  stopLoop('hum');
  if(fieldId && battlefields[fieldId]) setup.battlefield=fieldId;
  const bf=currentBattlefield();

  // Paint the selected board before the screen swap so Earth/Mars never shows blank.
  const layer=document.getElementById('boardLayer');
  if(layer) layer.style.backgroundImage=`url("${bf.image}")`;

  preloadBattlefield(bf.id);
  showScreen('game');

  // Hard reset the battle after the battlefield value is locked in.
  setTimeout(()=>initGame(), 0);
}

function unitCopy(def,team,r=null,c=null){
  const copy={...def,team,r,c,uid:unitCounter++,movable:def.movable!==false,revealed:false,scanned:false};
  copy.img=unitImage(def.id, team);
  if(team===playerTeam() && def.id==='FC'){
    const cmd=currentCommander();
    copy.name=cmd.name;
    copy.img=commanderPieceForTeam(cmd, team);
    copy.profile=cmd.profile;
    copy.commanderChoice=cmd.id;
  }
  return copy;
}

function initGame(){
  startMatchAudio();
  const bf=currentBattlefield();
  const originalBlocked=(bf.blocked||[]).length;
  blockedCells=normalizeBlockedCells(bf.blocked);
  const boardLayer=document.getElementById('boardLayer');
  if(boardLayer) boardLayer.style.backgroundImage=`url("${bf.image}")`;
  board=Array.from({length:ROWS},()=>Array(COLS).fill(null));
  phase='deploy';unitCounter=1;selectedTray=null;selectedPiece=null;legal=[];scanTargets=[];scanMode=false; abilityMoveMode=false;pendingConfirm=null;lastMoveGlow=null;profileStatsRecordedForMatch=false;hideConfirm();
  aiResetMemory();
  commanderUse={blue:1,red:1};shieldArmed={blue:false,red:false};abilityMoveMode=false;captured={blue:[],red:[]};updateCaptured();
  placeAI();
  renderUnitList(); renderBoard(); clearLog(); updateConsole(null); updateStartBtn();
  updateStatus('DEPLOYMENT PHASE','Place your '+teamLabel(playerTeam())+' units.','Click a unit, then click a starting tile on the bottom 3 rows, or use RANDOM PLACE. In battle, drag a unit from its A/base to move.');
  log('Mission loaded: '+bf.log+'.');
  log('Battlefield selected: '+bf.name+'.');
  if(bf.id==='earth') log('Earth blockers: left C1-C2/R4-R5, right C8-C9/R4-R5.');
  if(blockedCells.length!==originalBlocked) log('Map safety: deployment-row blockers were ignored so both sides can place all units.');
  log('Side selected: '+sideLabel(playerTeam())+'.');
  if(onlineState.enabled){log('Online room: '+(onlineState.roomCode||'LOCAL')+'. '+teamLabel(onlineState.firstAttackTeam||enemyTeam())+' attacks first.');}
  log('Commander selected: '+currentCommander().name+'.');
  log('Coordinate map: 80 exact A-mark targets loaded from the Mars calibration board.');
  log('Anchor rule: A-center snaps to the printed board mark. Drag the A/base to move. Click it for skills.');
}

function isBlocked(r,c){return blockedCells.includes(`${r},${c}`)}
function inBounds(r,c){return r>=0&&r<ROWS&&c>=0&&c<COLS}
function cellCenter(r,c){return TILE_CENTERS[ROWS-1-r][c]}
function pieceTopLeft(r,c){
  const p=cellCenter(r,c);
  return {x:p.x - (BASE_ANCHOR.x + anchorOffset.x), y:p.y - (BASE_ANCHOR.y + anchorOffset.y)};
}
// Intentionally identical to pieceTopLeft(). Keeping the named helper makes
// movement/reveal code explicit while guaranteeing both art types share one path.
function hiddenPieceTopLeft(r,c){return pieceTopLeft(r,c)}
function nearestCell(x,y){
  let best=null, bestD=99999;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(isBlocked(r,c)) continue;
    const p=cellCenter(r,c);
    const d=Math.hypot(x-p.x,y-p.y);
    if(d<bestD){bestD=d;best={r,c,d}}
  }
  return best && best.d<34 ? best : null;
}

document.getElementById('game').addEventListener('click', e=>{
  if(suppressNextBoardClick){ suppressNextBoardClick=false; return; }
  const rect=document.getElementById('app').getBoundingClientRect();
  const scale=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale')) || 1;
  const x=(e.clientX-rect.left)/scale;
  const y=(e.clientY-rect.top)/scale;
  const hit=nearestCell(x,y);
  if(hit) cellClick(hit.r,hit.c);
});

function remaining(id){
  const def=unitDefs.find(d=>d.id===id); let used=0;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const p=board[r][c]; if(p&&p.team===playerTeam()&&p.id===id) used++}
  return def.count-used;
}
function totalNeeded(){return totalUnitCount()}
function totalPlaced(){let n=0; for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++) if(board[r][c]&&board[r][c].team===playerTeam()) n++; return n}
function updateStartBtn(){
  const primary=document.getElementById('primaryControlBtn');
  const secondary=document.getElementById('secondaryControlBtn');
  if(!primary || !secondary) return;

  if(phase==='deploy'){
    primary.textContent='START BATTLE';
    primary.disabled = totalPlaced()!==totalNeeded();
    primary.onclick=()=>{
      if(totalPlaced()!==totalNeeded()) return;
      selectedTray=null; selectedPiece=null; legal=[]; scanTargets=[]; scanMode=false;
      renderUnitList(); renderBoard();
      if(onlineState.enabled){
        firebaseSubmitDeployment().then(()=>firebaseStartBattle()).catch(err=>{
          log('Firebase deployment/start failed: '+(err.message||err));
          updateStatus('FIREBASE START ERROR','Could not upload deployment.','Check the room, rules, and both players, then try START BATTLE again.');
        });
        if((onlineState.firstAttackTeam||enemyTeam())===playerTeam()){
          phase='player';
          updateStatus(teamLabel(playerTeam())+' TURN','Online battle started.','You are the first-attack side. Make the opening move.');
        } else {
          phase='waiting';
          updateStatus('ONLINE WAITING','Opponent attacks first.','Waiting for the joining player to make the first move.');
        }
      } else {
        phase='player';
        updateStatus(teamLabel(playerTeam())+' TURN','Battle started.','Drag from a unit’s A/base to move. Click it for skills.');
      }
      updateStartBtn();
    };
    secondary.textContent='RANDOM PLACE';
    secondary.className='btn';
    secondary.onclick=()=>randomPlaceBlue();
  } else if(phase==='commit'){
    primary.textContent='COMMIT';
    primary.disabled=false;
    primary.onclick=()=>commitOnlineMove();
    secondary.textContent='MAIN MENU';
    secondary.className='btn red';
    secondary.onclick=()=>{phase='menu'; selectedPiece=null; selectedTray=null; legal=[]; scanTargets=[]; scanMode=false; abilityMoveMode=false; closeModal(); returnToCommandCenter();};
  } else {
    primary.textContent='RESTART';
    primary.disabled=false;
    primary.onclick=()=>initGame();
    secondary.textContent='MAIN MENU';
    secondary.className='btn red';
    secondary.onclick=()=>{phase='menu'; selectedPiece=null; selectedTray=null; legal=[]; scanTargets=[]; scanMode=false; abilityMoveMode=false; closeModal(); returnToCommandCenter();};
  }
  updateBoardLock();
}

function clearBlueDeployment(){
  if(phase!=='deploy') return;
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      if(board[r][c] && board[r][c].team===playerTeam()) board[r][c]=null;
    }
  }
  selectedTray=null; selectedPiece=null; legal=[]; scanTargets=[]; scanMode=false; abilityMoveMode=false;
  renderUnitList(); renderBoard(); updateConsole(null); updateStartBtn();
  log(teamLabel(playerTeam())+' deployment cleared.');
}

function randomPlaceBlue(){
  if(phase!=='deploy') return;
  clearBlueDeployment();
  let units=[];
  unitDefs.forEach(def=>{for(let i=0;i<def.count;i++) units.push(unitCopy(def,playerTeam()))});
  shuffle(units);
  let spots=[];
  spots=deploymentSpots(PLAYER_DEPLOY_ROWS);
  if(!assertDeploymentCapacity('Player deployment', spots)){
    updateStatus('DEPLOYMENT ERROR','Not enough open player deployment squares.','Move battlefield blockers out of rows 1-3 and 6-8, then restart.');
    log('Player random placement cancelled: not enough deployment spaces.');
    return;
  }
  shuffle(spots);
  units.forEach((u,i)=>{
    const [r,c]=spots[i];
    u.r=r; u.c=c; board[r][c]=u;
  });
  selectedTray=null; selectedPiece=null; legal=[]; scanTargets=[]; scanMode=false; abilityMoveMode=false;
  renderUnitList(); renderBoard(); updateConsole(null); updateStartBtn();
  log(teamLabel(playerTeam())+' units random placed.');
}


function renderUnitList(){
  const list=document.getElementById('unitList'); list.innerHTML='';
  unitDefs.forEach(def=>{
    const row=document.createElement('div');
    row.className='unit-row '+(selectedTray===def.id?'active':'');
    row.onclick=e=>{
      e.stopPropagation();
      if(phase!=='deploy') return;
      selectedTray=def.id; selectedPiece=null; legal=[]; scanTargets=[]; scanMode=false; abilityMoveMode=false;
      updateConsole(def); renderUnitList(); renderBoard();
    };
    const trayImg=unitImage(def.id, playerTeam());
    const trayName=(def.id==="FC")?currentCommander().name:def.name;
    row.innerHTML=`<div class="rankbox">${def.display}</div><div class="thumb"><img src="${trayImg}"></div><div class="uname">${trayName.toUpperCase()}</div><div class="ucount">${remaining(def.id)}</div>`;
    list.appendChild(row);
  });
}

function placeAI(){
  const units=[];
  unitDefs.forEach(def=>{for(let i=0;i<def.count;i++) units.push(unitCopy(def,enemyTeam()))});
  const spots=deploymentSpots(AI_DEPLOY_ROWS);
  if(!assertDeploymentCapacity('AI deployment', spots)){
    updateStatus('AI DEPLOYMENT ERROR','Not enough open AI deployment squares.','Move battlefield blockers out of the top 3 deployment rows, then restart.');
    log('AI placement failed: not enough deployment spaces.');
    return false;
  }

  /* Academy A.I. deployment uses a varied fortress instead of a completely
     random pile. The Beacon receives real cover, the Commander is separated
     from it, scouts start near the frontier, and high ranks form a second
     line. Random tie-breaking keeps the layout from becoming solvable. */
  const free=new Map(spots.map(([r,c])=>[`${r},${c}`,{r,c}]));
  const takeUnit=id=>{
    const index=units.findIndex(unit=>unit.id===id);
    return index<0 ? null : units.splice(index,1)[0];
  };
  const place=(unit,cell)=>{
    if(!unit||!cell||!free.has(`${cell.r},${cell.c}`)) return false;
    free.delete(`${cell.r},${cell.c}`);
    unit.r=cell.r; unit.c=cell.c; board[cell.r][cell.c]=unit;
    return true;
  };
  const chooseSpot=scoreFn=>{
    const choices=[...free.values()].map(cell=>({
      cell,
      score:scoreFn(cell)+Math.random()*24
    }));
    choices.sort((a,b)=>b.score-a.score);
    return choices[0] ? choices[0].cell : null;
  };

  const beaconColumns=[0,2,4,5,7,9];
  const beaconCell={r:0,c:beaconColumns[Math.floor(Math.random()*beaconColumns.length)]};
  place(takeUnit('B'),beaconCell);

  // Three close defenses make the objective credible without always drawing
  // the same obvious box around it.
  const fortressOffsets=[
    [0,-1],[0,1],[1,0],[1,-1],[1,1]
  ];
  shuffle(fortressOffsets);
  const validFortressOffsets=fortressOffsets.filter(
    ([dr,dc])=>free.has(`${beaconCell.r+dr},${beaconCell.c+dc}`)
  );
  for(let i=0;i<Math.min(3,validFortressOffsets.length);i++){
    const [dr,dc]=validFortressOffsets[i];
    place(takeUnit('M'),{r:beaconCell.r+dr,c:beaconCell.c+dc});
  }

  // The Commander is valuable, but never automatically identifies the Beacon
  // by standing beside it.
  const commanderCell=chooseSpot(cell=>{
    const distance=Math.abs(cell.r-beaconCell.r)+Math.abs(cell.c-beaconCell.c);
    return (cell.r===0?95:cell.r===1?75:10)+Math.min(distance,6)*22;
  });
  place(takeUnit('FC'),commanderCell);

  // Remaining mines create decoys and a second defensive pocket.
  while(units.some(unit=>unit.id==='M')){
    const mine=takeUnit('M');
    const cell=chooseSpot(candidate=>{
      const toBeacon=Math.abs(candidate.r-beaconCell.r)+Math.abs(candidate.c-beaconCell.c);
      const toCommander=commanderCell
        ? Math.abs(candidate.r-commanderCell.r)+Math.abs(candidate.c-commanderCell.c)
        : 9;
      let score=candidate.r===0?105:candidate.r===1?70:-90;
      if(toCommander===1) score+=42;
      if(toBeacon<=2) score+=18;
      if(toBeacon>=5) score+=28; // decoy pocket
      return score;
    });
    place(mine,cell);
  }

  // Place the most role-sensitive units first, then fill every remaining slot.
  units.sort((a,b)=>{
    const roleWeight=unit=>unit.specialist?6:unit.recon?5:unit.engineer?4:unit.infiltrator?3:(unit.rank>=7?2:1);
    return roleWeight(b)-roleWeight(a);
  });
  units.forEach(unit=>{
    const cell=chooseSpot(candidate=>{
      let score=0;
      if(unit.specialist) score+=candidate.r===2?155:candidate.r===1?55:-25;
      else if(unit.recon) score+=candidate.r===2?145:candidate.r===1?65:-20;
      else if(unit.engineer) score+=candidate.r===2?125:candidate.r===1?75:5;
      else if(unit.infiltrator) score+=candidate.r===2?105:candidate.r===1?82:20;
      else if(aiPieceRank(unit)>=7) score+=candidate.r===1?135:candidate.r===2?72:45;
      else if(aiPieceRank(unit)>=5) score+=candidate.r===1?112:candidate.r===2?88:38;
      else score+=candidate.r===2?118:candidate.r===1?82:28;

      const toBeacon=Math.abs(candidate.r-beaconCell.r)+Math.abs(candidate.c-beaconCell.c);
      if(aiPieceRank(unit)>=6 && toBeacon<=3) score+=22;
      return score;
    });
    place(unit,cell);
  });
  return true;
}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}}

function renderBoard(){
  const pieces=document.getElementById('pieces'), markers=document.getElementById('markers'), dots=document.getElementById('dots'), nums=document.getElementById('coordNumbers');
  pieces.innerHTML=''; markers.innerHTML=''; dots.innerHTML=''; nums.innerHTML='';

  // coord numbers from board centers
  for(let c=0;c<COLS;c++){
    const p=cellCenter(7,c);
    const n=document.createElement('div'); n.className='board-num xnum'; n.textContent=c+1; n.style.left=p.x+'px'; n.style.top=(p.y+38)+'px'; nums.appendChild(n);
  }
  for(let r=0;r<ROWS;r++){
    const p=cellCenter(r,0);
    const n=document.createElement('div'); n.className='board-num ynum'; n.textContent=ROWS-r; n.style.left=(p.x-55)+'px'; n.style.top=p.y+'px'; nums.appendChild(n);
  }

  if(showCenterDots){
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      const p=cellCenter(r,c);
      const d=document.createElement('div'); d.className='center-dot'; d.style.left=p.x+'px'; d.style.top=p.y+'px'; dots.appendChild(d);
      const lab=document.createElement('div'); lab.className='center-label'; lab.textContent=`${c+1},${ROWS-r}`; lab.style.left=p.x+'px'; lab.style.top=(p.y-14)+'px'; dots.appendChild(lab);
    }
  }

  if(lastMoveGlow){addMarker('lastmove',lastMoveGlow.r,lastMoveGlow.c)}
  if(selectedPiece){addMarker('sel',selectedPiece.r,selectedPiece.c)}
  legal.forEach(t=>addMarker('legal',t.r,t.c));
  scanTargets.forEach(t=>addMarker('scan',t.r,t.c));

  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const piece=board[r][c]; if(!piece) continue;
    if(piece.team===enemyTeam() && !piece.revealed && !piece.scanned && phase!=='gameover' && !showAllEnemies){
      const top=hiddenPieceTopLeft(r,c);
      const h=document.createElement('div');
      h.className='piece hidden-enemy enemy';
      h.dataset.hiddenR=String(r);
      h.dataset.hiddenC=String(c);
      h.dataset.hiddenTeam=piece.team;
      h.style.left=top.x+'px';
      h.style.top=top.y+'px';
      h.style.zIndex=String(100 + r*10);
      h.innerHTML=`<img class="hidden-bw-art" src="${hiddenBWAsset(piece.team)}" alt="">`;
      pieces.appendChild(h);

      // Interaction still lives on the exact A/base hotspot used by normal pieces.
      const p=cellCenter(r,c);
      const hot=document.createElement('div');
      hot.className='a-hotspot enemy-hotspot';
      hot.style.left=p.x+'px';
      hot.style.top=p.y+'px';
      hot.style.zIndex=String(105 + r*10);
      hot.onclick=e=>{
        e.stopPropagation();
        if(scanMode && scanTargets.some(t=>t.r===r&&t.c===c)){ chooseScanTarget(r,c); return; }
        if(selectedPiece && legal.some(t=>t.r===r&&t.c===c)) cellClick(r,c);
        else pieceClick(piece);
      };
      pieces.appendChild(hot);
      continue;
    }
    const top=pieceTopLeft(r,c);
    const el=document.createElement('div'); el.className='piece '+(piece.team===enemyTeam()?'enemy':'');
    el.style.left=top.x+'px'; el.style.top=top.y+'px'; el.style.zIndex=String(100 + r*10);
    el.innerHTML=`<img src="${piece.img||imgMap[piece.id]}">`;
    pieces.appendChild(el);

    const center=cellCenter(r,c);
    const hot=document.createElement('div');
    hot.className='a-hotspot '+(piece.team===enemyTeam()?'enemy-hotspot':'');
    hot.style.left=center.x+'px';
    hot.style.top=center.y+'px';
    hot.style.zIndex=String(105 + r*10);
    hot.title=piece.name+' A-anchor';
    hot.onpointerdown=e=>startPiecePointer(e,piece);
    pieces.appendChild(hot);
  }
  updateReadout();
}
function addMarker(type,r,c){
  const p=cellCenter(r,c);
  const m=document.createElement('div'); 
  m.className='marker '+type; 
  m.style.left=p.x+'px'; 
  m.style.top=p.y+'px'; 
  if(type==='lastmove'){
    m.onclick=e=>{e.stopPropagation();};
  } else {
    m.onclick=e=>{e.stopPropagation(); cellClick(r,c)};
  }
  document.getElementById('markers').appendChild(m);
}

function cellClick(r,c){
  if(isBlocked(r,c)) return;
  if(scanMode){ if(scanTargets.some(t=>t.r===r&&t.c===c)) chooseScanTarget(r,c); return; }
  if(phase==='deploy'){
    if(!PLAYER_DEPLOY_ROWS.includes(r) || !selectedTray || board[r][c] || remaining(selectedTray)<=0) return;
    const def=unitDefs.find(d=>d.id===selectedTray);
    board[r][c]=unitCopy(def,playerTeam(),r,c);
    lastMoveGlow=null;
    updateConsole(board[r][c]); renderUnitList(); renderBoard(); updateStartBtn();
    return;
  }
  if(phase!=='player') return;
  if(abilityMoveMode && selectedPiece && legal.some(t=>t.r===r&&t.c===c)){ chooseWarpTarget(r,c); }
}

function pieceClick(p){
  // Click means inspect / activate console skills.
  // Movement is handled by dragging from the A/base hotspot.
  if(phase==='deploy' && p.team===playerTeam()){
    board[p.r][p.c]=null; lastMoveGlow=null; renderUnitList(); renderBoard(); updateConsole(p); updateStartBtn(); return;
  }
  if(p.team===playerTeam() || p.revealed || p.scanned || showAllEnemies) updateConsole(p);
  if(phase==='player' && p.team===playerTeam()){
    selectedPiece=p;
    legal=[];
    scanMode=false;
    abilityMoveMode=false;
    scanTargets=[];
    renderBoard();
  }
}

function getLegal(p){
  const out=[], dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  if(!p.movable) return out;
  if(p.recon){
    for(const [dr,dc] of dirs){
      let r=p.r+dr,c=p.c+dc;
      while(inBounds(r,c)&&!isBlocked(r,c)){
        const o=board[r][c];
        if(!o) out.push({r,c});
        else{ if(o.team!==p.team) out.push({r,c}); break; }
        r+=dr; c+=dc;
      }
    }
  } else {
    for(const [dr,dc] of dirs){
      const r=p.r+dr,c=p.c+dc;
      if(!inBounds(r,c)||isBlocked(r,c)) continue;
      const o=board[r][c];
      if(!o || o.team!==p.team) out.push({r,c});
    }
  }
  return out;
}
function performAction(p,r,c){
  const from={r:p.r,c:p.c};
  const to={r,c};
  const target=board[r][c];

  // The A.I. remembers only the public fact that this concealed token moved.
  // It never reads the hidden rank from that movement. A long straight move is
  // enough to identify a Recon Runner, exactly as it would be for a player.
  if(!onlineState.enabled && p.team===playerTeam()){
    aiRecordPublicPlayerMove(p,from,to);
  }

  if(!target){
    playSound('movePiece',{volume:.72});
    const privateText=moveTextFor(p,from,to,null);
    const publicText=publicMoveText(from,to,null);
    board[p.r][p.c]=null; p.r=r; p.c=c; board[r][c]=p;
    lastMoveGlow={r,c};
    log(privateText);
    if(onlineState.enabled){
      // Privacy rule: never send the moving unit's name/id in the room commit.
      onlineState.pendingMove={type:'move', from, to, publicText, privateText};
    }
    finishPlayerTurn();
    return;
  }

  if(target.team!==p.team){
    const privateText=moveTextFor(p,from,to,target);
    const publicText=publicMoveText(from,to,target);
    playSound('attack',{volume:.86});
    resolveCombat(p,target);
    lastMoveGlow={r,c};
    if(onlineState.enabled){
      // Combat replay is a later layer. For now, do not expose attacker/defender identity through commit text.
      onlineState.pendingMove={type:'attack', from, to, publicText, privateText};
    }
    finishPlayerTurn();
  }
}
function resolveCombat(a,d){
  const newlyRevealedEnemy=[a,d].filter(p=>p && p.team===enemyTeam() && !p.revealed && !p.scanned).length;
  if(newlyRevealedEnemy && typeof recordProfileReveal==='function') recordProfileReveal(newlyRevealedEnemy);

  a.revealed=true;
  d.revealed=true;
  log(`${a.team.toUpperCase()} ${a.name} challenged ${d.team.toUpperCase()} ${d.name}.`);

  const aHadShield=!!a.shielded;
  const dHadShield=!!d.shielded;
  let shieldSoundPlayed=false;

  function burnShield(piece,absorbed=false){
    if(!piece || !piece.shielded) return;
    piece.shielded=false;
    shieldArmed[piece.team]=false;
    if(!shieldSoundPlayed){
      playSound('shields',{volume:.92});
      shieldSoundPlayed=true;
    }
    log(piece.name+(absorbed
      ? ' Emergency Shield absorbed the attack and collapsed.'
      : ' Emergency Shield collapsed after combat.'));
  }

  function burnWinningShields(){
    if(aHadShield && a.shielded) burnShield(a,false);
    if(dHadShield && d.shielded) burnShield(d,false);
  }

  if(d.beacon){
    if(aHadShield) burnShield(a,false);
    capturePiece(a.team,d);
    moveInto(a,d.r,d.c);
    endGame(a.team.toUpperCase()+' captured the Academy Beacon!');
    return;
  }

  /* Shield Mines / Bombs:
     A shielded Commander survives the blast, but the shield is consumed.
     The mine remains on the board, matching normal mine behavior. */
  if(d.mine){
    if(a.engineer){
      const oldR=a.r, oldC=a.c, targetR=d.r, targetC=d.c;
      board[oldR][oldC]=null;
      board[targetR][targetC]=a;
      a.r=targetR;
      a.c=targetC;
      playSound('scanner',{volume:.88});
      capturePiece(a.team,d);
      log(a.name+' disabled and removed a Shield Mine.');
      if(aHadShield) burnShield(a,false);
    } else if(aHadShield){
      playSound('bomb',{volume:.95});
      log(a.name+' triggered a Shield Mine.');
      burnShield(a,true);
      d.revealed=true;
    } else {
      playSound('bomb',{volume:.95});
      log(a.name+' was destroyed by a Shield Mine.');
      capturePiece(d.team,a);
      board[a.r][a.c]=null;
      d.revealed=true;
    }
    return;
  }

  /* Infiltrator vs Commander is still an attack. Emergency Shield can
     prevent that one removal, then immediately burns out. */
  if(a.infiltrator){
    if(d.rank===10){
      if(dHadShield){
        burnShield(d,true);
        if(aHadShield && a.shielded) burnShield(a,false);
        return;
      }
      capturePiece(a.team,d);
      moveInto(a,d.r,d.c);
      if(aHadShield) burnShield(a,false);
      endGame(a.team.toUpperCase()+' eliminated the Fleet Commander!');
    } else {
      if(aHadShield){
        burnShield(a,true);
        if(dHadShield && d.shielded) burnShield(d,false);
        return;
      }
      capturePiece(d.team,a);
      board[a.r][a.c]=null;
      if(dHadShield) burnShield(d,false);
      log('Infiltrator failed.');
    }
    return;
  }

  if(d.infiltrator){
    if(dHadShield){
      burnShield(d,true);
      if(aHadShield && a.shielded) burnShield(a,false);
      return;
    }
    capturePiece(a.team,d);
    moveInto(a,d.r,d.c);
    if(aHadShield) burnShield(a,false);
    log(a.name+' caught the Infiltrator.');
    return;
  }

  if(a.rank>d.rank){
    if(dHadShield){
      burnShield(d,true);
      if(aHadShield && a.shielded) burnShield(a,false);
      return;
    }

    const fc=d.rank===10;
    capturePiece(a.team,d);
    moveInto(a,d.r,d.c);
    if(aHadShield) burnShield(a,false);
    log(a.name+' wins.');
    if(fc) endGame(a.team.toUpperCase()+' eliminated the Fleet Commander!');
  }
  else if(a.rank<d.rank){
    if(aHadShield){
      burnShield(a,true);
      if(dHadShield && d.shielded) burnShield(d,false);
      return;
    }

    const fc=a.rank===10;
    capturePiece(d.team,a);
    board[a.r][a.c]=null;
    if(dHadShield) burnShield(d,false);
    log(a.name+' lost.');
    if(fc) endGame(d.team.toUpperCase()+' eliminated the Fleet Commander!');
  }
  else {
    /* Equal ranks normally remove both. A shield protects its Commander
       from that removal, but is consumed. */
    const afc=a.rank===10;
    const dfc=d.rank===10;
    const removeA=!aHadShield;
    const removeD=!dHadShield;

    if(removeA){
      capturePiece(d.team,a);
      board[a.r][a.c]=null;
    }
    if(removeD){
      capturePiece(a.team,d);
      board[d.r][d.c]=null;
    }

    if(aHadShield) burnShield(a,true);
    if(dHadShield) burnShield(d,true);

    if(removeA && removeD){
      log('Equal ranks. Both removed.');
      if(afc&&dfc) endGame('Both Fleet Commanders were eliminated. Draw.');
    } else if(!removeA && !removeD){
      log('Equal ranks. Both Emergency Shields absorbed the clash.');
    } else if(!removeA){
      log(a.name+' survived the equal-rank clash behind its Emergency Shield.');
      if(dfc) endGame(a.team.toUpperCase()+' eliminated the Fleet Commander!');
    } else {
      log(d.name+' survived the equal-rank clash behind its Emergency Shield.');
      if(afc) endGame(d.team.toUpperCase()+' eliminated the Fleet Commander!');
    }
  }
}
function moveInto(p,r,c){board[p.r][p.c]=null; p.r=r; p.c=c; board[r][c]=p}
function finishPlayerTurn(){
  selectedPiece=null; legal=[]; scanMode=false; abilityMoveMode=false; scanTargets=[]; pendingConfirm=null; hideConfirm(); renderBoard(); renderUnitList();
  if(onlineState.enabled){
    phase='commit';
    onlineState.pendingCommit=true;
    updateStatus('COMMIT MOVE','Review your move.','Press COMMIT to send this move and pass the turn to the other player.');
    log('Move ready. Press COMMIT to pass the turn.');
    updateStartBtn();
    return;
  }
  if(phase==='gameover') return;
  phase='ai'; updateStatus(teamLabel(enemyTeam())+' ACADEMY AI','Enemy turn.','Computer is making a move...'); updateStartBtn();
  setTimeout(aiTurn,450);
}
/* =========================================================
   ACADEMY A.I. v194
   Fair-information strategy: memory, inference, defense, role play, scanning
   ========================================================= */
function aiResetMemory(){
  aiMemory={
    turn:0,
    knownPlayer:new Map(),
    movedPlayerUids:new Set(),
    longMoverUids:new Set(),
    recentAiMoves:[],
    lastPlayerMove:null
  };
}

function aiPieceRank(piece){
  return Number(piece&&piece.rank)||0;
}

function aiDistance(a,b){
  return Math.abs(a.r-b.r)+Math.abs(a.c-b.c);
}

function aiSnapshotPlayer(piece,inferred=false){
  return {
    full:true,
    inferred:!!inferred,
    id:piece.id,
    rank:piece.rank==null?null:Number(piece.rank),
    movable:piece.movable!==false,
    mine:!!piece.mine,
    beacon:!!piece.beacon,
    engineer:!!piece.engineer,
    recon:!!piece.recon,
    specialist:!!piece.specialist,
    infiltrator:!!piece.infiltrator,
    shielded:!!piece.shielded
  };
}

function aiRememberPlayerIdentity(piece){
  if(!piece||piece.team!==playerTeam()) return null;
  const snapshot=aiSnapshotPlayer(piece,false);
  aiMemory.knownPlayer.set(piece.uid,snapshot);
  return snapshot;
}

function aiRecordPublicPlayerMove(piece,from,to){
  if(!piece||piece.team!==playerTeam()||!from||!to) return;
  const distance=aiDistance(from,to);
  aiMemory.movedPlayerUids.add(piece.uid);
  aiMemory.lastPlayerMove={uid:piece.uid,from:{...from},to:{...to},distance};

  if(piece.revealed||piece.scanned){
    aiRememberPlayerIdentity(piece);
  }else if(distance>1){
    // With normal movement rules, an unrevealed multi-square mover is a Recon
    // Runner. Commander movement tactics reveal before they move.
    aiMemory.longMoverUids.add(piece.uid);
    aiMemory.knownPlayer.set(piece.uid,{
      full:true,
      inferred:true,
      id:'RR',rank:2,movable:true,mine:false,beacon:false,
      engineer:false,recon:true,specialist:false,infiltrator:false,shielded:false
    });
  }
}

function aiKnownProfile(piece){
  if(!piece||piece.team!==playerTeam()) return null;
  if(piece.revealed||piece.scanned) aiRememberPlayerIdentity(piece);

  const remembered=aiMemory.knownPlayer.get(piece.uid);
  if(remembered) return remembered;
  if(aiMemory.movedPlayerUids.has(piece.uid)){
    return {full:false,movable:true,mine:false,beacon:false};
  }
  return null;
}

function aiKnows(piece){
  const profile=aiKnownProfile(piece);
  return !!(profile&&profile.full);
}

function aiObserveVisiblePlayerIdentities(){
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const piece=board[r][c];
    if(piece&&piece.team===playerTeam()&&(piece.revealed||piece.scanned)){
      aiRememberPlayerIdentity(piece);
    }
  }
}

function aiCapturedId(raw){
  const value=String(raw);
  const def=unitDefs.find(unit=>unit.id===value||String(unit.display)===value||String(unit.rank)===value);
  return def?def.id:null;
}

function aiUnknownPool(players){
  const counts=new Map(unitDefs.map(def=>[def.id,def.count]));
  (captured[enemyTeam()]||[]).forEach(raw=>{
    const id=aiCapturedId(raw);
    if(id&&counts.has(id)) counts.set(id,Math.max(0,counts.get(id)-1));
  });
  players.forEach(piece=>{
    const profile=aiKnownProfile(piece);
    if(profile&&profile.full&&counts.has(profile.id)){
      counts.set(profile.id,Math.max(0,counts.get(profile.id)-1));
    }
  });
  return unitDefs
    .map(def=>({def,count:counts.get(def.id)||0}))
    .filter(entry=>entry.count>0);
}

function aiPieceValue(piece){
  if(!piece) return 0;
  if(piece.beacon) return 10000;
  if(piece.mine) return 680;
  if(piece.rank===10||piece.id==='FC') return 6200;
  if(piece.infiltrator) return 920;
  if(piece.engineer) return 820;
  if(piece.specialist) return 610;
  if(piece.recon) return 560;
  return 340+aiPieceRank(piece)*235;
}

function aiCombatOutcome(attacker,target){
  if(!attacker||!target) return 'loss';
  if(target.beacon) return 'objective';
  if(target.mine){
    return (attacker.engineer||(attacker.id==='FC'&&Number(attacker.sabotageCharges)>0))?'win':'loss';
  }
  if(attacker.infiltrator) return target.rank===10?'win':'loss';
  if(target.infiltrator) return 'win';

  const attackRank=aiPieceRank(attacker);
  const targetRank=Number(target.rank)||0;
  if(attackRank>targetRank) return target.shielded?'shield':'win';
  if(attackRank===targetRank) return target.shielded?'loss':'trade';
  return 'loss';
}

function aiCanSafelyBeatKnown(attacker,target){
  const profile=target&&target.team===playerTeam()?aiKnownProfile(target):target;
  if(!profile||!profile.full) return false;
  return ['objective','win','shield'].includes(aiCombatOutcome(attacker,profile));
}

function aiObjectiveSuspicion(target){
  if(!target||aiMemory.movedPlayerUids.has(target.uid)) return 0;
  let score=target.r===7?300:target.r===6?155:target.r===5?55:0;
  const neighbors=[[1,0],[-1,0],[0,1],[0,-1]];
  neighbors.forEach(([dr,dc])=>{
    const r=target.r+dr,c=target.c+dc;
    const piece=inBounds(r,c)?board[r][c]:null;
    if(piece&&piece.team===playerTeam()&&!aiMemory.movedPlayerUids.has(piece.uid)) score+=24;
  });
  return score;
}

function aiCommanderSuspicion(target){
  if(!target) return 0;
  let score=target.r===7?165:target.r===6?105:target.r===5?45:30;
  if(aiMemory.movedPlayerUids.has(target.uid)) score+=35;
  if(aiMemory.lastPlayerMove&&aiMemory.lastPlayerMove.uid===target.uid) score+=20;
  return score;
}

function aiOwnObjectives(){
  const objectives=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const piece=board[r][c];
    if(piece&&piece.team===enemyTeam()&&(piece.beacon||piece.rank===10)) objectives.push(piece);
  }
  return objectives;
}

function aiDefenseUrgency(target,objectives){
  if(!target) return 0;
  const profile=aiKnownProfile(target);
  if(profile&&profile.full&&profile.movable===false) return 0;

  let urgency=0;
  objectives.forEach(objective=>{
    const distance=aiDistance(target,objective);
    if(objective.beacon){
      if(distance===1) urgency=Math.max(urgency,3600);
      else if(distance===2) urgency=Math.max(urgency,1750);
      else if(distance===3) urgency=Math.max(urgency,520);
    }else{
      const infiltratorThreat=profile&&profile.full&&profile.infiltrator;
      if(infiltratorThreat&&distance<=2) urgency=Math.max(urgency,3300-distance*300);
      else if(distance===1) urgency=Math.max(urgency,720);
      else if(distance===2) urgency=Math.max(urgency,260);
    }
  });
  return urgency;
}

function aiExpectedUnknownAttack(attacker,target,pool){
  const moved=aiMemory.movedPlayerUids.has(target.uid);
  const suspicion=aiObjectiveSuspicion(target);
  let totalWeight=0;
  let totalScore=0;

  pool.forEach(({def,count})=>{
    if(moved&&def.movable===false) return;
    let weight=count;
    if(!moved&&def.beacon) weight*=1+suspicion/210;
    if(!moved&&def.mine) weight*=1+suspicion/520;
    if(def.rank===10) weight*=1+aiCommanderSuspicion(target)/600;

    const profile={...def,full:true};
    const outcome=aiCombatOutcome(attacker,profile);
    const attackerValue=aiPieceValue(attacker);
    const targetValue=aiPieceValue(profile);
    let result=0;
    if(outcome==='objective') result=9000;
    else if(outcome==='win') result=720+targetValue*.88;
    else if(outcome==='shield') result=380;
    else if(outcome==='trade') result=targetValue-attackerValue*1.08;
    else result=-attackerValue*1.28;

    totalWeight+=weight;
    totalScore+=result*weight;
  });

  return totalWeight?totalScore/totalWeight:-aiPieceValue(attacker);
}

function aiKnownAttackScore(attacker,target,profile,objectives){
  const outcome=aiCombatOutcome(attacker,profile);
  const attackerValue=aiPieceValue(attacker);
  const targetValue=aiPieceValue(profile);
  const defense=aiDefenseUrgency(target,objectives);
  let score=-9000;

  if(outcome==='objective') score=100000;
  else if(outcome==='win'){
    score=4100+targetValue*1.7-attackerValue*.22;
    if(profile.rank===10) score=90000;
    if(profile.mine) score+=900;
    if(profile.rank!=null&&attacker.rank!=null){
      // The smallest sufficient attacker is usually the correct Stratego play.
      score-=Math.max(0,aiPieceRank(attacker)-Number(profile.rank)-1)*82;
    }
  }else if(outcome==='shield') score=2350+targetValue*.16;
  else if(outcome==='trade'){
    score=targetValue>=attackerValue*1.22
      ? 1350+(targetValue-attackerValue)
      : -1850+(targetValue-attackerValue);
  }

  if(attacker.rank===10&&outcome!=='objective'&&profile.rank!==10) score-=480;
  return score+defense+Math.random()*18;
}

function aiUnknownAttackScore(attacker,target,pool,objectives){
  const moved=aiMemory.movedPlayerUids.has(target.uid);
  const expected=aiExpectedUnknownAttack(attacker,target,pool);
  const defense=aiDefenseUrgency(target,objectives);
  let score=710+expected*.72+defense;

  if(moved) score+=150;
  else if(attacker.engineer) score+=230;
  if(attacker.specialist) score-=520;
  if(attacker.infiltrator) score-=300-aiCommanderSuspicion(target)*1.25;
  if(attacker.rank===10) score-=1350;
  if(!attacker.specialist&&!attacker.infiltrator&&aiPieceRank(attacker)<=4) score+=90;
  return score+Math.random()*22;
}

function aiKnownPlayerCanBeat(profile,defender){
  if(!profile||!profile.full||profile.movable===false||!defender) return false;
  if(profile.infiltrator) return defender.rank===10;
  if(defender.infiltrator) return true;
  return (Number(profile.rank)||0)>=aiPieceRank(defender);
}

function aiAdjacentThreatPenalty(unit,r,c){
  let penalty=0;
  const directions=[[1,0],[-1,0],[0,1],[0,-1]];
  directions.forEach(([dr,dc])=>{
    const rr=r+dr,cc=c+dc;
    const target=inBounds(rr,cc)?board[rr][cc]:null;
    if(!target||target.team!==playerTeam()) return;
    const profile=aiKnownProfile(target);
    if(profile&&profile.full){
      if(aiKnownPlayerCanBeat(profile,unit)) penalty+=aiPieceValue(unit)*1.15;
    }else{
      penalty+=aiPieceValue(unit)*(unit.rank===10?.46:.17);
    }
  });
  return penalty;
}

function aiStrategicTargetValue(unit,target){
  const profile=aiKnownProfile(target);
  if(profile&&profile.full){
    if(profile.beacon) return 7600;
    if(profile.rank===10) return unit.infiltrator?7000:1850;
    if(profile.mine) return unit.engineer?2400:70;
    const outcome=aiCombatOutcome(unit,profile);
    if(outcome==='win'||outcome==='shield') return 1450+aiPieceValue(profile)*.35;
    if(outcome==='trade') return aiPieceValue(profile)>aiPieceValue(unit)?850:170;
    return 45;
  }

  let value=620+aiObjectiveSuspicion(target);
  if(aiMemory.movedPlayerUids.has(target.uid)) value=690;
  if(unit.engineer&&!aiMemory.movedPlayerUids.has(target.uid)) value+=260;
  if(unit.infiltrator) value=230+aiCommanderSuspicion(target)*2.1;
  return value;
}

function aiPressureAt(unit,r,c,players){
  let best=-4000;
  players.forEach(target=>{
    const distance=Math.abs(r-target.r)+Math.abs(c-target.c);
    best=Math.max(best,aiStrategicTargetValue(unit,target)-distance*145);
  });
  return best;
}

function aiMostUrgentThreat(players,objectives){
  let best=null;
  players.forEach(target=>{
    const score=aiDefenseUrgency(target,objectives);
    if(!best||score>best.score) best={target,score};
  });
  return best&&best.score>0?best:null;
}

function aiMoveScore(unit,to,players,objectives){
  const from={r:unit.r,c:unit.c};
  let score=(aiPressureAt(unit,to.r,to.c,players)-aiPressureAt(unit,from.r,from.c,players))*.92;
  score+=(to.r-from.r)*54;

  const moveDistance=aiDistance(from,to);
  if(unit.recon&&moveDistance>1) score+=Math.min(moveDistance,4)*24;
  if(unit.specialist) score-=35;
  if(unit.rank===10&&aiMemory.turn<5) score-=520;

  const urgent=aiMostUrgentThreat(players,objectives);
  if(urgent){
    const before=aiDistance(from,urgent.target);
    const after=aiDistance(to,urgent.target);
    score+=(before-after)*185;
    if(after===1) score+=urgent.score*.34;
  }

  const beacon=objectives.find(piece=>piece.beacon);
  if(beacon&&aiPieceRank(unit)>=5){
    const before=aiDistance(from,beacon);
    const after=aiDistance(to,beacon);
    if(urgent&&urgent.score>700&&before<=2&&after>before) score-=430;
  }

  score-=aiAdjacentThreatPenalty(unit,to.r,to.c);

  const last=[...aiMemory.recentAiMoves].find(move=>move.uid===unit.uid);
  if(last&&to.r===last.from.r&&to.c===last.from.c) score-=680;

  return score+Math.random()*28;
}

function aiGetScanTargets(specialist){
  const targets=[];
  for(let r=specialist.r-2;r<=specialist.r+2;r++)for(let c=specialist.c-2;c<=specialist.c+2;c++){
    if(!inBounds(r,c)||isBlocked(r,c)||(r===specialist.r&&c===specialist.c)) continue;
    const target=board[r][c];
    if(!target||target.team!==playerTeam()) continue;
    const profile=aiKnownProfile(target);
    if(profile&&profile.full) continue;
    if(blocksScan(specialist,r,c)) continue;
    targets.push(target);
  }
  return targets;
}

function aiScanScore(specialist,target,objectives){
  let score=1650+aiObjectiveSuspicion(target)+aiDefenseUrgency(target,objectives)*.45;
  if(aiMemory.movedPlayerUids.has(target.uid)) score+=105;
  score-=aiAdjacentThreatPenalty(specialist,specialist.r,specialist.c)*.25;
  return score+Math.random()*20;
}

function aiGenerateCandidates(units,players,objectives,pool){
  const candidates=[];
  units.forEach(unit=>{
    if(unit.specialist){
      aiGetScanTargets(unit).forEach(target=>{
        candidates.push({type:'scan',u:unit,target,score:aiScanScore(unit,target,objectives)});
      });
    }

    getLegal(unit).forEach(to=>{
      const target=board[to.r][to.c];
      if(target&&target.team===playerTeam()){
        const profile=aiKnownProfile(target);
        const score=profile&&profile.full
          ? aiKnownAttackScore(unit,target,profile,objectives)
          : aiUnknownAttackScore(unit,target,pool,objectives);
        candidates.push({type:'attack',u:unit,t:to,target,score});
      }else if(!target){
        candidates.push({type:'move',u:unit,t:to,score:aiMoveScore(unit,to,players,objectives)});
      }
    });
  });
  return candidates;
}

function aiChooseCandidate(candidates){
  if(!candidates.length) return null;
  candidates.sort((a,b)=>b.score-a.score);
  const top=candidates[0];
  if(top.score>=80000) return top;

  // Choose among only near-equal plans. This avoids robotic repetition without
  // throwing away a clearly superior objective capture or defensive response.
  const close=candidates.filter(candidate=>candidate.score>=top.score-85).slice(0,3);
  const weights=close.map(candidate=>Math.exp((candidate.score-top.score)/34));
  const total=weights.reduce((sum,value)=>sum+value,0);
  let roll=Math.random()*total;
  for(let i=0;i<close.length;i++){
    roll-=weights[i];
    if(roll<=0) return close[i];
  }
  return top;
}

function aiRecordOwnAction(unit,from,to,type){
  aiMemory.recentAiMoves.unshift({uid:unit.uid,from:{...from},to:{...to},type,turn:aiMemory.turn});
  aiMemory.recentAiMoves=aiMemory.recentAiMoves.slice(0,8);
}

function aiExecuteScan(specialist,target){
  specialist.revealed=true;
  target.scanned=true;
  aiRememberPlayerIdentity(target);
  if(typeof bw110RememberReveal==='function'){
    bw110RememberReveal(specialist,enemyTeam());
    bw110RememberReveal(target,enemyTeam());
  }
  playSound('scanner',{volume:.88});
  lastMoveGlow={r:target.r,c:target.c};
  log(teamLabel(enemyTeam())+' Target Specialist scanned the contact at '+(target.c+1)+','+(ROWS-target.r)+'.');
}

function aiTurn(){
  if(phase!=='ai') return;

  aiMemory.turn++;
  aiObserveVisiblePlayerIdentities();

  const units=[];
  const players=[];
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const piece=board[r][c];
    if(!piece) continue;
    if(piece.team===enemyTeam()&&piece.movable) units.push(piece);
    else if(piece.team===playerTeam()) players.push(piece);
  }

  const finishAiTurn=()=>{
    if(phase!=='gameover'){
      phase='player';
      updateStatus(teamLabel(playerTeam())+' TURN','Your turn.','Drag from a unit’s A/base to move. Click the A/base to use skills.');
      updateStartBtn();
    }
  };

  if(!units.length){
    finishAiTurn();
    return;
  }

  const objectives=aiOwnObjectives();
  const pool=aiUnknownPool(players);
  const pick=aiChooseCandidate(aiGenerateCandidates(units,players,objectives,pool));

  if(pick){
    if(pick.type==='scan'){
      aiExecuteScan(pick.u,pick.target);
    }else if(pick.type==='attack'){
      const target=board[pick.t.r]&&board[pick.t.r][pick.t.c];
      if(target&&target.team===playerTeam()){
        const from={r:pick.u.r,c:pick.u.c};
        aiRecordOwnAction(pick.u,from,pick.t,'attack');
        // Combat publicly reveals both units, so remembering the target at the
        // instant the challenge begins is fair even when the FX resolves later.
        aiRememberPlayerIdentity(target);
        lastMoveGlow={r:pick.t.r,c:pick.t.c};
        playSound('attack',{volume:.78});
        resolveCombat(pick.u,target);
      }
    }else{
      const from={r:pick.u.r,c:pick.u.c};
      aiRecordOwnAction(pick.u,from,pick.t,'move');
      playSound('movePiece',{volume:.62});
      board[from.r][from.c]=null;
      pick.u.r=pick.t.r;
      pick.u.c=pick.t.c;
      board[pick.t.r][pick.t.c]=pick.u;
      lastMoveGlow={r:pick.t.r,c:pick.t.c};
      log(teamLabel(enemyTeam())+' Academy A.I. repositioned a unit.');
    }
  }

  const combatAnimating=typeof bw128CombatActive!=='undefined'&&bw128CombatActive;
  if(!combatAnimating) finishAiTurn();
  renderBoard();
  renderUnitList();
  updateConsole(selectedPiece);
}
function activateScan(piece){
  selectedPiece=piece;
  if(piece && piece.team===playerTeam() && !piece.revealed){
    piece.revealed=true;
    log(piece.name+' revealed to activate Scan.');
  }
  legal=[]; pendingConfirm=null; hideConfirm(); scanMode=true; scanTargets=getScanTargets(piece); renderBoard(); updateStatus('SCAN MODE','Choose a ? target.','Click a hidden enemy in 2-space range, then press TARGET CONFIRM.');
}
function blocksScan(p,r,c){
  const dr=r-p.r, dc=c-p.c;
  const sr=Math.sign(dr), sc=Math.sign(dc);
  if(!(dr===0 || dc===0 || Math.abs(dr)===Math.abs(dc))) return false;
  let cr=p.r+sr, cc=p.c+sc;
  while(cr!==r || cc!==c){
    if(board[cr][cc] && board[cr][cc].team!==p.team) return true;
    cr+=sr; cc+=sc;
  }
  return false;
}
function getScanTargets(p){
  const out=[]; for(let r=p.r-2;r<=p.r+2;r++)for(let c=p.c-2;c<=p.c+2;c++){
    if(!inBounds(r,c)||isBlocked(r,c)||(r===p.r&&c===p.c)) continue;
    const target=board[r][c];
    if(!target || target.team!==enemyTeam() || target.revealed || target.scanned) continue;
    if(blocksScan(p,r,c)) continue;
    out.push({r,c});
  } return out;
}
function doScan(r,c){playSound('scanner',{volume:.88}); const t=board[r][c]; if(t&&t.team===enemyTeam()){const wasHidden=!t.scanned&&!t.revealed; t.scanned=true; if(wasHidden&&typeof recordProfileReveal==='function') recordProfileReveal(1); if(t.beacon) playBeaconAlert(); log('Target Specialist identified '+teamLabel(enemyTeam())+' '+t.name+'.')} else log('Scan found no enemy signal.'); finishPlayerTurn();}


function startPiecePointer(e,piece){
  e.stopPropagation();
  e.preventDefault();

  const startX=e.clientX, startY=e.clientY;
  let moved=false;

  const onMoveCheck=(ev)=>{
    if(Math.hypot(ev.clientX-startX, ev.clientY-startY)>10){
      cleanupCheck();
      beginDrag(ev,piece);
      moved=true;
    }
  };
  const onUpCheck=(ev)=>{
    cleanupCheck();
    if(!moved){
      pieceClick(piece);
    }
  };
  const cleanupCheck=()=>{
    window.removeEventListener('pointermove',onMoveCheck);
    window.removeEventListener('pointerup',onUpCheck);
    window.removeEventListener('pointercancel',onUpCheck);
  };
  window.addEventListener('pointermove',onMoveCheck);
  window.addEventListener('pointerup',onUpCheck);
  window.addEventListener('pointercancel',onUpCheck);
}

function beginDrag(e,piece){
  if(phase==='waiting' || phase==='commit'){
    log('Board locked until this turn is active.');
    return;
  }
  if(phase!=='player' || piece.team!==playerTeam() || !piece.movable){
    pieceClick(piece);
    return;
  }

  selectedPiece=piece;
  legal=getLegal(piece);
  scanMode=false;
  abilityMoveMode=false;
  scanTargets=[];
  renderBoard();

  const ghost=document.createElement('div');
  ghost.className='drag-ghost';
  ghost.innerHTML=`<img src="${piece.img||imgMap[piece.id]}">`;
  document.getElementById('pieces').appendChild(ghost);

  dragState={piece,ghost,legal};
  moveGhost(e);

  window.addEventListener('pointermove',dragMove);
  window.addEventListener('pointerup',dragEnd);
  window.addEventListener('pointercancel',dragCancel);
}

function appPointer(e){
  const rect=document.getElementById('app').getBoundingClientRect();
  const scale=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale')) || 1;
  return {x:(e.clientX-rect.left)/scale, y:(e.clientY-rect.top)/scale};
}

function moveGhost(e){
  if(!dragState) return;
  const p=appPointer(e);
  dragState.ghost.style.left=(p.x-BASE_ANCHOR.x-anchorOffset.x)+'px';
  dragState.ghost.style.top=(p.y-BASE_ANCHOR.y-anchorOffset.y)+'px';
}

function dragMove(e){
  e.preventDefault();
  moveGhost(e);
}

function dragEnd(e){
  if(!dragState) return;
  const {piece,ghost,legal}=dragState;
  const p=appPointer(e);
  const hit=nearestCell(p.x,p.y);
  ghost.remove();
  cleanupDrag();
  suppressNextBoardClick=true;

  if(hit && legal.some(t=>t.r===hit.r && t.c===hit.c)){
    performAction(piece,hit.r,hit.c);
  } else {
    log('Move cancelled.');
    selectedPiece=null; legal=[]; renderBoard();
  }
}

function dragCancel(){
  if(dragState && dragState.ghost) dragState.ghost.remove();
  cleanupDrag();
  suppressNextBoardClick=true;
  selectedPiece=null; legal=[]; renderBoard();
}

function cleanupDrag(){
  dragState=null;
  window.removeEventListener('pointermove',dragMove);
  window.removeEventListener('pointerup',dragEnd);
  window.removeEventListener('pointercancel',dragCancel);
}

function updateCaptured(){
  const el=document.getElementById('capturedList');
  if(!el) return;
  const playerCaptured = (captured[playerTeam()]||[]).length ? captured[playerTeam()].join(', ') : 'None';
  el.textContent = playerCaptured;
}

function capturePiece(winnerTeam, loser){
  if(!loser) return;
  if(winnerTeam===playerTeam() && typeof recordProfileStatDelta==='function'){
    if(loser.beacon) recordProfileStatDelta('beacons',1);
    if(loser.rank===10) recordProfileStatDelta('commanders',1);
  }
  const arr = captured[winnerTeam] || [];
  arr.push(loser.display || loser.rank || loser.id);
  captured[winnerTeam]=arr;
  updateCaptured();
}


function showConfirm(title,text,buttonText,onConfirm){
  const box=document.getElementById('confirmBox');
  document.getElementById('confirmTitle').textContent=title;
  document.getElementById('confirmText').textContent=text;
  const btn=document.getElementById('confirmBtn');
  btn.textContent=buttonText;
  btn.onclick=onConfirm;
  document.getElementById('cancelConfirmBtn').onclick=()=>cancelConfirm();
  box.classList.add('show');
}
function hideConfirm(){const box=document.getElementById('confirmBox'); if(box) box.classList.remove('show')}
function cancelConfirm(){pendingConfirm=null; hideConfirm(); if(scanMode||abilityMoveMode){renderBoard();}}
function chooseScanTarget(r,c){
  const t=board[r][c];
  pendingConfirm={type:'scan',r,c};
  addMarker('sel',r,c);
  showConfirm('Target Confirm', t?('Scan '+(t.scanned||t.revealed?t.name:'unknown enemy')+' at '+(c+1)+','+(ROWS-r)+'?'):('Scan empty signal at '+(c+1)+','+(ROWS-r)+'?'), 'TARGET CONFIRM', ()=>confirmPending());
}
function chooseWarpTarget(r,c){
  pendingConfirm={type:'warp',r,c,piece:selectedPiece};
  addMarker('sel',r,c);
  showConfirm('Energize', 'Warp Fleet Commander to '+(c+1)+','+(ROWS-r)+'?', 'ENERGIZE', ()=>confirmPending());
}
function confirmPending(){
  if(!pendingConfirm) return;
  const p=pendingConfirm; pendingConfirm=null; hideConfirm();
  if(p.type==='scan'){doScan(p.r,p.c); return;}
  if(p.type==='warp'){
    if(p.piece && abilityMoveMode && legal.some(t=>t.r===p.r&&t.c===p.c)){
      abilityMoveMode=false; commanderUse[playerTeam()]=0; if(typeof recordProfileTactic==='function') recordProfileTactic(1); playSound('teleport',{volume:.95}); updateConsole(p.piece); performAction(p.piece,p.r,p.c);
    }
  }
}

function updateConsole(obj){
  const img=document.getElementById('consoleImg'), name=document.getElementById('consoleName'), text=document.getElementById('consoleText'), uses=document.getElementById('consoleUses'), actions=document.getElementById('consoleActions');
  actions.innerHTML=''; uses.textContent='';
  if(!obj){
    const cmd=(typeof currentCommander==='function')?currentCommander():null;
    img.src=cmd?cmd.profile:'PROF_FC.jpg';
    name.textContent=cmd?cmd.name:'Select a unit';
    text.textContent=cmd?'Selected '+sideLabel(playerTeam())+' Commander. Place your Fleet Commander token to use this leader.':'Unit name and ability display here.';
    return;
  }
  img.src=obj.profile||profileMap[obj.id]||obj.img||imgMap[obj.id]; name.textContent=(obj.id==='M'||obj.id==='B')?obj.name:(obj.display+' '+obj.name); text.textContent=obj.id==='FC'?currentTactic().name+': '+currentTactic().text:obj.ability;
  if(obj.id==='FC' && obj.team===playerTeam()){uses.textContent='USES: '+commanderUse[obj.team]+'/1'+(obj.shielded?'  | SHIELD READY':''); if(phase==='player'&&commanderUse[obj.team]>0){const b=document.createElement('button'); b.className='btn ability-btn'; b.textContent=currentTactic().name.toUpperCase(); b.onclick=()=>useCommanderTactic(obj); actions.appendChild(b)}}
  if(obj.specialist && obj.team===playerTeam() && phase==='player'){const b=document.createElement('button'); b.className='btn ability-btn'; b.textContent='ACTIVATE SCAN'; b.onclick=()=>activateScan(obj); actions.appendChild(b)}
}
function useCommanderTactic(piece){
  if(piece.id!=='FC'||piece.team!==playerTeam()||commanderUse[piece.team]<=0||phase!=='player') return;
  pendingConfirm=null; hideConfirm();
  if(setup.tactic==='tacticalWarp'){
    piece.revealed=true;
    log(piece.name+' revealed to activate Tactical Warp.');
    selectedPiece=piece; legal=getTeleport(piece,3); abilityMoveMode=true; renderBoard(); updateConsole(piece); updateStatus('TACTICAL WARP','Choose a warp space.','Click a green warp circle, then press ENERGIZE to commit.');
  }
  else {
    playSound('shields',{volume:.9});
    piece.shielded=true;
    piece.revealed=true;
    shieldArmed[piece.team]=true;
    commanderUse[piece.team]=0;
    if(typeof recordProfileTactic==='function') recordProfileTactic(1);
    updateConsole(piece);
    renderBoard();
    updateStatus('EMERGENCY SHIELD','Shield armed until hit.','Your Commander is revealed and ignores the next losing attack, then the shield is spent.');
    log(piece.name+' revealed and armed Emergency Shield.');
    finishPlayerTurn();
  }
}
function getTeleport(p,range){
  const out=[]; for(let r=p.r-range;r<=p.r+range;r++)for(let c=p.c-range;c<=p.c+range;c++){
    if(!inBounds(r,c)||isBlocked(r,c)||(r===p.r&&c===p.c)||board[r][c]) continue;
    if(Math.max(Math.abs(r-p.r),Math.abs(c-p.c))<=range) out.push({r,c});
  } return out;
}

function updateStatus(title,line,note){document.getElementById('phaseTitle').textContent=title;document.getElementById('statusLine').textContent=line;document.getElementById('statusNote').textContent=note;}
function clearLog(){document.getElementById('battleLog').innerHTML=''}
function log(msg){const d=document.createElement('div'); d.textContent='• '+msg; document.getElementById('battleLog').prepend(d)}
function endGame(msg){playSound('win',{volume:.95}); if(!profileStatsRecordedForMatch){profileStatsRecordedForMatch=true; if(typeof recordProfileMatchResult==='function') recordProfileMatchResult(msg);} phase='gameover'; updateStartBtn(); for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const p=board[r][c]; if(p)p.revealed=true} renderBoard(); updateStatus('BATTLE COMPLETE',msg,'Restart or return to menu.'); showModal('Battle Complete',msg)}
function showModal(t,m){document.getElementById('modalTitle').textContent=t; document.getElementById('modalText').textContent=m; document.getElementById('modal').classList.add('show')}
function closeModal(){document.getElementById('modal').classList.remove('show')}

function toggleDots(){showCenterDots=!showCenterDots; renderBoard()}
function toggleEnemies(){showAllEnemies=!showAllEnemies; renderBoard()}
function nudgeAnchor(dx,dy){anchorOffset.x+=dx; anchorOffset.y+=dy; renderBoard()}
function updateReadout(){
  const a={x:BASE_ANCHOR.x+anchorOffset.x,y:BASE_ANCHOR.y+anchorOffset.y};
  document.getElementById('readout').innerHTML=`Anchor A-center: x ${a.x}, y ${a.y}<br>Offset: ${anchorOffset.x}, ${anchorOffset.y}<br>Click the A/base hotspot to select; click green highlighted spaces to move.`;
}


/* =========================================================
   v68 COMMAND DATABASE
   ========================================================= */
const databaseMeta={
  FC:{className:'LEADERSHIP',flavor:'The heart of your fleet. Essential for victory.',abilityName:'COMMAND TACTIC',abilityTag:'ONE TIME',abilityDetail:'Use your selected commander tactic. The piece becomes revealed after use.',training:'Advanced Command Academy',deployment:'Starting rows only',bestUse:'Mid to late game',notes:'Keep protected. High-value target.'},
  BC:{className:'COMMAND',flavor:'A powerful command piece built to control important lanes.',abilityName:'HIGH COMMAND',abilityTag:'RANK 9',abilityDetail:'Uses superior rank to pressure most enemy officers and protect the Fleet Commander.',training:'Battle Command Program',deployment:'Starting rows only',bestUse:'Lane control and counterattack',notes:'Second-highest ranked mobile unit.'},
  TO:{className:'TACTICAL',flavor:'Elite tactical pressure for breaking through defended positions.',abilityName:'TACTICAL PRESSURE',abilityTag:'RANK 8',abilityDetail:'A high-rank attacker suited for direct challenges and protecting key routes.',training:'Tactical Operations',deployment:'Starting rows only',bestUse:'Frontline pressure',notes:'Avoid exposing it to unknown threats too early.'},
  SC:{className:'SECURITY',flavor:'A dependable defensive leader for holding critical squares.',abilityName:'SECURITY CONTROL',abilityTag:'RANK 7',abilityDetail:'Strong enough to challenge most mid-rank pieces while guarding key objectives.',training:'Academy Security Division',deployment:'Starting rows only',bestUse:'Defense and counterplay',notes:'Excellent escort for the Beacon.'},
  SL:{className:'ASSAULT',flavor:'Fast battlefield pressure and reliable lane control.',abilityName:'STRIKE FORMATION',abilityTag:'RANK 6',abilityDetail:'Use Strike Leaders to advance safely behind scouts and pressure revealed targets.',training:'Assault Leadership',deployment:'Starting rows only',bestUse:'Midfield control',notes:'Two units available.'},
  SO:{className:'SUPPORT',flavor:'Reliable officers who reinforce attacks and protect formations.',abilityName:'SQUAD SUPPORT',abilityTag:'RANK 5',abilityDetail:'Balanced mid-rank units designed for screening, trading, and supporting stronger pieces.',training:'Squad Operations',deployment:'Starting rows only',bestUse:'Support and trading',notes:'Useful in almost any formation.'},
  FCD:{className:'FIELD',flavor:'Academy-trained field pieces for baiting, blocking, and information play.',abilityName:'FIELD DISCIPLINE',abilityTag:'RANK 4',abilityDetail:'A flexible basic unit that can test unknown pieces without risking elite officers.',training:'Field Academy',deployment:'Starting rows only',bestUse:'Baiting and screening',notes:'Good value for revealing enemy ranks.'},
  TE:{className:'ENGINEERING',flavor:'Technical specialists trained to defeat battlefield traps.',abilityName:'MINE DISABLE',abilityTag:'SPECIAL',abilityDetail:'Safely removes Shield Mines and occupies their square instead of being destroyed.',training:'Technical Engineering',deployment:'Starting rows only',bestUse:'Clearing suspected mines',notes:'The only safe counter to Shield Mines.'},
  RR:{className:'RECON',flavor:'Rapid scouts that can cross open lanes in a single move.',abilityName:'LONG-RANGE MOVE',abilityTag:'SPECIAL',abilityDetail:'Moves any number of open squares in a straight line until blocked by terrain or another piece.',training:'Reconnaissance Program',deployment:'Starting rows only',bestUse:'Scouting and fast objectives',notes:'Cannot jump over pieces or blocked terrain.'},
  TS:{className:'SCANNING',flavor:'Precision intelligence units that expose hidden enemy identities.',abilityName:'ACTIVATE SCAN',abilityTag:'ONE ACTION',abilityDetail:'Scans one hidden enemy up to two spaces away when no enemy blocks the signal path.',training:'Target Intelligence',deployment:'Starting rows only',bestUse:'Identifying high-value targets',notes:'Reveals itself when Scan is activated.'},
  I:{className:'INFILTRATION',flavor:'A dangerous low-profile attacker with one legendary target.',abilityName:'COMMANDER STRIKE',abilityTag:'SPECIAL',abilityDetail:'Defeats the Fleet Commander only when the Infiltrator attacks first. Loses to other ranked units.',training:'Covert Operations',deployment:'Starting rows only',bestUse:'Hunting the Fleet Commander',notes:'Keep its identity hidden until the opening appears.'},
  M:{className:'DEFENSE',flavor:'An immobile trap that destroys nearly any attacker.',abilityName:'SHIELD DETONATION',abilityTag:'IMMOBILE',abilityDetail:'Destroys an attacking unit unless the attacker is a Tech Engineer.',training:'Automated Defense Systems',deployment:'Starting rows only',bestUse:'Protecting lanes and the Beacon',notes:'Cannot move after deployment.'},
  B:{className:'OBJECTIVE',flavor:'The Academy Beacon is the heart of the mission.',abilityName:'MISSION OBJECTIVE',abilityTag:'IMMOBILE',abilityDetail:'If an enemy unit enters its square, the Beacon is captured and the match ends.',training:'Academy Command Asset',deployment:'Starting rows only',bestUse:'Protected rear position',notes:'Cannot move. Losing it ends the battle.'}
};
const databaseUnits = unitDefs.map(def=>{
  const meta=databaseMeta[def.id]||{};
  return {
    id:def.id,name:def.name,number:def.display,count:def.count,
    image:(profileMap[def.id] || blueImgMap[def.id]),
    pieceImage:blueImgMap[def.id], ability:def.ability,
    movement:def.recon ? 'STRAIGHT LINE' : (def.movable===false ? 'IMMOBILE' : '1 SPACE'),
    role:def.beacon ? 'OBJECTIVE' : def.mine ? 'DEFENSE' : def.engineer ? 'ENGINEERING' : def.recon ? 'RECON' : def.specialist ? 'SCANNING' : def.infiltrator ? 'INFILTRATION' : def.rank>=8 ? 'COMMAND' : def.rank>=5 ? 'TACTICAL' : 'FIELD UNIT',
    rankValue:def.rank==null?'SPECIAL':String(def.rank),
    ...meta
  };
});
let databaseSelectedUnit='FC';

function showDatabaseTab(tab){
  const rules=tab==='rules';
  document.getElementById('databaseRulesTab')?.classList.toggle('active',rules);
  document.getElementById('databaseUnitsTab')?.classList.toggle('active',!rules);
  document.getElementById('databaseRulesPanel')?.classList.toggle('active',rules);
  document.getElementById('databaseUnitsPanel')?.classList.toggle('active',!rules);
  const shell=document.querySelector('#help .database-shell');
  if(shell){
    shell.classList.toggle('rules-view',rules);
    shell.classList.toggle('units-view',!rules);
  }
  if(!rules) renderDatabaseUnits();
}
function renderDatabaseUnits(){
  const list=document.getElementById('databaseUnitList');
  if(!list) return;
  list.innerHTML='';
  const personnel=databaseUnits.filter(unit=>unit.id!=='B');
  if(!personnel.some(unit=>unit.id===databaseSelectedUnit)) databaseSelectedUnit='FC';
  personnel.forEach(unit=>{
    const btn=document.createElement('button');
    btn.className='database-unit-button '+(databaseSelectedUnit===unit.id?'active':'');
    btn.innerHTML=`<img src="${unit.image}" alt="${unit.name} profile">`;
    btn.dataset.unitId=unit.id;
    btn.title=unit.name;
    btn.setAttribute('aria-label',unit.name+' personnel record');
    btn.onclick=()=>{
      databaseSelectedUnit=unit.id;
      if(typeof playMenuClick==='function') playMenuClick();
      list.querySelectorAll('.database-unit-button').forEach(row=>row.classList.toggle('active',row.dataset.unitId===unit.id));
      renderDatabaseRecord(unit.id);
    };
    list.appendChild(btn);
  });
  renderDatabaseRecord(databaseSelectedUnit);
}
function renderDatabaseRecord(id){
  const unit=databaseUnits.find(u=>u.id===id)||databaseUnits[0];
  const set=(el,val)=>{const node=document.getElementById(el);if(node) node.textContent=val};
  const image=document.getElementById('databaseUnitImage');
  if(image){image.src=unit.image;image.alt=unit.name+' profile'}
  set('databaseUnitRank',unit.number);
  set('databaseUnitName',unit.name.toUpperCase());
  set('databaseUnitNumber','PIECE NUMBER '+unit.number);
  set('databaseUnitAbility',unit.ability);
  set('databaseUnitFlavor',unit.flavor||'Academy unit record.');
  set('databaseUnitMovement',unit.movement);
  set('databaseUnitCount',unit.count+' '+(unit.count===1?'UNIT':'UNITS'));
  set('databaseUnitRole',unit.role);
}

/* =========================================================
   COMMAND DATABASE NAVIGATION
   ========================================================= */
let helpReturnScreen='setup';
function showHelp(){helpReturnScreen='setup';showScreen('help');showDatabaseTab('rules');renderDatabaseUnits()}
function openCommandDatabase(){helpReturnScreen='menu';showScreen('help');showDatabaseTab('rules');renderDatabaseUnits()}
function returnFromHelp(){
  if((helpReturnScreen||'menu')==='menu'){
    returnToCommandCenter();
    return;
  }
  showScreen(helpReturnScreen||'setup');
}


/* =========================================================
   v66 COMMAND CENTER CAMERA + LIVING HOLO BOARD
   ========================================================= */
let commandCameraBusy=false;
const COMMAND_CAMERA_TIME=820;

function setCommandCamera(position='center', label='COMMAND CENTER'){
  const camera=document.getElementById('commandCamera');
  const menu=document.getElementById('menu');
  const labelEl=document.getElementById('cameraLabel');
  if(!camera) return;
  camera.classList.remove('camera-center','camera-ai','camera-online','camera-database','camera-moving');
  camera.classList.add('camera-'+position);
  if(position!=='center') camera.classList.add('camera-moving');
  if(menu) menu.classList.toggle('camera-busy', position!=='center');
  if(labelEl) labelEl.textContent=label;
}

function focusCommandStation(position,label,onArrive){
  if(commandCameraBusy) return;
  commandCameraBusy=true;
  setCommandCamera(position,label);
  window.setTimeout(()=>{
    const camera=document.getElementById('commandCamera');
    if(camera) camera.classList.remove('camera-moving');
    commandCameraBusy=false;
    if(typeof onArrive==='function') onArrive();
  }, COMMAND_CAMERA_TIME);
}

function enterAiStation(){
  focusCommandStation('ai','TACTICAL OPERATIONS',()=>startLocalGameFlow());
}
function enterOnlineStation(){
  focusCommandStation('online','COMMUNICATIONS',()=>openOnlineMatch());
}
function enterDatabaseStation(){
  focusCommandStation('database','COMMAND DATABASE',()=>openCommandDatabase());
}
function returnToCommandCenter(){
  startCommandCenterAudio({announce:false});
  showScreen('menu');
  requestAnimationFrame(()=>{
    commandCameraBusy=false;
    setCommandCamera('center','COMMAND CENTER');
  });
}

// Always reset the room camera when the page first loads.
const HUB_SIM_BLUE=[
  {x:694,y:507},{x:760,y:536},{x:833,y:500},{x:905,y:548},{x:777,y:584},{x:954,y:488}
];
const HUB_SIM_RED=[
  {x:1125,y:505},{x:1195,y:548},{x:1262,y:502},{x:1055,y:570},{x:1218,y:592},{x:1008,y:492}
];
let hubSimulationTimer=null;
let hubSimulationStep=0;

function buildHubForces(layerId, team, points){
  const layer=document.getElementById(layerId);
  if(!layer) return;
  layer.innerHTML='';
  points.forEach((point,index)=>{
    const token=document.createElement('div');
    token.className='hub-token hub-'+team;
    token.style.left=point.x+'px';
    token.style.top=point.y+'px';
    token.style.animationDelay=(index*.17)+'s';
    token.dataset.index=String(index);
    layer.appendChild(token);
  });
}
function moveHubForces(){
  hubSimulationStep++;
  document.querySelectorAll('.hub-token').forEach((token,index)=>{
    const isBlue=token.classList.contains('hub-blue');
    const drift=(hubSimulationStep+index)%4;
    const dx=isBlue ? (drift*9) : (-drift*9);
    const dy=((hubSimulationStep+index)%3-1)*6;
    token.style.setProperty('--hub-dx',dx+'px');
    token.style.setProperty('--hub-dy',dy+'px');
  });
  const flash=document.getElementById('hubBattleFlash');
  if(flash && hubSimulationStep%3===0){
    flash.classList.remove('fire');
    void flash.offsetWidth;
    flash.style.left=(930+Math.random()*90)+'px';
    flash.style.top=(500+Math.random()*75)+'px';
    flash.classList.add('fire');
  }
}
function startHubSimulation(){
  buildHubForces('hubBlueForces','blue',HUB_SIM_BLUE);
  buildHubForces('hubRedForces','red',HUB_SIM_RED);
  if(hubSimulationTimer) clearInterval(hubSimulationTimer);
  hubSimulationTimer=setInterval(moveHubForces,1800);
}

// Always reset the room camera and start the command-room simulation when the page loads.
window.addEventListener('DOMContentLoaded',()=>{
  setCommandCamera('center','COMMAND CENTER');
  startHubSimulation();
});

/* =========================================================
   v65 TITLE MENU ENTRY
   ========================================================= */
function enterCommandCenter(){
  const menu=document.getElementById('menu');
  if(!menu) return;
  unlockAudio();
  playSound('intro',{volume:.9});
  startCommandCenterAudio({announce:true});
  menu.classList.remove('intro-active');
  commandCameraBusy=false;
  setCommandCamera('center','COMMAND CENTER');
  startHubSimulation();
}

function showTitleMenu(){
  stopLoop('hum');
  stopLoop('matchAmbiance');
  showScreen('menu');
  const menu=document.getElementById('menu');
  if(menu) menu.classList.add('intro-active');
  commandCameraBusy=false;
  setCommandCamera('center','COMMAND CENTER');
}
