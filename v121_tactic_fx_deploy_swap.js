
/* ============================================================
   BEACON WARS v121
   Commander tactic FX + Tricorder + Brutal Strike + deploy swap
   ============================================================ */

/* Add the two tactics to the real game list. v119 already has their PNG art. */
if(!tactics.some(t=>t.id==="brutalStrike")){
  tactics.push({
    id:"brutalStrike",
    name:"Brutal Strike",
    text:"Allows the Commander to move and then attack during the same activation."
  });
}
if(!tactics.some(t=>t.id==="tricorderScan")){
  tactics.push({
    id:"tricorderScan",
    name:"Tricorder Scan",
    text:"Reveal 4 spaces in a T-shaped pattern anywhere on the board."
  });
}

function bw121UsesWarpEffect(){
  return setup.tactic==="tacticalWarp";
}
function bw121UsesScanEffect(){
  return setup.tactic==="tricorderScan";
}
function bw121UsesStrikeEffect(){
  return setup.tactic==="brutalStrike";
}
function bw121CurrentTacticName(fallback){
  try{return currentTactic().name||fallback}catch(err){return fallback}
}

let bw121TricorderMode=false;
let bw121BrutalMode=false;
let bw121TacticAnimating=false;
let bw121DeployDrag=null;

function bw121EnsureFxLayer(){
  let layer=document.getElementById("tacticFxLayer");
  if(!layer){
    layer=document.createElement("div");
    layer.id="tacticFxLayer";
    const game=document.getElementById("game");
    if(game) game.appendChild(layer);
  }
  return layer;
}
function bw121ClearFx(){
  const layer=document.getElementById("tacticFxLayer");
  if(layer) layer.innerHTML="";
}
function bw121RemoveTricorderTarget(){
  document.body.classList.remove("bw121-tricorder-targeting");
  document.querySelectorAll(".bw121-tricorder-target").forEach(el=>el.remove());
}
function bw121RememberCommanderReveal(piece){
  if(piece && typeof bw110RememberReveal==="function"){
    bw110RememberReveal(piece,playerTeam());
  }
}
function bw121TeamClass(team){
  return team===RED ? "red" : "blue";
}

/* ---------------------------------------------------------
   Persistent shield bubble
   --------------------------------------------------------- */
function bw121DecorateShield(){
  if(!Array.isArray(board)) return;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    const p=board[r]&&board[r][c];
    if(!p || p.id!=="FC" || !p.shielded) continue;
    const el=(typeof bw115FindPieceVisualAt==="function")
      ? bw115FindPieceVisualAt(r,c)
      : null;
    if(!el || el.querySelector(".bw121-shield-bubble")) continue;
    const bubble=document.createElement("div");
    bubble.className="bw121-shield-bubble "+bw121TeamClass(p.team);
    bubble.setAttribute("aria-hidden","true");
    el.appendChild(bubble);
  }
}
const BW121_renderBoard=renderBoard;
renderBoard=function(){
  const result=BW121_renderBoard();
  bw121DecorateShield();
  return result;
};

/* ---------------------------------------------------------
   Transporter FX
   --------------------------------------------------------- */
function bw121CreateTransportFx(piece,cell,mode){
  const layer=bw121EnsureFxLayer();
  const pos=pieceTopLeft(cell.r,cell.c);
  const fx=document.createElement("div");
  fx.className="bw121-transport-fx "+mode;
  fx.style.left=pos.x+"px";
  fx.style.top=pos.y+"px";

  const beam=document.createElement("div");
  beam.className="bw121-transport-beam";
  fx.appendChild(beam);

  for(let i=0;i<6;i++){
    const line=document.createElement("i");
    line.className="bw121-transport-line";
    line.style.left=(22+i*14)+"px";
    line.style.animationDelay=(i*36)+"ms";
    fx.appendChild(line);
  }

  const img=document.createElement("img");
  img.src=piece.img||imgMap[piece.id];
  img.alt="";
  fx.appendChild(img);
  layer.appendChild(fx);
  return fx;
}

function bw121RunWarp(piece,r,c){
  if(
    !piece ||
    piece.id!=="FC" ||
    commanderUse[piece.team]<=0 ||
    !legal.some(t=>t.r===r&&t.c===c)
  ) return;

  bw121TacticAnimating=true;
  bw121BrutalMode=false;
  bw121TricorderMode=false;
  bw121RemoveTricorderTarget();
  abilityMoveMode=false;
  scanMode=false;
  scanTargets=[];

  const from={r:piece.r,c:piece.c};
  const to={r,c};
  const source=(typeof bw115FindPieceVisualAt==="function")
    ? bw115FindPieceVisualAt(from.r,from.c)
    : null;
  if(source) source.classList.add("bw115-source-hidden");

  commanderUse[piece.team]=0;
  if(typeof recordProfileTactic==="function") recordProfileTactic(1);
  piece.revealed=true;
  bw121RememberCommanderReveal(piece);

  playSound("teleport",{volume:.96});
  if(typeof bw115SetAnimating==="function") bw115SetAnimating(true);

  const dissolve=bw121CreateTransportFx(piece,from,"dematerialize");

  window.setTimeout(()=>{
    const privateText=moveTextFor(piece,from,to,null);
    const publicText=publicMoveText(from,to,null);

    board[from.r][from.c]=null;
    piece.r=to.r; piece.c=to.c;
    board[to.r][to.c]=piece;
    lastMoveGlow={r:to.r,c:to.c};
    log(privateText);

    if(typeof setBattleMoveVisual==="function"){
      setBattleMoveVisual(piece,to,false,false);
    }

    if(onlineState.enabled){
      onlineState.pendingMove={
        type:"move",
        from,
        to,
        publicText,
        privateText
      };
    }

    renderBoard();
    const finalEl=(typeof bw115FindPieceVisualAt==="function")
      ? bw115FindPieceVisualAt(to.r,to.c)
      : null;
    if(finalEl) finalEl.classList.add("bw115-source-hidden");

    dissolve.remove();
    const materialize=bw121CreateTransportFx(piece,to,"materialize");

    window.setTimeout(()=>{
      materialize.remove();
      if(finalEl) finalEl.classList.remove("bw115-source-hidden");
      selectedPiece=null;
      legal=[];
      bw121TacticAnimating=false;
      if(typeof bw115SetAnimating==="function") bw115SetAnimating(false);
      updateConsole(piece);
      finishPlayerTurn();
    },390);
  },370);
}

/* ---------------------------------------------------------
   Tricorder Scan
   4-cell T: center + left + right + one forward cell.
   --------------------------------------------------------- */
function bw121TricorderCells(r,c){
  const forward=(playerTeam()===BLUE ? -1 : 1);
  const raw=[
    {r,c},
    {r,c:c-1},
    {r,c:c+1},
    {r:r+forward,c}
  ];
  const seen=new Set();
  return raw.filter(cell=>{
    if(!inBounds(cell.r,cell.c)) return false;
    const key=cell.r+","+cell.c;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function bw121ShowTricorderTarget(){
  bw121RemoveTricorderTarget();
  const game=document.getElementById("game");
  if(!game) return;
  const overlay=document.createElement("div");
  overlay.className="bw121-tricorder-target";
  overlay.title="Choose the center of the T-shaped "+bw121CurrentTacticName("Tricorder Scan");
  overlay.onpointerdown=e=>{
    e.preventDefault();
    e.stopPropagation();
    const p=appPointer(e);
    const hit=nearestCell(p.x,p.y);
    if(!hit || !inBounds(hit.r,hit.c)) return;
    bw121ChooseTricorderTarget(hit.r,hit.c);
  };
  game.appendChild(overlay);
  document.body.classList.add("bw121-tricorder-targeting");
}
function bw121ChooseTricorderTarget(r,c){
  if(!bw121TricorderMode) return;
  bw121RemoveTricorderTarget();
  pendingConfirm={
    type:"tricorder",
    r,c,
    piece:selectedPiece
  };
  showConfirm(
    bw121CurrentTacticName("Tricorder Scan"),
    "Scan the T-shaped area centered at "+(c+1)+","+(ROWS-r)+"?",
    "SCAN AREA",
    ()=>confirmPending()
  );
}
function bw121RunTricorder(piece,r,c){
  if(!piece || piece.id!=="FC" || commanderUse[piece.team]<=0) return;

  const tacticName=bw121CurrentTacticName("Tricorder Scan");
  bw121TacticAnimating=true;
  bw121TricorderMode=false;
  bw121BrutalMode=false;
  bw121RemoveTricorderTarget();
  scanMode=false;
  abilityMoveMode=false;
  scanTargets=[];
  legal=[];

  commanderUse[piece.team]=0;
  if(typeof recordProfileTactic==="function") recordProfileTactic(1);
  piece.revealed=true;
  bw121RememberCommanderReveal(piece);

  playSound("scanner",{volume:.94});
  if(typeof bw115SetAnimating==="function") bw115SetAnimating(true);

  const layer=bw121EnsureFxLayer();
  const center=cellCenter(r,c);
  const sweep=document.createElement("div");
  sweep.className="bw121-tricorder-sweep";
  sweep.style.left=center.x+"px";
  sweep.style.top=center.y+"px";
  sweep.innerHTML=`
    <div class="bw121-tricorder-ring"></div>
    <div class="bw121-tricorder-ring"></div>
    <div class="bw121-tricorder-ring"></div>
    <div class="bw121-tricorder-core"></div>`;
  layer.appendChild(sweep);

  window.setTimeout(()=>{
    const cells=bw121TricorderCells(r,c);
    let reveals=0;
    let beaconSeen=false;

    cells.forEach(cell=>{
      const target=board[cell.r] && board[cell.r][cell.c];
      if(!target || target.team!==enemyTeam()) return;

      const wasHidden=!target.revealed && !target.scanned;
      target.scanned=true;
      if(wasHidden) reveals++;
      if(target.beacon) beaconSeen=true;
      if(typeof bw110RememberReveal==="function"){
        bw110RememberReveal(target,playerTeam());
      }
    });

    if(reveals>0 && typeof recordProfileSuccessfulScan==="function"){
      recordProfileSuccessfulScan({count:reveals,beacon:beaconSeen});
    }
    if(beaconSeen) playBeaconAlert();

    log(
      reveals
        ? tacticName+" revealed "+reveals+" enemy contact"+(reveals===1?"":"s")+"."
        : tacticName+" found no hidden enemy contacts."
    );

    renderBoard();
    updateConsole(piece);
  },610);

  window.setTimeout(()=>{
    sweep.remove();
    bw121TacticAnimating=false;
    if(typeof bw115SetAnimating==="function") bw115SetAnimating(false);
    finishPlayerTurn();
  },860);
}

/* ---------------------------------------------------------
   Brutal Strike
   Rush 1-3 spaces cardinally; cannot pass blockers or pieces.
   First enemy square may be struck.
   --------------------------------------------------------- */
function bw121BrutalTargets(piece){
  const out=[];
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  for(const [dr,dc] of dirs){
    for(let step=1;step<=3;step++){
      const r=piece.r+dr*step;
      const c=piece.c+dc*step;
      if(!inBounds(r,c) || isBlocked(r,c)) break;
      const target=board[r][c];
      if(!target){
        out.push({r,c});
        continue;
      }
      if(target.team!==piece.team) out.push({r,c});
      break;
    }
  }
  return out;
}
function bw121CreateBrutalTrail(piece,to){
  const layer=bw121EnsureFxLayer();
  const fromPos=pieceTopLeft(piece.r,piece.c);
  const dest=pieceTopLeft(to.r,to.c);
  const ghosts=[];
  const fractions=[0,.16,.32,.48,.64];

  fractions.forEach((fraction,index)=>{
    const g=document.createElement("div");
    g.className="bw121-brutal-ghost "+bw121TeamClass(piece.team);
    g.style.left=(fromPos.x+(dest.x-fromPos.x)*fraction)+"px";
    g.style.top=(fromPos.y+(dest.y-fromPos.y)*fraction)+"px";
    g.style.opacity=String(.38+index*.12);
    g.innerHTML=`<img src="${piece.img||imgMap[piece.id]}" alt="">`;
    layer.appendChild(g);
    ghosts.push(g);

    void g.offsetWidth;
    window.setTimeout(()=>{
      g.style.transition=
        `left ${280-index*15}ms cubic-bezier(.16,.78,.24,1), `+
        `top ${280-index*15}ms cubic-bezier(.16,.78,.24,1), `+
        `opacity ${240-index*10}ms ease, transform ${260-index*12}ms ease`;
      g.style.left=dest.x+"px";
      g.style.top=dest.y+"px";
      g.style.opacity=index===ghosts.length-1 ? "1" : "0";
      g.style.transform="scale("+(1.02+index*.018)+")";
    },index*24);
  });
  return ghosts;
}
function bw121RunBrutal(piece,r,c){
  if(
    !piece ||
    piece.id!=="FC" ||
    commanderUse[piece.team]<=0 ||
    !legal.some(t=>t.r===r&&t.c===c)
  ) return;

  bw121TacticAnimating=true;
  bw121BrutalMode=false;
  bw121TricorderMode=false;
  abilityMoveMode=false;
  scanMode=false;
  scanTargets=[];

  piece.revealed=true;
  bw121RememberCommanderReveal(piece);
  commanderUse[piece.team]=0;
  if(typeof recordProfileTactic==="function") recordProfileTactic(1);

  const source=(typeof bw115FindPieceVisualAt==="function")
    ? bw115FindPieceVisualAt(piece.r,piece.c)
    : null;
  if(source) source.classList.add("bw115-source-hidden");

  if(typeof bw115SetAnimating==="function") bw115SetAnimating(true);
  const ghosts=bw121CreateBrutalTrail(piece,{r,c});

  window.setTimeout(()=>{
    ghosts.forEach(g=>g.remove());
    if(source) source.classList.remove("bw115-source-hidden");

    /* Skip v115's normal glide. Brutal Strike supplied its own dash animation. */
    if(typeof bw115SkipNextActionAnimation!=="undefined"){
      bw115SkipNextActionAnimation=true;
    }
    bw121TacticAnimating=false;
    if(typeof bw115SetAnimating==="function") bw115SetAnimating(false);

    performAction(piece,r,c);
  },390);
}

/* ---------------------------------------------------------
   Commander tactic routing
   --------------------------------------------------------- */
const BW121_previousUseCommanderTactic=useCommanderTactic;
useCommanderTactic=function(piece){
  if(
    !piece ||
    piece.id!=="FC" ||
    piece.team!==playerTeam() ||
    commanderUse[piece.team]<=0 ||
    phase!=="player" ||
    bw121TacticAnimating
  ) return;

  pendingConfirm=null;
  hideConfirm();
  bw121RemoveTricorderTarget();
  bw121TricorderMode=false;
  bw121BrutalMode=false;

  piece.revealed=true;
  bw121RememberCommanderReveal(piece);

  if(bw121UsesWarpEffect()){
    const isPicard=setup.tactic==="picardManeuver";
    selectedPiece=piece;
    legal=getTeleport(piece,3);
    abilityMoveMode=true;
    scanMode=false;
    scanTargets=[];
    renderBoard();
    updateConsole(piece);
    updateStatus(
      isPicard?"PICARD MANEUVER":"TACTICAL WARP",
      "CHOOSE A TRANSPORT LOCATION",
      isPicard
        ? "Select a green landing circle to execute the warp feint, then press ENERGIZE."
        : "Select a green landing circle, then press ENERGIZE."
    );
  }
  else if(setup.tactic==="emergencyShield"){
    playSound("shields",{volume:.92});
    piece.shielded=true;
    shieldArmed[piece.team]=true;
    commanderUse[piece.team]=0;
    if(typeof recordProfileTactic==="function") recordProfileTactic(1);
    renderBoard();
    updateConsole(piece);
    updateStatus(
      "EMERGENCY SHIELD",
      "SHIELD BUBBLE ACTIVE",
      "The Captain survives the next losing attack. Shield color matches your Academy side."
    );
    log(piece.name+" revealed and armed Emergency Shield.");
    finishPlayerTurn();
  }
  else if(bw121UsesScanEffect()){
    const isSabotage=setup.tactic==="sabotageProtocol";
    selectedPiece=piece;
    legal=[];
    scanMode=false;
    abilityMoveMode=false;
    scanTargets=[];
    bw121TricorderMode=true;
    renderBoard();
    updateConsole(piece);
    bw121ShowTricorderTarget();
    updateStatus(
      isSabotage?"SABOTAGE PROTOCOL":"TRICORDER SCAN",
      "SELECT ANY BOARD LOCATION",
      isSabotage
        ? "Compromise enemy telemetry in a four-cell T pattern and expose affected contacts."
        : "Three scan rings will sweep a four-cell T pattern before contacts are revealed."
    );
  }
  else if(bw121UsesStrikeEffect()){
    const isBatleth=setup.tactic==="batleth";
    selectedPiece=piece;
    legal=bw121BrutalTargets(piece);
    scanMode=false;
    scanTargets=[];
    abilityMoveMode=true;
    bw121BrutalMode=true;
    renderBoard();
    if(typeof bw115SyncMarkerMode==="function") bw115SyncMarkerMode();
    updateConsole(piece);
    updateStatus(
      isBatleth?"BAT’LETH":"BRUTAL STRIKE",
      "CHOOSE A RUSH DESTINATION",
      isBatleth
        ? "Rush up to three spaces in a straight line and challenge an enemy on the destination square."
        : "Rush up to three spaces in a straight line. An enemy landing square becomes a normal challenge."
    );
  }
  else{
    return BW121_previousUseCommanderTactic(piece);
  }

  if(typeof bw115SyncMarkerMode==="function") bw115SyncMarkerMode();
};

const BW121_previousChooseWarpTarget=chooseWarpTarget;
chooseWarpTarget=function(r,c){
  if(bw121BrutalMode){
    const target=board[r] && board[r][c];
    pendingConfirm={type:"brutal",r,c,piece:selectedPiece};
    showConfirm(
      bw121CurrentTacticName("Brutal Strike"),
      target
        ? "Rush into the enemy at "+(c+1)+","+(ROWS-r)+"?"
        : "Rush to "+(c+1)+","+(ROWS-r)+"?",
      "STRIKE",
      ()=>confirmPending()
    );
    return;
  }
  return BW121_previousChooseWarpTarget(r,c);
};

const BW121_previousConfirmPending=confirmPending;
confirmPending=function(){
  if(!pendingConfirm) return;

  const p=pendingConfirm;

  if(p.type==="warp" && bw121UsesWarpEffect()){
    pendingConfirm=null;
    hideConfirm();
    bw121RunWarp(p.piece,p.r,p.c);
    return;
  }
  if(p.type==="brutal"){
    pendingConfirm=null;
    hideConfirm();
    bw121RunBrutal(p.piece,p.r,p.c);
    return;
  }
  if(p.type==="tricorder"){
    pendingConfirm=null;
    hideConfirm();
    bw121RunTricorder(p.piece,p.r,p.c);
    return;
  }

  return BW121_previousConfirmPending();
};

const BW121_previousCancelConfirm=cancelConfirm;
cancelConfirm=function(){
  const type=pendingConfirm && pendingConfirm.type;
  const result=BW121_previousCancelConfirm();

  if(type==="tricorder" && bw121TricorderMode){
    bw121ShowTricorderTarget();
  }
  if(typeof bw115SyncMarkerMode==="function") bw115SyncMarkerMode();
  return result;
};

/* ---------------------------------------------------------
   Deployment drag / move / swap
   --------------------------------------------------------- */
function bw121FindPieceEl(piece){
  if(typeof bw115FindPieceVisualAt==="function"){
    return bw115FindPieceVisualAt(piece.r,piece.c);
  }
  return null;
}
function bw121BeginDeployDrag(event,piece){
  if(!piece || phase!=="deploy" || piece.team!==playerTeam()) return;

  const sourceEl=bw121FindPieceEl(piece);
  if(sourceEl) sourceEl.classList.add("bw121-deploy-source");

  const ghost=document.createElement("div");
  ghost.className="bw121-deploy-ghost";
  ghost.innerHTML=`<img src="${piece.img||imgMap[piece.id]}" alt="">`;
  document.getElementById("pieces").appendChild(ghost);

  bw121DeployDrag={
    piece,
    ghost,
    sourceEl,
    source:{r:piece.r,c:piece.c}
  };
  document.body.classList.add("bw121-deploy-dragging");
  bw121MoveDeployGhost(event);

  window.addEventListener("pointermove",bw121DeployDragMove);
  window.addEventListener("pointerup",bw121DeployDragEnd);
  window.addEventListener("pointercancel",bw121DeployDragCancel);
}
function bw121MoveDeployGhost(event){
  if(!bw121DeployDrag) return;
  const p=appPointer(event);
  bw121DeployDrag.ghost.style.left=(p.x-BASE_ANCHOR.x-anchorOffset.x)+"px";
  bw121DeployDrag.ghost.style.top=(p.y-BASE_ANCHOR.y-anchorOffset.y)+"px";
}
function bw121DeployDragMove(event){
  event.preventDefault();
  bw121MoveDeployGhost(event);
}
function bw121CleanupDeployDrag(){
  window.removeEventListener("pointermove",bw121DeployDragMove);
  window.removeEventListener("pointerup",bw121DeployDragEnd);
  window.removeEventListener("pointercancel",bw121DeployDragCancel);
  document.body.classList.remove("bw121-deploy-dragging");
}
function bw121DeployCommit(piece,source,hit){
  const other=board[hit.r][hit.c];

  if(other && other.team!==playerTeam()) return false;

  if(other && other!==piece){
    board[source.r][source.c]=other;
    other.r=source.r; other.c=source.c;
    board[hit.r][hit.c]=piece;
    piece.r=hit.r; piece.c=hit.c;
    log("Deployment positions swapped.");
  }else{
    board[source.r][source.c]=null;
    board[hit.r][hit.c]=piece;
    piece.r=hit.r; piece.c=hit.c;
    log("Deployment unit repositioned.");
  }

  lastMoveGlow=null;
  selectedPiece=null;
  legal=[];
  updateConsole(piece);
  renderUnitList();
  renderBoard();
  updateStartBtn();
  return true;
}
function bw121DeployDragEnd(event){
  if(!bw121DeployDrag) return;
  const state=bw121DeployDrag;
  const p=appPointer(event);
  const hit=nearestCell(p.x,p.y);

  bw121CleanupDeployDrag();
  bw121DeployDrag=null;
  suppressNextBoardClick=true;

  const valid=!!(
    hit &&
    PLAYER_DEPLOY_ROWS.includes(hit.r) &&
    !isBlocked(hit.r,hit.c)
  );
  const target=valid ? hit : state.source;

  if(typeof bw115AnimateElementToCell==="function"){
    bw115AnimateElementToCell(state.ghost,target,145,()=>{
      state.ghost.remove();
      if(state.sourceEl) state.sourceEl.classList.remove("bw121-deploy-source");

      if(valid && !(hit.r===state.source.r && hit.c===state.source.c)){
        bw121DeployCommit(state.piece,state.source,hit);
      }else{
        renderBoard();
      }
    });
  }else{
    state.ghost.remove();
    if(state.sourceEl) state.sourceEl.classList.remove("bw121-deploy-source");
    if(valid && !(hit.r===state.source.r && hit.c===state.source.c)){
      bw121DeployCommit(state.piece,state.source,hit);
    }else{
      renderBoard();
    }
  }
}
function bw121DeployDragCancel(){
  if(!bw121DeployDrag) return;
  const state=bw121DeployDrag;
  bw121CleanupDeployDrag();
  bw121DeployDrag=null;
  suppressNextBoardClick=true;

  if(typeof bw115AnimateElementToCell==="function"){
    bw115AnimateElementToCell(state.ghost,state.source,130,()=>{
      state.ghost.remove();
      if(state.sourceEl) state.sourceEl.classList.remove("bw121-deploy-source");
      renderBoard();
    });
  }else{
    state.ghost.remove();
    if(state.sourceEl) state.sourceEl.classList.remove("bw121-deploy-source");
    renderBoard();
  }
}

const BW121_previousStartPiecePointer=startPiecePointer;
startPiecePointer=function(event,piece){
  if(
    phase==="deploy" &&
    piece &&
    piece.team===playerTeam()
  ){
    if(event.pointerType==="mouse" && event.button!==0) return;

    event.preventDefault();
    event.stopPropagation();

    const startX=event.clientX;
    const startY=event.clientY;
    let dragging=false;
    let done=false;

    const cleanup=()=>{
      window.removeEventListener("pointermove",onMove);
      window.removeEventListener("pointerup",onUp);
      window.removeEventListener("pointercancel",onCancel);
    };
    const onMove=e=>{
      if(done || dragging) return;
      if(Math.hypot(e.clientX-startX,e.clientY-startY)>6){
        dragging=true;
        cleanup();
        bw121BeginDeployDrag(e,piece);
      }
    };
    const onUp=e=>{
      if(done) return;
      done=true;
      cleanup();
      if(!dragging){
        /* Keep the existing quick-click behavior: remove back to tray. */
        pieceClick(piece);
      }
    };
    const onCancel=()=>{
      done=true;
      cleanup();
    };

    window.addEventListener("pointermove",onMove);
    window.addEventListener("pointerup",onUp);
    window.addEventListener("pointercancel",onCancel);
    return;
  }

  return BW121_previousStartPiecePointer(event,piece);
};

/* ---------------------------------------------------------
   Cleanup between phases/screens
   --------------------------------------------------------- */
const BW121_finishPlayerTurn=finishPlayerTurn;
finishPlayerTurn=function(){
  bw121TricorderMode=false;
  bw121BrutalMode=false;
  bw121RemoveTricorderTarget();
  return BW121_finishPlayerTurn();
};

const BW121_initGame=initGame;
initGame=function(){
  bw121TricorderMode=false;
  bw121BrutalMode=false;
  bw121TacticAnimating=false;
  bw121RemoveTricorderTarget();
  bw121ClearFx();
  const result=BW121_initGame();
  if(typeof renderTactics==="function") renderTactics();
  return result;
};

window.addEventListener("DOMContentLoaded",()=>{
  bw121EnsureFxLayer();
  if(typeof renderTactics==="function") renderTactics();
  if(typeof bw119UpdateBriefing==="function") bw119UpdateBriefing();
  bw121DecorateShield();
});
