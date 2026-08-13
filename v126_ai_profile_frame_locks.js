
/* ============================================================
   BEACON WARS v126
   A.I. profile unlock + random A.I. frames + frame locks
   ============================================================ */

const BW126_AI_ICON_ID="academy_ai";
let bw126AiMatchFrame="rookie";

function bw126FrameIds(){
  return Object.keys(PROFILE_FRAME_ASSETS || {})
    .filter(id=>id!=="none" && !!PROFILE_FRAME_ASSETS[id]);
}

function bw126RollAiFrame(){
  const ids=bw126FrameIds();
  bw126AiMatchFrame=ids.length
    ? ids[Math.floor(Math.random()*ids.length)]
    : "rookie";
  return bw126AiMatchFrame;
}

function bw126AiPhotoUnlocked(stats=getPlayerStats()){
  return (Number(stats.aiWins)||0)>=1;
}

function bw126NormalizePlayerCosmetics(){
  const data=getPlayerProfileData();
  let changed=false;

  /* Rookie is the only player frame unlocked for now. */
  if(data.frame!=="rookie"){
    data.frame="rookie";
    changed=true;
  }

  /* A.I. portrait cannot remain equipped before its unlock. */
  if(data.icon===BW126_AI_ICON_ID && !bw126AiPhotoUnlocked()){
    data.icon="infiltrator";
    changed=true;
  }

  if(changed) savePlayerProfileData(data);
  return data;
}

/* Player frame selection: Rookie only until unlock rules are designed. */
const BW126_selectProfileFrame=selectProfileFrame;
selectProfileFrame=function(frameId){
  if(frameId!=="rookie") return;
  return BW126_selectProfileFrame("rookie");
};

/* A.I. profile photo requires one A.I. victory. */
const BW126_selectProfileIcon=selectProfileIcon;
selectProfileIcon=function(iconId){
  if(iconId===BW126_AI_ICON_ID && !bw126AiPhotoUnlocked()) return;
  return BW126_selectProfileIcon(iconId);
};

/* Add lock state to the existing Customization UI. */
const BW126_updateProfileSelectionButtons=updateProfileSelectionButtons;
updateProfileSelectionButtons=function(data){
  data=bw126NormalizePlayerCosmetics();
  BW126_updateProfileSelectionButtons(data);

  document.querySelectorAll("[data-profile-frame]").forEach(btn=>{
    const id=btn.dataset.profileFrame;
    const unlocked=(id==="rookie");

    btn.classList.toggle("locked",!unlocked);
    btn.disabled=!unlocked;

    const label=btn.querySelector("b");
    if(label){
      label.textContent=
        unlocked
          ? (data.frame==="rookie" ? "SELECTED" : "SELECT")
          : "LOCKED";
    }
  });

  const aiBtn=document.querySelector('[data-profile-icon="academy_ai"]');
  if(aiBtn){
    const unlocked=bw126AiPhotoUnlocked();
    aiBtn.classList.toggle("locked",!unlocked);
    aiBtn.disabled=!unlocked;

    const label=aiBtn.querySelector("b");
    if(label){
      label.textContent=
        !unlocked ? "LOCKED" :
        (data.icon===BW126_AI_ICON_ID ? "SELECTED" : "SELECT");
    }

    const req=aiBtn.querySelector("small");
    if(req) req.textContent=unlocked ? "A.I. VICTORY UNLOCKED" : "DEFEAT THE A.I. ONCE";
  }
};

/*
  Give the A.I. its own photo every A.I. match.
  Frame is rolled once when the match initializes, then remains
  stable for that entire battle.
*/
const BW126_syncMatchIdentityHud=syncMatchIdentityHud;
syncMatchIdentityHud=function(){
  BW126_syncMatchIdentityHud();

  const online=!!(
    typeof onlineState!=="undefined" &&
    onlineState &&
    onlineState.enabled
  );
  if(online) return;

  const opponent={
    callsign:"ACADEMY AI",
    icon:BW126_AI_ICON_ID,
    frame:bw126AiMatchFrame || "rookie",
    title:(typeof bw110AiTitle!=="undefined" ? bw110AiTitle : ""),
    titleFallback:"SIMULATION"
  };

  const oName=document.getElementById("opponentMatchName");
  if(oName) oName.textContent="ACADEMY AI";

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
};

/* Roll a fresh A.I. frame at the beginning of each offline match. */
const BW126_initGame=initGame;
initGame=function(){
  const online=!!(
    typeof onlineState!=="undefined" &&
    onlineState &&
    onlineState.enabled
  );

  if(!online) bw126RollAiFrame();

  bw126NormalizePlayerCosmetics();
  const result=BW126_initGame();
  syncMatchIdentityHud();
  return result;
};

/*
  v119 already increments stats.aiWins for an A.I. victory.
  Refresh the profile immediately afterward so the portrait unlock
  becomes visible as soon as the first computer win is recorded.
*/
const BW126_recordProfileMatchResult=recordProfileMatchResult;
recordProfileMatchResult=function(message){
  const before=getPlayerStats();
  const beforeUnlocked=bw126AiPhotoUnlocked(before);

  const result=BW126_recordProfileMatchResult(message);

  const after=getPlayerStats();
  const afterUnlocked=bw126AiPhotoUnlocked(after);

  if(!beforeUnlocked && afterUnlocked){
    const aiBtn=document.querySelector('[data-profile-icon="academy_ai"]');
    if(aiBtn){
      aiBtn.classList.remove("locked");
      aiBtn.disabled=false;
      const label=aiBtn.querySelector("b");
      if(label) label.textContent="SELECT";
      const req=aiBtn.querySelector("small");
      if(req) req.textContent="A.I. VICTORY UNLOCKED";
    }
  }

  updateProfileSelectionButtons(getPlayerProfileData());
  return result;
};

/* Fresh/legacy saves are normalized on load. */
window.addEventListener("DOMContentLoaded",()=>{
  bw126NormalizePlayerCosmetics();
  updateProfileSelectionButtons(getPlayerProfileData());
});
