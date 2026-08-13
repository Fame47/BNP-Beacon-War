
/* ============================================================
   BEACON WARS v120 BATTLE HUD RESTORE
   The v94-v98 battle HUD already exists in the HTML/CSS.
   The v116 rollback lost the battle-live state switch that
   activates it. This adapter restores that state without
   replacing the v116 click-select/click-move battle core.
   ============================================================ */

function bw120SyncBattleHudPhase(){
  const game=document.getElementById("game");
  if(!game || typeof phase==="undefined") return;

  const live=["player","ai","waiting","commit","gameover"].includes(phase);
  game.classList.toggle("battle-live",live);
  game.classList.toggle("commit-needed",phase==="commit");

  // Keep the latest compact turn messaging from the v97/v98 HUD.
  if(typeof updateStatus==="function"){
    if(phase==="player"){
      updateStatus(
        teamLabel(playerTeam())+" TURN",
        "DRAG A UNIT TO A HIGHLIGHTED SPACE",
        ""
      );
    }else if(phase==="ai"){
      updateStatus(
        teamLabel(enemyTeam())+" TURN",
        "OPPONENT IS MOVING",
        ""
      );
    }else if(phase==="waiting"){
      updateStatus(
        teamLabel(enemyTeam())+" TURN",
        "WAITING FOR OPPONENT",
        ""
      );
    }else if(phase==="commit"){
      updateStatus(
        "MOVE READY",
        "PRESS COMMIT TO PASS TURN",
        ""
      );
    }
  }

  // The profile/reaction HUD was present but hidden when battle-live vanished.
  if(live){
    if(typeof syncMatchIdentityHud==="function") syncMatchIdentityHud();
    if(typeof bw119RenderBattleReactionPicker==="function") bw119RenderBattleReactionPicker();
    if(typeof updateCaptured==="function") updateCaptured();
  }else{
    const picker=document.getElementById("reactionPicker");
    if(picker) picker.classList.remove("show");
  }
}

/*
  updateStartBtn is called throughout the battle engine whenever phase changes.
  Wrapping it here means the latest HUD follows every transition:
  deploy -> player -> AI/waiting -> commit -> gameover.
*/
const BW120_updateStartBtn=updateStartBtn;
updateStartBtn=function(){
  const result=BW120_updateStartBtn();
  bw120SyncBattleHudPhase();
  return result;
};

/* Some v116 click-move paths update the status before/after controls.
   Mirror the HUD state there too so no transition can fall back to the old HUD.
*/
const BW120_updateStatus=updateStatus;
updateStatus=function(title,line,note){
  const result=BW120_updateStatus(title,line,note);

  const game=document.getElementById("game");
  if(game && typeof phase!=="undefined"){
    const live=["player","ai","waiting","commit","gameover"].includes(phase);
    game.classList.toggle("battle-live",live);
    game.classList.toggle("commit-needed",phase==="commit");
  }
  return result;
};

/* Ensure opening/closing screens cannot leave stale HUD state behind. */
if(typeof showScreen==="function"){
  const BW120_showScreen=showScreen;
  showScreen=function(id){
    const result=BW120_showScreen(id);
    if(id==="game") bw120SyncBattleHudPhase();
    return result;
  };
}

/* Fresh games must return to deployment first, then activate the HUD at battle start. */
const BW120_initGame=initGame;
initGame=function(){
  const game=document.getElementById("game");
  if(game){
    game.classList.remove("battle-live","commit-needed");
  }
  const result=BW120_initGame();
  bw120SyncBattleHudPhase();
  return result;
};

/* Reaction menu always reflects the five reactions equipped in Player Profile. */
if(typeof toggleReactionPicker==="function"){
  const BW120_toggleReactionPicker=toggleReactionPicker;
  toggleReactionPicker=function(event){
    if(typeof bw119RenderBattleReactionPicker==="function"){
      bw119RenderBattleReactionPicker();
    }
    return BW120_toggleReactionPicker(event);
  };
}

window.addEventListener("DOMContentLoaded",()=>{
  setTimeout(()=>{
    bw120SyncBattleHudPhase();
    if(typeof bw119RenderBattleReactionPicker==="function"){
      bw119RenderBattleReactionPicker();
    }
  },0);
});
