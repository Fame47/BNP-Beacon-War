
/* ============================================================
   BEACON WARS v129
   COMBAT ATTACK FX
   ============================================================ */

AUDIO_FILES.batleth="audio/batleth.mp3";

const BW128_ATTACK_MS=2700;
const BW128_WEAPON1_MS=750;
const BW128_WEAPON2_MS=450;
const BW128_RESULT_MS=1500;

let bw128CombatActive=false;
let bw128AiResolveContext=false;
let bw128SuppressLegacyAttackSound=false;
let bw128RemoteSnapshotPending=false;

/* Use the user's original 1920x1080 artwork as full-screen layers.
   These anchor points are the centers of the visible weapon art inside
   those exact canvases. */
const BW128_WEAPON_META={
  phaser1:{src:"PHASER_ATTACK_1.png",anchorX:981,anchorY:540},
  phaser2:{src:"PHASER_ATTACK_2.png",anchorX:975,anchorY:529},
  batleth1:{src:"BATLETH_ATTACK_1.png",anchorX:932,anchorY:567},
  batleth2:{src:"BATLETH_ATTACK_2.png",anchorX:909,anchorY:545}
};

function bw128EnsureLayer(){
  let layer=document.getElementById("bw128AttackFxLayer");
  if(layer) return layer;

  layer=document.createElement("div");
  layer.id="bw128AttackFxLayer";
  const game=document.getElementById("game");
  if(game) game.appendChild(layer);
  return layer;
}

function bw128SetCombatLock(on){
  bw128CombatActive=!!on;
  const game=document.getElementById("game");
  if(game) game.classList.toggle("bw128-combat-active",!!on);

  const layer=bw128EnsureLayer();
  if(layer) layer.classList.toggle("active",!!on);

  if(typeof bw115SetAnimating==="function"){
    bw115SetAnimating(!!on);
  }
}

function bw128ClearFx(){
  const layer=bw128EnsureLayer();
  if(layer) layer.innerHTML="";
}

function bw128WeaponForTeam(team,stage){
  if(team===RED){
    return stage===1 ? BW128_WEAPON_META.batleth1 : BW128_WEAPON_META.batleth2;
  }
  return stage===1 ? BW128_WEAPON_META.phaser1 : BW128_WEAPON_META.phaser2;
}

function bw128PlayAcademyAttackSound(team){
  if(team===RED){
    playSound("batleth",{volume:.95});
  }else{
    playSound("attack",{volume:.90});
  }
}

function bw128CreateWeapon(meta,team,point,scale=.82){
  const layer=bw128EnsureLayer();
  const img=document.createElement("img");
  img.className=
    "bw128-weapon "+
    (team===RED ? "red-weapon" : "blue-weapon");
  img.src=meta.src;

  img.style.left=(point.x-meta.anchorX)+"px";
  img.style.top=(point.y-meta.anchorY)+"px";
  img.style.transform=`scale(${scale})`;
  layer.appendChild(img);
  return img;
}

function bw128AnimateWeaponIn(team,fromCell,toCell,onDone){
  const from=cellCenter(fromCell.r,fromCell.c);
  const to=cellCenter(toCell.r,toCell.c);

  let dx=to.x-from.x;
  let dy=to.y-from.y;
  const mag=Math.max(1,Math.hypot(dx,dy));
  dx/=mag;
  dy/=mag;

  const start={
    x:from.x-(dx*22),
    y:from.y-(dy*22)
  };

  const impact={
    x:to.x-(dx*10),
    y:to.y-(dy*10)
  };

  const meta=bw128WeaponForTeam(team,1);
  const img=bw128CreateWeapon(meta,team,start,.84);
  img.style.opacity="1";

  requestAnimationFrame(()=>{
    img.style.transition=
      `left ${BW128_WEAPON1_MS}ms cubic-bezier(.16,.8,.2,1),`+
      ` top ${BW128_WEAPON1_MS}ms cubic-bezier(.16,.8,.2,1),`+
      ` transform ${BW128_WEAPON1_MS}ms cubic-bezier(.16,.8,.2,1),`+
      ` opacity 120ms ease`;

    img.style.left=(impact.x-meta.anchorX)+"px";
    img.style.top=(impact.y-meta.anchorY)+"px";
    img.style.transform="scale(1.10)";
  });

  window.setTimeout(()=>{
    img.style.opacity="0";
    window.setTimeout(()=>img.remove(),140);
    if(onDone) onDone();
  },BW128_WEAPON1_MS);
}

function bw128AnimateWeaponOut(team,fromCell,toCell,onDone){
  const from=cellCenter(fromCell.r,fromCell.c);
  const to=cellCenter(toCell.r,toCell.c);

  let dx=to.x-from.x;
  let dy=to.y-from.y;
  const mag=Math.max(1,Math.hypot(dx,dy));
  dx/=mag;
  dy/=mag;

  const start={
    x:to.x,
    y:to.y
  };

  const recoil = (team===RED) ? 1 : -1;
  const end={
    x:to.x+(dx*115*recoil),
    y:to.y+(dy*115*recoil)
  };

  const meta=bw128WeaponForTeam(team,2);
  const img=bw128CreateWeapon(meta,team,start,1.08);
  img.style.opacity="0";

  requestAnimationFrame(()=>{
    img.style.opacity="1";
    img.style.transform="scale(1.08)";

    requestAnimationFrame(()=>{
      img.style.transition=
        `left ${BW128_WEAPON2_MS}ms cubic-bezier(.18,.72,.26,1),`+
        ` top ${BW128_WEAPON2_MS}ms cubic-bezier(.18,.72,.26,1),`+
        ` transform ${BW128_WEAPON2_MS}ms ease,`+
        ` opacity ${BW128_WEAPON2_MS}ms ease`;

      img.style.left=(end.x-meta.anchorX)+"px";
      img.style.top=(end.y-meta.anchorY)+"px";
      img.style.transform="scale(.90)";
      img.style.opacity="0";
    });
  });

  window.setTimeout(()=>{
    img.remove();
    if(onDone) onDone();
  },BW128_WEAPON2_MS+40);
}

/* Calculate who will actually be captured without changing the board yet. */
function bw128PredictedLosers(a,d){
  if(!a || !d) return [];

  if(d.beacon) return [d];

  if(d.mine){
    if(a.engineer || (a.id==="FC" && Number(a.sabotageCharges)>0)) return [d];
    return a.shielded ? [] : [a];
  }

  if(a.infiltrator){
    if(d.rank===10) return d.shielded ? [] : [d];
    return a.shielded ? [] : [a];
  }

  if(d.infiltrator){
    return d.shielded ? [] : [d];
  }

  if(a.rank>d.rank){
    return d.shielded ? [] : [d];
  }

  if(a.rank<d.rank){
    return a.shielded ? [] : [a];
  }

  const losers=[];
  if(!a.shielded) losers.push(a);
  if(!d.shielded) losers.push(d);
  return losers;
}
function bw128RevealCombatants(a,d){
  if(a) a.revealed=true;
  if(d) d.revealed=true;
  renderBoard();
}

function bw128FindVisual(piece){
  if(!piece) return null;

  if(typeof bw115FindPieceVisualAt==="function"){
    const el=bw115FindPieceVisualAt(piece.r,piece.c);
    if(el) return el;
  }

  if(typeof bw115FindHiddenEnemyAt==="function"){
    return bw115FindHiddenEnemyAt(piece.r,piece.c);
  }

  return null;
}

function bw128StartResultBlink(losers,a,d,onDone){
  const unique=[...new Set((losers||[]).filter(Boolean))];

  if(unique.length){
    unique.forEach(piece=>{
      const el=bw128FindVisual(piece);
      if(el) el.classList.add("bw128-red-blink");
    });
  }else{
    /* Emergency Shield / no-capture result. */
    [a,d].filter(Boolean).forEach(piece=>{
      const el=bw128FindVisual(piece);
      if(el && el.classList.contains("piece")){
        el.classList.add("bw128-clash-hold");
      }
    });
  }

  window.setTimeout(()=>{
    if(onDone) onDone();
  },BW128_RESULT_MS);
}

function bw128RunAttackSequence(a,d,onResolve){
  if(!a || !d || bw128CombatActive){
    if(onResolve) onResolve();
    return;
  }

  const from={r:a.r,c:a.c};
  const to={r:d.r,c:d.c};
  const team=a.team;
  const losers=bw128PredictedLosers(a,d);

  bw128ClearFx();
  bw128SetCombatLock(true);

  updateStatus(
    teamLabel(team)+" ATTACK",
    "COMBAT IN PROGRESS",
    team===BLUE ? "Phaser strike resolving..." : "Bat'leth strike resolving..."
  );

  bw128AnimateWeaponIn(team,from,to,()=>{
    /* Sound hits at the exact transition into the second weapon image. */
    bw128PlayAcademyAttackSound(team);

    bw128AnimateWeaponOut(team,from,to,()=>{
      /* Combatants become visible for the result flash. */
      bw128RevealCombatants(a,d);

      bw128StartResultBlink(losers,a,d,()=>{
        bw128ClearFx();
        if(onResolve) onResolve();
        bw128SetCombatLock(false);
      });
    });
  });
}

/* ---------------------------------------------------------
   Suppress the old generic A.I. attack sound.
   v128 plays the correct Academy-specific sound at 0.65 sec.
   --------------------------------------------------------- */
const BW128_playSound=playSound;
playSound=function(name,options={}){
  if(bw128SuppressLegacyAttackSound && name==="attack") return;
  return BW128_playSound(name,options);
};

/* ---------------------------------------------------------
   PLAYER ATTACK
   Keep the existing movement/tactics pipeline untouched for non-attacks.
   --------------------------------------------------------- */
const BW128_normalPerformAction=performAction;
const BW128_commitResolveCombat=resolveCombat;

function bw189CommitCombatWithTactics(attacker,defender){
  const sabotageMine=!!(
    attacker&&defender&&defender.mine&&attacker.id==="FC"&&
    Number(attacker.sabotageCharges)>0
  );
  const originalEngineer=attacker&&attacker.engineer;
  if(sabotageMine)attacker.engineer=true;
  BW128_commitResolveCombat(attacker,defender);
  if(sabotageMine){
    attacker.engineer=originalEngineer;
    attacker.sabotageCharges=Math.max(0,Number(attacker.sabotageCharges)-1);
    log("Sabotage Protocol disabled a Shield Mine. "+attacker.sabotageCharges+" charge"+(attacker.sabotageCharges===1?"":"s")+" remaining.");
    updateConsole(attacker);
  }
}

performAction=function(piece,r,c){
  const target=board[r] ? board[r][c] : null;

  if(
    !piece ||
    !target ||
    target.team===piece.team ||
    bw128CombatActive
  ){
    return BW128_normalPerformAction(piece,r,c);
  }

  const from={r:piece.r,c:piece.c};
  const to={r,c};
  const privateText=moveTextFor(piece,from,to,target);
  const publicText=publicMoveText(from,to,target);

  if(typeof setBattleMoveVisual==="function"){
    setBattleMoveVisual(piece,to,true,false);
  }

  if(onlineState.enabled){
    onlineState.pendingMove={
      type:"attack",
      from,
      to,
      publicText,
      privateText
    };
  }

  selectedPiece=null;
  legal=[];
  renderBoard();

  bw128RunAttackSequence(piece,target,()=>{
    /* The existing game rules remain authoritative. */
    bw189CommitCombatWithTactics(piece,target);
    lastMoveGlow={r,c};

    renderBoard();
    renderUnitList();
    updateConsole(selectedPiece);

    /* Preserve the exact existing turn/commit/game-over behavior. */
    finishPlayerTurn();
  });
};

/* ---------------------------------------------------------
   A.I. ATTACK
   Let the existing A.I. choose its move. We intercept only its call
   to resolveCombat, stage the 2.7 sec sequence, then commit the old rules.
   --------------------------------------------------------- */
resolveCombat=function(a,d){
  if(!bw128AiResolveContext){
    return BW128_commitResolveCombat(a,d);
  }

  if(!a || !d){
    return BW128_commitResolveCombat(a,d);
  }

  const attacker=a;
  const defender=d;

  if(typeof setBattleMoveVisual==="function"){
    setBattleMoveVisual(attacker,{r:defender.r,c:defender.c},true,true);
  }

  bw128RunAttackSequence(attacker,defender,()=>{
    bw189CommitCombatWithTactics(attacker,defender);

    renderBoard();
    renderUnitList();
    updateConsole(selectedPiece);

    if(phase!=="gameover"){
      phase="player";
      updateStatus(
        teamLabel(playerTeam())+" TURN",
        "Your turn.",
        "Choose a unit, then choose a highlighted space."
      );
      updateStartBtn();
    }
  });

  /* Old A.I. function continues, but the board has not resolved yet. */
  return undefined;
};

const BW128_normalAiTurn=aiTurn;
aiTurn=function(){
  if(bw128CombatActive) return;

  bw128AiResolveContext=true;
  bw128SuppressLegacyAttackSound=true;

  const result=BW128_normalAiTurn();

  bw128SuppressLegacyAttackSound=false;
  bw128AiResolveContext=false;

  /*
    Core A.I. hands control back immediately after calling resolveCombat.
    If v128 intercepted an attack, put the game into a temporary locked
    phase until the 2.7 second sequence finishes.
  */
  if(bw128CombatActive && phase!=="gameover"){
    phase="combatfx";
    updateStatus(
      teamLabel(enemyTeam())+" ATTACK",
      "COMBAT IN PROGRESS",
      enemyTeam()===BLUE ? "Phaser strike resolving..." : "Bat'leth strike resolving..."
    );
    updateStartBtn();
  }

  return result;
};

/* ---------------------------------------------------------
   ONLINE OPPONENT ATTACK
   Delay application of the authoritative board snapshot until the
   same combat animation completes on the receiving player's screen.
   --------------------------------------------------------- */
const BW128_applyAuthoritativeBoardSnapshot=applyAuthoritativeBoardSnapshot;

applyAuthoritativeBoardSnapshot=function(snapshot,movePayload){
  if(
    !snapshot ||
    !movePayload ||
    movePayload.type!=="attack" ||
    !movePayload.from ||
    !movePayload.to ||
    bw128RemoteSnapshotPending ||
    bw128CombatActive
  ){
    return BW128_applyAuthoritativeBoardSnapshot(snapshot,movePayload);
  }

  const shouldMirror=
    snapshot.perspectiveTeam &&
    snapshot.perspectiveTeam!==playerTeam();

  const from=shouldMirror ? mirrorCell(movePayload.from) : {...movePayload.from};
  const to=shouldMirror ? mirrorCell(movePayload.to) : {...movePayload.to};

  const attacker=board[from.r] && board[from.r][from.c];
  const defender=board[to.r] && board[to.r][to.c];

  if(!attacker || !defender){
    return BW128_applyAuthoritativeBoardSnapshot(snapshot,movePayload);
  }

  const resumePhase=phase;
  bw128RemoteSnapshotPending=true;

  bw128RunAttackSequence(attacker,defender,()=>{
    BW128_applyAuthoritativeBoardSnapshot(snapshot,movePayload);
    bw128RemoteSnapshotPending=false;

    if(phase!=="gameover"){
      phase=resumePhase;
      updateStartBtn();
    }
  });

  phase="combatfx";
  updateStartBtn();

  /* Tell handleRoomSnapshot we accepted this authoritative update. */
  return true;
};

/* Cleanup on new games/screens. */
const BW128_initGame=initGame;
initGame=function(){
  bw128ClearFx();
  bw128SetCombatLock(false);
  bw128RemoteSnapshotPending=false;
  const result=BW128_initGame();
  return result;
};

window.addEventListener("DOMContentLoaded",()=>{
  bw128EnsureLayer();
});
