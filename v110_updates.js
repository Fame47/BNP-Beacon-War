
/* ============================================================
   BEACON WARS v110 UPDATE ADAPTER
   The v88 battle engine remains untouched in script.js.
   This file layers newer HUD/profile/progression/result behavior
   around it.
   ============================================================ */

let bw110AiTitle = "cadet";
let bw110ReactionCooldownUntil = 0;
let bw110ReactionTimer = null;
const bw110ReactionTimers = {player:null,opponent:null};
const bw110TempReveals = new Map();

const BW110_REACTIONS = {
  hello:"REACTION_HELLO_WHITE.png",
  bringit:"REACTION_BRINGIT_WHITE.png",
  makeitso:"REACTION_MAKEITSO_WHITE.png",
  livelong:"REACTION_LIVELONG_WHITE.png",
  gg:"REACTION_GG_WHITE.png"
};

function bw110PlayerPayload(){
  const p = typeof getPlayerProfileData==="function"
    ? getPlayerProfileData()
    : {callsign:"CADET",icon:"infiltrator",frame:"rookie",title:"cadet"};
  return {
    callsign:p.callsign||"CADET",
    icon:p.icon||"infiltrator",
    frame:p.frame||"rookie",
    title:p.title||"cadet"
  };
}

function bw110ApplyBadge(iconEl,frameEl,data){
  if(iconEl){
    iconEl.src=(typeof PROFILE_ICON_ASSETS!=="undefined" && PROFILE_ICON_ASSETS[data.icon])
      ? PROFILE_ICON_ASSETS[data.icon]
      : "PLAYER_ICON_INFILTRATOR_CORE.png";
  }
  if(frameEl){
    const src=(typeof PROFILE_FRAME_ASSETS!=="undefined")
      ? PROFILE_FRAME_ASSETS[data.frame]
      : "PROFILE_CANVAS_FRAME_ROOKIE.png";
    if(src){
      frameEl.src=src;
      frameEl.style.display="block";
    }else{
      frameEl.removeAttribute("src");
      frameEl.style.display="none";
    }
  }
}

function bw110ApplyTitle(imgEl,textEl,titleId,fallback){
  const asset=(typeof PROFILE_TITLE_ASSETS!=="undefined" && PROFILE_TITLE_ASSETS[titleId]) || "";
  const titleName=(typeof PROFILE_TITLE_NAMES!=="undefined" && PROFILE_TITLE_NAMES[titleId]) || fallback || "";
  if(imgEl){
    if(asset){
      imgEl.src=asset;
      imgEl.style.display="block";
    }else{
      imgEl.removeAttribute("src");
      imgEl.style.display="none";
    }
  }
  if(textEl){
    textEl.textContent=asset ? "" : titleName;
    textEl.style.display=asset ? "none" : "block";
  }
}

function bw110RandomAiTitle(){
  const ids=[
    "cadet","ensign","lieutenant","first_officer","commander","captain",
    "fleet_captain","commodore","admiral","fleet_admiral",
    "tactical_officer","chief_engineer","science_officer",
    "beacon_commander","master_strategist","red_alert_veteran",
    "starfleet_legend","unbeaten_captain","holo_room_ace","sector_guardian"
  ];
  return ids[Math.floor(Math.random()*ids.length)];
}

function syncMatchIdentityHud(){
  const me=bw110PlayerPayload();
  const pName=document.getElementById("playerMatchName");
  if(pName) pName.textContent=String(me.callsign).toUpperCase();
  bw110ApplyBadge(
    document.getElementById("playerMatchIcon"),
    document.getElementById("playerMatchFrame"),
    me
  );
  bw110ApplyTitle(
    document.getElementById("playerMatchTitleBadge"),
    document.getElementById("playerMatchTitle"),
    me.title,
    "COMMANDER"
  );
  bw110ApplyBadge(
    document.getElementById("matchResultIcon"),
    document.getElementById("matchResultFrame"),
    me
  );

  let opponent={
    callsign:"ACADEMY AI",
    icon:"starfleet",
    frame:"rookie",
    title:bw110AiTitle,
    titleFallback:"SIMULATION"
  };

  if(typeof onlineState!=="undefined" && onlineState.enabled && onlineState.opponentProfile){
    opponent=Object.assign(opponent,onlineState.opponentProfile);
  }else if(typeof onlineState!=="undefined" && onlineState.enabled){
    opponent.callsign="OPPONENT";
    opponent.title="";
    opponent.titleFallback="ONLINE";
  }

  const oName=document.getElementById("opponentMatchName");
  if(oName) oName.textContent=String(opponent.callsign||"OPPONENT").toUpperCase();
  bw110ApplyBadge(
    document.getElementById("opponentMatchIcon"),
    document.getElementById("opponentMatchFrame"),
    opponent
  );
  bw110ApplyTitle(
    document.getElementById("opponentMatchTitleBadge"),
    document.getElementById("opponentMatchTitle"),
    opponent.title,
    opponent.titleFallback
  );
}

function bw110SetReactionImage(side,key){
  const img=document.getElementById(side==="player"?"playerReactionImage":"opponentReactionImage");
  if(img && BW110_REACTIONS[key]) img.src=BW110_REACTIONS[key];
}
function bw110HideReaction(side){
  const bubble=document.getElementById(side==="player"?"playerReactionBubble":"opponentReactionBubble");
  if(bubble) bubble.classList.remove("show");
}
function bw110ShowReaction(side,key,duration=3000){
  bw110SetReactionImage(side,key);
  const bubble=document.getElementById(side==="player"?"playerReactionBubble":"opponentReactionBubble");
  if(!bubble) return;
  if(bw110ReactionTimers[side]) clearTimeout(bw110ReactionTimers[side]);
  bubble.classList.add("show");
  bw110ReactionTimers[side]=setTimeout(()=>{
    bubble.classList.remove("show");
    bw110ReactionTimers[side]=null;
  },duration);
}
function setDefaultMatchReactions(){
  bw110HideReaction("player");
  bw110HideReaction("opponent");
  const picker=document.getElementById("reactionPicker");
  if(picker) picker.classList.remove("show");
}
function toggleReactionPicker(event){
  if(event){event.preventDefault();event.stopPropagation();}
  if(!["player","commit","waiting","ai"].includes(phase)) return;
  const picker=document.getElementById("reactionPicker");
  if(picker) picker.classList.toggle("show");
}
async function sendMatchReaction(key,event){
  if(event){event.preventDefault();event.stopPropagation();}
  if(!BW110_REACTIONS[key]) return;
  const now=Date.now();
  if(now<bw110ReactionCooldownUntil) return;

  bw110ReactionCooldownUntil=now+3000;
  const badge=document.getElementById("playerMatchBadge");
  if(badge) badge.classList.add("reaction-cooldown");
  if(bw110ReactionTimer) clearTimeout(bw110ReactionTimer);
  bw110ReactionTimer=setTimeout(()=>{
    bw110ReactionCooldownUntil=0;
    if(badge) badge.classList.remove("reaction-cooldown");
    bw110ReactionTimer=null;
  },3000);

  const picker=document.getElementById("reactionPicker");
  if(picker) picker.classList.remove("show");
  bw110ShowReaction("player",key,3000);

  if(typeof onlineState!=="undefined" && onlineState.enabled &&
     onlineState.roomCode && onlineState.firebaseReady &&
     typeof bwFirestore!=="undefined" && bwFirestore &&
     typeof roomRef==="function"){
    try{
      const id=(onlineState.uid||onlineState.role||"player")+"_"+Date.now();
      await roomRef(onlineState.roomCode).set({
        lastReaction:{
          id,key,
          byUid:onlineState.uid||null,
          byRole:onlineState.role||null,
          at:Date.now()
        },
        updatedAt:firebase.firestore.FieldValue.serverTimestamp()
      },{merge:true});
      onlineState.lastReactionId=id;
    }catch(err){
      if(typeof log==="function") log("Reaction sync failed: "+(err.message||err));
    }
  }
}

function hideMatchResult(){
  const overlay=document.getElementById("matchResultOverlay");
  if(overlay) overlay.classList.remove("show");
}
function showMatchResult(result,msg){
  const overlay=document.getElementById("matchResultOverlay");
  const card=document.getElementById("matchResultCard");
  const title=document.getElementById("matchResultTitle");
  const message=document.getElementById("matchResultMessage");
  const name=document.getElementById("matchResultPlayerName");
  if(!overlay||!card||!title||!message) return;

  card.classList.remove("victory","defeat","draw");
  card.classList.add(result);
  title.textContent=result==="victory"?"VICTORY":result==="defeat"?"DEFEAT":"DRAW";
  message.textContent=msg||"Battle complete.";

  const profile=bw110PlayerPayload();
  if(name) name.textContent=String(profile.callsign).toUpperCase();
  bw110ApplyBadge(
    document.getElementById("matchResultIcon"),
    document.getElementById("matchResultFrame"),
    profile
  );
  overlay.classList.add("show");
}
function rematchFromResult(){
  hideMatchResult();
  initGame();
}
function returnFromMatchResult(){
  hideMatchResult();
  if(typeof resetOnlineState==='function')resetOnlineState();
  returnToCommandCenter();
}

function bw110ResultForMessage(msg){
  const upper=String(msg||"").toUpperCase();
  if(upper.includes("DRAW")) return "draw";
  const mine=teamLabel(playerTeam()).toUpperCase();
  return upper.startsWith(mine+" ") ? "victory" : "defeat";
}

/* Legacy v88 stat hooks are routed into the new progression system. */
recordProfileStatDelta=function(key,amount=1){
  const n=Math.max(1,Number(amount)||1);
  if(key==="beacons" && typeof recordProfileBeaconCapture==="function"){
    recordProfileBeaconCapture(n);
    return;
  }
  if(key==="commanders" && typeof recordProfileCommanderCapture==="function"){
    for(let i=0;i<n;i++) recordProfileCommanderCapture();
    return;
  }
  if(key==="tactics" && typeof recordProfileTactic==="function"){
    recordProfileTactic(n);
    return;
  }
};
/* Combat reveals do not count as scans. */
window.recordProfileReveal=function(){};

function bw110PieceOnBoard(piece){
  if(!piece) return false;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(board[r][c]===piece) return true;
  }
  return false;
}
function bw110RememberReveal(piece,originTeam){
  if(!piece || !bw110PieceOnBoard(piece)) return;
  bw110TempReveals.set(piece,{
    originTeam,
    scanned:!!piece.scanned
  });
}
function bw110ExpireReveals(originTeam){
  let changed=false;
  for(const [piece,meta] of [...bw110TempReveals.entries()]){
    if(meta.originTeam!==originTeam) continue;
    if(bw110PieceOnBoard(piece)){
      piece.revealed=false;
      piece.scanned=false;
      changed=true;
    }
    bw110TempReveals.delete(piece);
  }
  if(changed && phase!=="gameover") renderBoard();
}

/* Captured-unit portrait list. */
const BW110_updateCaptured=updateCaptured;
updateCaptured=function(){
  const el=document.getElementById("capturedList");
  if(!el){
    BW110_updateCaptured();
    return;
  }
  const entries=captured[playerTeam()]||[];
  if(!entries.length){
    el.innerHTML='<div class="captured-empty">NO CAPTURES</div>';
    return;
  }
  const counts={};
  entries.forEach(raw=>{
    let id=String(raw);
    if(!profileMap[id]){
      const legacy=unitDefs.find(def=>String(def.display)===id || String(def.rank)===id);
      if(legacy) id=legacy.id;
    }
    counts[id]=(counts[id]||0)+1;
  });
  el.innerHTML=Object.entries(counts).map(([id,count])=>{
    const def=unitDefs.find(d=>d.id===id);
    const label=def?def.name:id;
    const pic=profileMap[id]||"PROF_FC.jpg";
    return `<div class="captured-unit-row" title="${label}">
      <img src="${pic}" alt="${label}">
      <span class="captured-unit-name">${label}</span>
      <b>X${count}</b>
    </div>`;
  }).join("");
};

/* Elimination XP is added without replacing the original capture engine. */
const BW110_capturePiece=capturePiece;
capturePiece=function(winnerTeam,loser){
  BW110_capturePiece(winnerTeam,loser);
  if(winnerTeam===playerTeam() && loser && !loser.beacon && !loser.mine &&
     typeof recordProfileElimination==="function"){
    recordProfileElimination(1);
  }
};

/* Temporary combat reveals + Infiltrator achievement.
   The v88 combat resolution itself remains unchanged. */
const BW110_resolveCombat=resolveCombat;
resolveCombat=function(a,d){
  const origin=a ? a.team : null;
  const infilCommander=!!(
    a && d &&
    a.team===playerTeam() &&
    a.infiltrator &&
    d.rank===10
  );

  BW110_resolveCombat(a,d);

  if(infilCommander && typeof recordProfileInfiltratorCommanderCapture==="function"){
    recordProfileInfiltratorCommanderCapture();
  }

  if(phase!=="gameover" && origin){
    if(a && a.revealed) bw110RememberReveal(a,origin);
    if(d && d.revealed) bw110RememberReveal(d,origin);
  }
};

/* Target Specialist scan:
   keep the exact v88 targeting/confirmation system, add only progression
   and one-opponent-turn reveal expiry. */
const BW110_doScan=doScan;
doScan=function(r,c){
  const target=board[r] ? board[r][c] : null;
  const successful=!!(target && target.team===enemyTeam());
  BW110_doScan(r,c);

  if(successful){
    if(typeof recordProfileSuccessfulScan==="function"){
      recordProfileSuccessfulScan({count:1,beacon:!!target.beacon});
    }
    bw110RememberReveal(target,playerTeam());
  }
};

const BW110_activateScan=activateScan;
activateScan=function(piece){
  BW110_activateScan(piece);
  if(piece && piece.revealed) bw110RememberReveal(piece,playerTeam());
};

/* Commander tactic remains v88. This wrapper only tracks the reveal timer. */
const BW110_useCommanderTactic=useCommanderTactic;
useCommanderTactic=function(piece){
  BW110_useCommanderTactic(piece);
  if(piece && piece.revealed) bw110RememberReveal(piece,playerTeam());
};

/* Last-move visual without touching move legality. */
function setBattleMoveVisual(piece,to,isAttack=false,isOpponent=false){
  const el=document.getElementById("battleLog");
  if(!el||!to) return;
  const coord=(to.c+1)+","+(ROWS-to.r);
  const known=piece && (!isOpponent || piece.revealed || piece.scanned);
  const id=known?piece.id:null;
  const pic=id?(profileMap[id]||"PROF_FC.jpg"):"PLAYER_ICON_STARFLEET_CORE.png";
  const label=known?((piece.display||"")+" "+piece.name).trim():(isOpponent?"OPPONENT UNIT":"UNIT");
  el.innerHTML=`<div class="battle-last-move">
    <img src="${pic}" alt="">
    <div class="battle-last-copy">
      <span>${label}</span>
      <b>${isAttack?"ATTACK":"TO"} ${coord}</b>
    </div>
  </div>`;
}

const BW110_performAction=performAction;
performAction=function(piece,r,c){
  const target=board[r] ? board[r][c] : null;
  setBattleMoveVisual(piece,{r,c},!!(target && target.team!==piece.team),false);
  return BW110_performAction(piece,r,c);
};

/* One full opponent turn, then temporary player-created reveals hide again.
   AI-created combat reveals survive the player's turn and hide when it ends. */
const BW110_finishPlayerTurn=finishPlayerTurn;
finishPlayerTurn=function(){
  bw110ExpireReveals(enemyTeam());
  return BW110_finishPlayerTurn();
};

const BW110_aiTurn=aiTurn;
aiTurn=function(){
  const before=new Map();
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const p=board[r][c];
    if(p && p.team===enemyTeam()) before.set(p.uid,{r,c,piece:p});
  }

  const result=BW110_aiTurn();

  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const p=board[r][c];
    if(!p || p.team!==enemyTeam()) continue;
    const old=before.get(p.uid);
    if(old && (old.r!==r || old.c!==c)){
      setBattleMoveVisual(p,{r,c},false,true);
      break;
    }
  }

  bw110ExpireReveals(playerTeam());
  return result;
};

/* Later locked win rule, implemented by filtering endGame only.
   This does not alter resolveCombat or movement/tactical code. */
const BW110_originalEndGame=endGame;
endGame=function(msg){
  const upper=String(msg||"").toUpperCase();

  if(upper.includes("BOTH FLEET COMMANDERS")){
    log("Both Fleet Commanders were removed by equal-rank combat. Battle continues.");
    return;
  }

  playSound("win",{volume:.95});
  if(!profileStatsRecordedForMatch){
    profileStatsRecordedForMatch=true;
    if(typeof recordProfileMatchResult==="function") recordProfileMatchResult(msg);
  }
  if(typeof firebaseRecordOnlineResult==='function')firebaseRecordOnlineResult(msg);

  phase="gameover";
  bw110TempReveals.clear();
  updateStartBtn();

  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const p=board[r][c];
    if(p) p.revealed=true;
  }

  renderBoard();
  updateStatus("BATTLE COMPLETE",msg,"");
  showMatchResult(bw110ResultForMessage(msg),msg);
};

/* One-click surrender goes to DEFEAT, never straight to Command Center. */
function surrenderMatch(event){
  if(event){event.preventDefault();event.stopPropagation();}
  if(!["player","ai","waiting","commit"].includes(phase)) return false;

  const msg=teamLabel(enemyTeam()).toUpperCase()+" won by surrender.";

  pendingConfirm=null;
  hideConfirm();

  if(!profileStatsRecordedForMatch){
    profileStatsRecordedForMatch=true;
    if(typeof recordProfileMatchResult==="function") recordProfileMatchResult(msg);
  }
  if(typeof firebaseRecordOnlineResult==='function')firebaseRecordOnlineResult(msg);

  phase="gameover";
  bw110TempReveals.clear();

  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const p=board[r][c];
    if(p) p.revealed=true;
  }

  renderBoard();
  updateStatus("DEFEAT",msg,"");
  updateStartBtn();
  showScreen("game");
  showMatchResult("defeat",msg);
  return false;
}

/* Keep v88 START/COMMIT behavior, only decorate the live controls. */
const BW110_updateStartBtn=updateStartBtn;
updateStartBtn=function(){
  BW110_updateStartBtn();

  const primary=document.getElementById("primaryControlBtn");
  const secondary=document.getElementById("secondaryControlBtn");
  if(!primary||!secondary) return;

  if(["player","ai","waiting"].includes(phase)){
    primary.style.display="none";
    secondary.style.display="";
    secondary.textContent="SURRENDER";
    secondary.className="btn red";
    secondary.onclick=(event)=>surrenderMatch(event);
  }
  else if(phase==="commit"){
    primary.style.display="";
    secondary.style.display="";
    secondary.textContent="SURRENDER";
    secondary.className="btn red";
    secondary.onclick=(event)=>surrenderMatch(event);
  }
  else if(phase==="deploy"){
    primary.style.display="";
    secondary.style.display="";
  }
  else if(phase==="gameover"){
    primary.style.display="none";
    secondary.style.display="none";
  }
};

/* Fresh random AI title every new simulation. */
const BW110_initGame=initGame;
initGame=function(){
  bw110AiTitle=bw110RandomAiTitle();
  hideMatchResult();
  setDefaultMatchReactions();
  const result=BW110_initGame();
  syncMatchIdentityHud();
  updateCaptured();
  updateStartBtn();
  return result;
};

/* Keep the player identity card current if profile changes. */
const BW110_loadPlayerProfile =
  (typeof loadPlayerProfile==="function") ? loadPlayerProfile : null;
if(BW110_loadPlayerProfile){
  loadPlayerProfile=function(){
    const result=BW110_loadPlayerProfile();
    syncMatchIdentityHud();
    return result;
  };
}

window.addEventListener("DOMContentLoaded",()=>{
  bw110AiTitle=bw110RandomAiTitle();
  syncMatchIdentityHud();
  setDefaultMatchReactions();
  updateCaptured();
  if(Array.isArray(board) && board.length===ROWS){
    updateStartBtn();
  }
});


/* ============================================================
   v115 HOLD-TO-LIFT + VISIBLE UNIT TRAVEL
   The v88 battle engine remains untouched in script.js.
   ============================================================ */

let bw115DragSourceEl=null;
let bw115SkipNextActionAnimation=false;
let bw115ActionAnimating=false;
let bw115AiAnimating=false;

function bw115SyncMarkerMode(){
  document.body.classList.toggle(
    "bw115-ability-active",
    !!(scanMode || abilityMoveMode)
  );
}

function bw115FindPieceVisualAt(r,c){
  const wanted=pieceTopLeft(r,c);
  const pieces=[...document.querySelectorAll("#pieces .piece")];
  return pieces.find(el=>{
    const left=parseFloat(el.style.left||"99999");
    const top=parseFloat(el.style.top||"99999");
    return Math.abs(left-wanted.x)<1.5 && Math.abs(top-wanted.y)<1.5;
  }) || null;
}

function bw115FindHiddenEnemyAt(r,c){
  const tokens=[...document.querySelectorAll("#pieces .hidden-enemy")];
  return tokens.find(el=>
    Number(el.dataset.hiddenR)===r && Number(el.dataset.hiddenC)===c
  ) || null;
}

function bw115CreateHiddenTravelGhost(from){
  const start=hiddenPieceTopLeft(from.r,from.c);
  const ghost=document.createElement("div");
  ghost.className="piece hidden-enemy enemy bw115-moving-hidden";
  ghost.dataset.hiddenR=String(from.r);
  ghost.dataset.hiddenC=String(from.c);
  ghost.style.left=start.x+"px";
  ghost.style.top=start.y+"px";
  ghost.innerHTML=`<img class="hidden-bw-art" src="${hiddenBWAsset(enemyTeam())}" alt="">`;
  document.getElementById("pieces").appendChild(ghost);
  return ghost;
}

function bw115HideDragSource(piece){
  if(!piece) return;
  bw115DragSourceEl=bw115FindPieceVisualAt(piece.r,piece.c);
  if(bw115DragSourceEl){
    bw115DragSourceEl.classList.add("bw115-source-hidden");
  }
}

function bw115RestoreDragSource(){
  if(bw115DragSourceEl){
    bw115DragSourceEl.classList.remove("bw115-source-hidden");
  }
  bw115DragSourceEl=null;
}

function bw115ClearTargetMarkers(){
  document.querySelectorAll(
    "#markers .marker.legal, #markers .marker.scan, #markers .marker.sel"
  ).forEach(el=>el.remove());
}

function bw115SetAnimating(on){
  const game=document.getElementById("game");
  if(game) game.classList.toggle("bw115-animating",!!on);
}

function bw115TravelDuration(from,to){
  const a=cellCenter(from.r,from.c);
  const b=cellCenter(to.r,to.c);
  const distance=Math.hypot(b.x-a.x,b.y-a.y);
  return Math.max(180,Math.min(520,180+distance*.42));
}

function bw115AnimateElementToCell(el,to,duration,onDone,hiddenToken=false){
  if(!el){
    if(onDone) onDone();
    return;
  }
  const dest=hiddenToken ? hiddenPieceTopLeft(to.r,to.c) : pieceTopLeft(to.r,to.c);
  if(hiddenToken){
    el.dataset.hiddenR=String(to.r);
    el.dataset.hiddenC=String(to.c);
  }
  el.style.transition=`left ${duration}ms cubic-bezier(.22,.72,.22,1), top ${duration}ms cubic-bezier(.22,.72,.22,1), transform ${duration}ms ease`;
  el.style.transform="scale(1.035)";

  // Force the start position to paint before assigning the destination.
  void el.offsetWidth;
  requestAnimationFrame(()=>{
    el.style.left=dest.x+"px";
    el.style.top=dest.y+"px";
    el.style.transform="scale(1)";
  });

  window.setTimeout(()=>{
    if(onDone) onDone();
  },duration+24);
}

function bw115CreateTravelGhost(piece,from){
  const start=pieceTopLeft(from.r,from.c);
  const ghost=document.createElement("div");
  ghost.className="bw115-moving-piece";
  ghost.style.left=start.x+"px";
  ghost.style.top=start.y+"px";
  ghost.innerHTML=`<img src="${piece.img||imgMap[piece.id]}" alt="">`;
  document.getElementById("pieces").appendChild(ghost);
  return ghost;
}

/* QUICK CLICK = inspect / skills.
   HOLD left mouse = lift the unit and reveal legal landing circles.
   A small movement while pressed also counts as a deliberate pickup. */
const BW115_originalStartPiecePointer=startPiecePointer;
startPiecePointer=function(e,piece){
  if(
    bw115ActionAnimating || bw115AiAnimating ||
    phase!=="player" ||
    !piece ||
    piece.team!==playerTeam() ||
    !piece.movable
  ){
    return BW115_originalStartPiecePointer(e,piece);
  }

  if(e.pointerType==="mouse" && e.button!==0) return;

  e.stopPropagation();
  e.preventDefault();

  const startX=e.clientX;
  const startY=e.clientY;
  let lifted=false;
  let finished=false;
  const HOLD_MS=145;

  const cleanup=()=>{
    clearTimeout(timer);
    window.removeEventListener("pointermove",onMove);
    window.removeEventListener("pointerup",onUp);
    window.removeEventListener("pointercancel",onCancel);
  };

  const lift=(ev)=>{
    if(lifted || finished) return;
    lifted=true;
    cleanup();
    beginDrag(ev||e,piece);
  };

  const onMove=(ev)=>{
    if(Math.hypot(ev.clientX-startX,ev.clientY-startY)>7){
      lift(ev);
    }
  };

  const onUp=(ev)=>{
    if(finished) return;
    finished=true;
    cleanup();
    if(!lifted){
      pieceClick(piece);
      bw115SyncMarkerMode();
    }
  };

  const onCancel=()=>{
    finished=true;
    cleanup();
  };

  const timer=window.setTimeout(()=>{
    lift({
      clientX:startX,
      clientY:startY,
      pointerType:e.pointerType||"mouse",
      preventDefault(){},
      stopPropagation(){}
    });
  },HOLD_MS);

  window.addEventListener("pointermove",onMove);
  window.addEventListener("pointerup",onUp);
  window.addEventListener("pointercancel",onCancel);
};

/* Use the original v88 drag engine, but truly lift the source token. */
const BW115_originalBeginDrag=beginDrag;
beginDrag=function(e,piece){
  document.body.classList.add("bw115-drag-active");
  document.body.classList.remove("bw115-ability-active");
  const result=BW115_originalBeginDrag(e,piece);
  if(dragState && dragState.piece===piece){
    bw115HideDragSource(piece);
  }else{
    document.body.classList.remove("bw115-drag-active");
  }
  return result;
};

/* Release over a legal circle:
   settle the carried sprite into the exact square, then commit the move.
   Release elsewhere:
   the carried sprite returns to its original square. */
dragEnd=function(e){
  if(!dragState) return;

  const {piece,ghost,legal}=dragState;
  const pointer=appPointer(e);
  const hit=nearestCell(pointer.x,pointer.y);
  const valid=!!(hit && legal.some(t=>t.r===hit.r && t.c===hit.c));

  cleanupDrag();
  suppressNextBoardClick=true;
  document.body.classList.remove("bw115-drag-active");
  bw115ClearTargetMarkers();

  if(valid){
    const duration=175;
    bw115ActionAnimating=true;
    bw115SetAnimating(true);

    bw115AnimateElementToCell(ghost,hit,duration,()=>{
      ghost.remove();
      bw115RestoreDragSource();
      bw115SkipNextActionAnimation=true;
      performAction(piece,hit.r,hit.c);
      bw115ActionAnimating=false;
      bw115SetAnimating(false);
      bw115SyncMarkerMode();
    });
  }else{
    const home={r:piece.r,c:piece.c};
    bw115AnimateElementToCell(ghost,home,165,()=>{
      ghost.remove();
      bw115RestoreDragSource();
      log("Move cancelled.");
      selectedPiece=null;
      legal=[];
      renderBoard();
      bw115SyncMarkerMode();
    });
  }
};

dragCancel=function(){
  if(!dragState) return;

  const {piece,ghost}=dragState;
  const home={r:piece.r,c:piece.c};
  cleanupDrag();
  suppressNextBoardClick=true;
  document.body.classList.remove("bw115-drag-active");
  bw115ClearTargetMarkers();

  bw115AnimateElementToCell(ghost,home,150,()=>{
    ghost.remove();
    bw115RestoreDragSource();
    selectedPiece=null;
    legal=[];
    renderBoard();
    bw115SyncMarkerMode();
  });
};

/* Normal drag already shows the piece physically moving with the mouse.
   Any non-drag performAction, especially Tactical Warp, gets a visible
   board-travel animation before the existing v88 action commits. */
const BW115_commitAction=performAction;
performAction=function(piece,r,c){
  if(bw115SkipNextActionAnimation){
    bw115SkipNextActionAnimation=false;
    return BW115_commitAction(piece,r,c);
  }

  if(
    !piece ||
    bw115ActionAnimating ||
    (piece.r===r && piece.c===c)
  ){
    return BW115_commitAction(piece,r,c);
  }

  const from={r:piece.r,c:piece.c};
  const to={r,c};
  const source=bw115FindPieceVisualAt(from.r,from.c);
  if(source) source.classList.add("bw115-source-hidden");

  bw115ClearTargetMarkers();
  const ghost=bw115CreateTravelGhost(piece,from);
  const duration=bw115TravelDuration(from,to);

  bw115ActionAnimating=true;
  bw115SetAnimating(true);

  bw115AnimateElementToCell(ghost,to,duration,()=>{
    ghost.remove();
    if(source) source.classList.remove("bw115-source-hidden");

    // The actual rules/capture/tactic result still comes from the old engine.
    BW115_commitAction(piece,r,c);

    bw115ActionAnimating=false;
    bw115SetAnimating(false);
    bw115SyncMarkerMode();
  });
};

/* Ability target circles appear only after the player activates the ability. */
const BW115_activateScan=activateScan;
activateScan=function(piece){
  document.body.classList.remove("bw115-drag-active");
  const result=BW115_activateScan(piece);
  bw115SyncMarkerMode();
  return result;
};

const BW115_useCommanderTactic=useCommanderTactic;
useCommanderTactic=function(piece){
  document.body.classList.remove("bw115-drag-active");
  const result=BW115_useCommanderTactic(piece);
  bw115SyncMarkerMode();
  return result;
};

const BW115_confirmPending=confirmPending;
confirmPending=function(){
  const result=BW115_confirmPending();
  bw115SyncMarkerMode();
  return result;
};

const BW115_cancelConfirm=cancelConfirm;
cancelConfirm=function(){
  const result=BW115_cancelConfirm();
  bw115SyncMarkerMode();
  return result;
};

const BW115_finishPlayerTurn=finishPlayerTurn;
finishPlayerTurn=function(){
  document.body.classList.remove("bw115-drag-active","bw115-ability-active");
  bw115RestoreDragSource();
  return BW115_finishPlayerTurn();
};

/* Animate A.I. moves after its rules resolve.
   Because the original AI renders synchronously, the final token is hidden
   before the browser paints, then a travel sprite moves from old -> new. */
const BW115_aiTurn=aiTurn;
aiTurn=function(){
  const before=new Map();

  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const p=board[r][c];
    if(p && p.team===enemyTeam()){
      before.set(p.uid,{
        r,c,
        id:p.id,
        img:p.img||imgMap[p.id],
        piece:p
      });
    }
  }

  const result=BW115_aiTurn();

  let moved=null;
  for(let r=0;r<ROWS && !moved;r++)for(let c=0;c<COLS;c++){
    const p=board[r][c];
    if(!p || p.team!==enemyTeam()) continue;
    const old=before.get(p.uid);
    if(old && (old.r!==r || old.c!==c)){
      moved={old,piece:p,to:{r,c}};
      break;
    }
  }

  if(moved){
    const known=!!(
      moved.piece.revealed ||
      moved.piece.scanned ||
      showAllEnemies ||
      phase==="gameover"
    );

    const finalEl=known
      ? bw115FindPieceVisualAt(moved.to.r,moved.to.c)
      : bw115FindHiddenEnemyAt(moved.to.r,moved.to.c);

    if(finalEl) finalEl.classList.add("bw115-source-hidden");

    const ghost=known
      ? bw115CreateTravelGhost(
          {id:moved.old.id,img:moved.old.img},
          {r:moved.old.r,c:moved.old.c}
        )
      : bw115CreateHiddenTravelGhost(
          {r:moved.old.r,c:moved.old.c}
        );

    const duration=bw115TravelDuration(
      {r:moved.old.r,c:moved.old.c},
      moved.to
    );

    bw115AiAnimating=true;
    bw115SetAnimating(true);

    bw115AnimateElementToCell(ghost,moved.to,duration,()=>{
      ghost.remove();
      if(finalEl) finalEl.classList.remove("bw115-source-hidden");
      bw115AiAnimating=false;
      bw115SetAnimating(false);
    },!known);
  }

  bw115SyncMarkerMode();
  return result;
};

const BW115_initGame=initGame;
initGame=function(){
  document.body.classList.remove("bw115-drag-active","bw115-ability-active");
  bw115ActionAnimating=false;
  bw115AiAnimating=false;
  bw115RestoreDragSource();
  const result=BW115_initGame();
  bw115SyncMarkerMode();
  return result;
};

window.addEventListener("DOMContentLoaded",()=>{
  bw115SyncMarkerMode();
});


/* ============================================================
   v116 SIMPLE BOARD-GAME CONTROLS
   Click a unit. Click where it goes.
   ============================================================ */

function bw116NormalSelectionActive(){
  return !!(
    phase==="player" &&
    selectedPiece &&
    selectedPiece.team===playerTeam() &&
    !scanMode &&
    !abilityMoveMode
  );
}

function bw116SetNeutralStatus(){
  if(phase!=="player") return;
  updateStatus(
    teamLabel(playerTeam())+" TURN",
    "CHOOSE A UNIT",
    "Click a friendly unit, then click a highlighted circle."
  );
}

function bw116ClearNormalSelection(render=true){
  if(!scanMode && !abilityMoveMode){
    selectedPiece=null;
    legal=[];
  }
  document.body.classList.remove("bw116-piece-selected");

  if(render){
    renderBoard();
    updateConsole(null);
    bw116SetNeutralStatus();
  }
}

function bw116CancelAbility(render=true){
  pendingConfirm=null;
  hideConfirm();
  scanMode=false;
  abilityMoveMode=false;
  scanTargets=[];
  legal=[];
  selectedPiece=null;

  document.body.classList.remove(
    "bw116-piece-selected",
    "bw115-ability-active"
  );

  if(render){
    renderBoard();
    updateConsole(null);
    bw116SetNeutralStatus();
  }
}

function bw116SelectPiece(piece){
  if(
    phase!=="player" ||
    !piece ||
    piece.team!==playerTeam()
  ) return;

  // Switching pieces is always immediate and never requires a cancel step.
  if(scanMode || abilityMoveMode || pendingConfirm){
    bw116CancelAbility(false);
  }

  // Clicking the same selected unit again cancels it.
  if(
    bw116NormalSelectionActive() &&
    selectedPiece===piece
  ){
    bw116ClearNormalSelection(true);
    return;
  }

  if(!piece.movable){
    selectedPiece=null;
    legal=[];
    document.body.classList.remove("bw116-piece-selected");
    updateConsole(piece);
    renderBoard();
    updateStatus(
      teamLabel(playerTeam())+" TURN",
      piece.name.toUpperCase(),
      "This unit cannot move. Choose another unit."
    );
    return;
  }

  const moves=getLegal(piece);

  // Do not trap the player on a unit with nowhere to go.
  if(!moves.length){
    selectedPiece=null;
    legal=[];
    document.body.classList.remove("bw116-piece-selected");
    updateConsole(piece);
    renderBoard();
    updateStatus(
      teamLabel(playerTeam())+" TURN",
      "NO LEGAL MOVES",
      piece.name+" cannot move right now. Click another unit."
    );
    return;
  }

  selectedPiece=piece;
  legal=moves;
  scanMode=false;
  abilityMoveMode=false;
  scanTargets=[];
  pendingConfirm=null;
  hideConfirm();

  document.body.classList.add("bw116-piece-selected");
  document.body.classList.remove(
    "bw115-drag-active",
    "bw115-ability-active"
  );

  updateConsole(piece);
  renderBoard();
  updateStatus(
    teamLabel(playerTeam())+" TURN",
    piece.name.toUpperCase()+" SELECTED",
    "Click a highlighted circle to move, another unit to switch, or empty board to cancel."
  );
}

function bw116DecorateFriendlyPieces(){
  if(!document.body.classList.contains("bw116-simple-click") || !Array.isArray(board)) return;

  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const piece=board[r]&&board[r][c];
    if(!piece || piece.team!==playerTeam()) continue;

    const el=bw115FindPieceVisualAt(r,c);
    if(!el) continue;

    el.classList.add("bw116-friendly-clickable");

    if(
      bw116NormalSelectionActive() &&
      selectedPiece===piece
    ){
      el.classList.add("bw116-selected-piece");
    }

    el.onpointerdown=(event)=>startPiecePointer(event,piece);
  }
}

const BW116_previousStartPiecePointer=startPiecePointer;
startPiecePointer=function(event,piece){
  if(event.pointerType==="mouse" && event.button!==0) return;

  if(
    phase==="player" &&
    piece &&
    piece.team===playerTeam()
  ){
    event.preventDefault();
    event.stopPropagation();

    // Prevent this same browser click from falling through to the board.
    suppressNextBoardClick=true;

    bw116SelectPiece(piece);
    return;
  }

  return BW116_previousStartPiecePointer(event,piece);
};

const BW116_baseCellClick=cellClick;
cellClick=function(r,c){
  if(phase==="deploy"){
    return BW116_baseCellClick(r,c);
  }

  if(phase!=="player"){
    return BW116_baseCellClick(r,c);
  }

  if(scanMode){
    if(scanTargets.some(t=>t.r===r && t.c===c)){
      return BW116_baseCellClick(r,c);
    }
    bw116CancelAbility(true);
    return;
  }

  if(abilityMoveMode){
    if(legal.some(t=>t.r===r && t.c===c)){
      return BW116_baseCellClick(r,c);
    }
    bw116CancelAbility(true);
    return;
  }

  if(bw116NormalSelectionActive()){
    const piece=selectedPiece;

    if(legal.some(t=>t.r===r && t.c===c)){
      selectedPiece=null;
      legal=[];
      document.body.classList.remove("bw116-piece-selected");
      renderBoard();
      performAction(piece,r,c);
      return;
    }

    bw116ClearNormalSelection(true);
    return;
  }

  return BW116_baseCellClick(r,c);
};

const BW116_renderBoard=renderBoard;
renderBoard=function(){
  const result=BW116_renderBoard();
  bw116DecorateFriendlyPieces();
  return result;
};

const BW116_activateScan=activateScan;
activateScan=function(piece){
  selectedPiece=null;
  legal=[];
  document.body.classList.remove("bw116-piece-selected");
  const result=BW116_activateScan(piece);
  bw115SyncMarkerMode();
  return result;
};

const BW116_useCommanderTactic=useCommanderTactic;
useCommanderTactic=function(piece){
  selectedPiece=null;
  legal=[];
  document.body.classList.remove("bw116-piece-selected");
  const result=BW116_useCommanderTactic(piece);
  bw115SyncMarkerMode();
  return result;
};

const BW116_finishPlayerTurn=finishPlayerTurn;
finishPlayerTurn=function(){
  document.body.classList.remove("bw116-piece-selected");
  return BW116_finishPlayerTurn();
};

const BW116_initGame=initGame;
initGame=function(){
  document.body.classList.add("bw116-simple-click");
  document.body.classList.remove("bw116-piece-selected");
  const result=BW116_initGame();
  bw116DecorateFriendlyPieces();
  return result;
};

document.body.classList.add("bw116-simple-click");
bw116DecorateFriendlyPieces();

window.addEventListener("DOMContentLoaded",()=>{
  document.body.classList.add("bw116-simple-click");
  bw116DecorateFriendlyPieces();
});
