
/* ============================================================
   BEACON WARS v122
   Profile photo gallery + two-player-turn reveal visibility
   ============================================================ */

/*
  PLAYER-CREATED REVEAL TIMING

  A reveal created during the player's current turn begins at 2.
  When that current turn ends: 2 -> 1.
  The A.I. gets its turn and does NOT clear the reveal.
  The player's next full turn remains revealed.
  At the end of that second player turn: 1 -> 0 and the unit hides.

  A.I.-created reveals keep the prior behavior: they remain visible
  through the player's turn and expire when that player turn ends.
*/

bw110RememberReveal=function(piece,originTeam){
  if(!piece || !bw110PieceOnBoard(piece)) return;

  const existing=bw110TempReveals.get(piece) || {};
  const playerCreated=(originTeam===playerTeam());

  bw110TempReveals.set(piece,{
    originTeam,
    scanned:!!piece.scanned,
    playerTurnsRemaining:playerCreated
      ? Math.max(Number(existing.playerTurnsRemaining)||0,2)
      : null
  });
};

const BW122_originalExpireReveals=bw110ExpireReveals;
bw110ExpireReveals=function(originTeam){
  /*
    v110 calls this with playerTeam() at the end of the A.I. turn.
    Player-created reveals must NOT disappear there anymore.
  */
  if(originTeam===playerTeam()) return;
  return BW122_originalExpireReveals(originTeam);
};

function bw122AdvancePlayerRevealClock(){
  let changed=false;

  for(const [piece,meta] of [...bw110TempReveals.entries()]){
    if(!meta || meta.originTeam!==playerTeam()) continue;

    if(!bw110PieceOnBoard(piece)){
      bw110TempReveals.delete(piece);
      continue;
    }

    let remaining=Number(meta.playerTurnsRemaining);
    if(!Number.isFinite(remaining) || remaining<=0) remaining=2;
    remaining-=1;

    if(remaining<=0){
      piece.revealed=false;
      piece.scanned=false;
      bw110TempReveals.delete(piece);
      changed=true;
    }else{
      meta.playerTurnsRemaining=remaining;
      bw110TempReveals.set(piece,meta);
    }
  }

  if(changed && phase!=="gameover"){
    renderBoard();
  }
}

/*
  v121's current finishPlayerTurn is the outermost battle-turn wrapper.
  Advance the reveal clock immediately before the player's turn is handed off.
*/
const BW122_finishPlayerTurn=finishPlayerTurn;
finishPlayerTurn=function(){
  bw122AdvancePlayerRevealClock();
  return BW122_finishPlayerTurn();
};

/* Better fallback for old saved profiles whose icon no longer appears in the gallery. */
function bw122NormalizeSavedProfilePhoto(){
  const data=getPlayerProfileData();
  if(!PROFILE_ICON_ASSETS[data.icon]){
    data.icon="infiltrator";
    savePlayerProfileData(data);
  }
}

window.addEventListener("DOMContentLoaded",()=>{
  bw122NormalizeSavedProfilePhoto();
  if(typeof loadPlayerProfile==="function"){
    loadPlayerProfile();
  }
});
