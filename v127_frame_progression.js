
/* ============================================================
   BEACON WARS v127
   FRAME PROGRESSION
   ============================================================ */

const BW127_BUNDLE_ID="starfleet_officer";

/*
  Approved frame progression:

  Rookie       Default
  Cadet        Complete first match
  Ensign       Level 5
  Lieutenant   Level 10
  Officer      Level 20 / First Officer
  Water        Science Officer achievement
  Tri          Red Alert Veteran achievement
  Bold         Tactical Officer achievement
  Rising       Chief Engineer achievement
  Plum         Beacon Commander achievement
  Wood         Sector Guardian achievement
  Spiral       Holo-Room Ace achievement
  Emergent     Play 3 Online Matches
  Regent       Win 3 Online Matches
  Volt         Win 10 Online Matches
  Commodore    Starfleet Officer Bundle
*/

function bw127BundleOwned(bundleId){
  const data=getPlayerProfileData();
  const owned=Array.isArray(data.ownedBundles) ? data.ownedBundles : [];
  if(owned.includes(bundleId)) return true;

  return false;
}

function bw127FrameRule(frameId,stats=getPlayerStats()){
  const s=stats;
  const level=getPlayerLevel(s);

  switch(frameId){
    case "rookie":
      return {unlocked:true, requirement:"Default", progress:"READY"};

    case "none":
      return {unlocked:true, requirement:"No Frame", progress:"READY"};

    case "cadet":{
      const n=Number(s.matches)||0;
      return {
        unlocked:n>=1,
        requirement:"Complete your first match",
        progress:`${Math.min(n,1)}/1 MATCH`
      };
    }

    case "ensign":
      return {
        unlocked:level>=5,
        requirement:"Reach Level 5",
        progress:`LEVEL ${level}/5`
      };

    case "lieutenant":
      return {
        unlocked:level>=10,
        requirement:"Reach Level 10",
        progress:`LEVEL ${level}/10`
      };

    case "officer":
      return {
        unlocked:level>=20,
        requirement:"Reach Level 20 · First Officer",
        progress:`LEVEL ${level}/20`
      };

    case "water":{
      const n=Number(s.scanReveals)||0;
      return {
        unlocked:n>=25,
        requirement:"Science Officer · Reveal 25 with scans",
        progress:`${Math.min(n,25)}/25 REVEALED`
      };
    }

    case "tri":{
      const n=Number(s.beaconScans)||0;
      return {
        unlocked:n>=5,
        requirement:"Red Alert Veteran · Scan Beacon 5 times",
        progress:`${Math.min(n,5)}/5 BEACON SCANS`
      };
    }

    case "bold":{
      const n=Number(s.eliminations)||0;
      return {
        unlocked:n>=25,
        requirement:"Tactical Officer · Eliminate 25 units",
        progress:`${Math.min(n,25)}/25 ELIMINATIONS`
      };
    }

    case "rising":{
      const n=Number(s.tactics)||0;
      return {
        unlocked:n>=25,
        requirement:"Chief Engineer · Use 25 Tactics",
        progress:`${Math.min(n,25)}/25 TACTICS`
      };
    }

    case "plum":{
      const n=Number(s.beacons)||0;
      return {
        unlocked:n>=25,
        requirement:"Beacon Commander · Capture 25 Beacons",
        progress:`${Math.min(n,25)}/25 BEACONS`
      };
    }

    case "wood":{
      const n=Number(s.commanderSurvivalWins)||0;
      return {
        unlocked:n>=10,
        requirement:"Sector Guardian · 10 Commander-survival wins",
        progress:`${Math.min(n,10)}/10 WINS`
      };
    }

    case "spiral":{
      const n=Number(s.aiWins)||0;
      return {
        unlocked:n>=10,
        requirement:"Holo-Room Ace · Defeat A.I. 10 times",
        progress:`${Math.min(n,10)}/10 A.I. WINS`
      };
    }

    case "emergent":{
      const n=Number(s.onlineMatches)||0;
      return {
        unlocked:n>=3,
        requirement:"Play 3 Online Matches",
        progress:`${Math.min(n,3)}/3 ONLINE MATCHES`
      };
    }

    case "regent":{
      const n=Number(s.onlineWins)||0;
      return {
        unlocked:n>=3,
        requirement:"Win 3 Online Matches",
        progress:`${Math.min(n,3)}/3 ONLINE WINS`
      };
    }

    case "volt":{
      const n=Number(s.onlineWins)||0;
      return {
        unlocked:n>=10,
        requirement:"Win 10 Online Matches",
        progress:`${Math.min(n,10)}/10 ONLINE WINS`
      };
    }

    case "commodore":{
      const owned=bw127BundleOwned(BW127_BUNDLE_ID);
      return {
        unlocked:owned,
        requirement:"Starfleet Officer Bundle",
        progress:owned ? "BUNDLE OWNED" : "SHOP BUNDLE"
      };
    }

    default:
      return {unlocked:false, requirement:"Locked", progress:"LOCKED"};
  }
}

function isProfileFrameUnlocked(frameId,stats=getPlayerStats()){
  return !!bw127FrameRule(frameId,stats).unlocked;
}

/*
  Override v126's temporary "Rookie only" normalization.
  Existing equipped frames stay equipped if the player has actually
  earned them. Otherwise fall back to Rookie.
*/
bw126NormalizePlayerCosmetics=function(){
  const data=getPlayerProfileData();
  let changed=false;

  if(!isProfileFrameUnlocked(data.frame)){
    data.frame="rookie";
    changed=true;
  }

  if(data.icon===BW126_AI_ICON_ID && !bw126AiPhotoUnlocked()){
    data.icon="infiltrator";
    changed=true;
  }

  if(changed) savePlayerProfileData(data);
  return data;
};

/* Real frame selection now obeys the progression rule. */
selectProfileFrame=function(frameId){
  if(!(frameId in PROFILE_FRAME_ASSETS)) return;
  if(!isProfileFrameUnlocked(frameId)) return;

  const data=getPlayerProfileData();
  data.frame=frameId;
  savePlayerProfileData(data);
  loadPlayerProfile();
};

function bw127FrameRequirementText(rule){
  if(rule.unlocked){
    return rule.requirement==="Default" || rule.requirement==="No Frame"
      ? rule.requirement
      : `UNLOCKED · ${rule.requirement}`;
  }
  return `${rule.progress} · ${rule.requirement}`;
}

/*
  v126 still handles the A.I. photo lock. Call it first, then replace
  its temporary Rookie-only frame state with the approved progression.
*/
const BW127_updateProfileSelectionButtons=updateProfileSelectionButtons;
updateProfileSelectionButtons=function(data){
  data=bw126NormalizePlayerCosmetics();

  BW127_updateProfileSelectionButtons(data);

  const stats=getPlayerStats();

  document.querySelectorAll("[data-profile-frame]").forEach(btn=>{
    const id=btn.dataset.profileFrame;
    const rule=bw127FrameRule(id,stats);
    const active=data.frame===id;

    btn.classList.toggle("locked",!rule.unlocked);
    btn.classList.toggle("unlocked",rule.unlocked);
    btn.classList.toggle("active",active);
    btn.disabled=!rule.unlocked;
    btn.title=rule.requirement;

    let requirement=btn.querySelector(".frame-unlock-requirement");
    if(!requirement){
      requirement=document.createElement("small");
      requirement.className="frame-unlock-requirement";
      btn.appendChild(requirement);
    }
    requirement.textContent=bw127FrameRequirementText(rule);

    const state=btn.querySelector("b");
    if(state){
      state.textContent=!rule.unlocked ? "LOCKED" : (active ? "SELECTED" : "SELECT");
    }
  });
};

/* ---------------------------------------------------------
   ONLINE FRAME PROGRESSION
   --------------------------------------------------------- */

/*
  Track completed online matches and wins at the same authoritative
  point where the normal profile match result is recorded.
*/
const BW127_recordProfileMatchResult=recordProfileMatchResult;
recordProfileMatchResult=function(message){
  const wasOnline=!!(
    typeof onlineState!=="undefined" &&
    onlineState &&
    onlineState.enabled
  );

  let onlineWon=false;
  let onlineDraw=false;
  if(wasOnline){
    const msg=String(message||"").toUpperCase();
    const myTeam=
      (typeof playerTeam==="function" && typeof teamLabel==="function")
        ? teamLabel(playerTeam()).toUpperCase()
        : "BLUE";

    onlineDraw=msg.includes("DRAW");
    onlineWon=!onlineDraw && msg.startsWith(myTeam+" ");
  }

  if(wasOnline){
    const s=getPlayerStats();
    s.onlineMatches=(Number(s.onlineMatches)||0)+1;
    if(onlineWon) s.onlineWins=(Number(s.onlineWins)||0)+1;
    else if(!onlineDraw) s.onlineLosses=(Number(s.onlineLosses)||0)+1;
    saveAndRefreshStats(s);
    /* Online battles record only their W/L progression. They never enter the
       general match/XP pipeline. */
    return;
  }
  return BW127_recordProfileMatchResult(message);
};

/* Add online counts to the existing Stats tab. */
const BW127_renderPlayerStats=renderPlayerStats;
renderPlayerStats=function(){
  BW127_renderPlayerStats();

  const s=getPlayerStats();
  const onlineMatches=document.getElementById("profileStatOnlineMatches");
  const onlineWins=document.getElementById("profileStatOnlineWins");
  const onlineLosses=document.getElementById("profileStatOnlineLosses");

  if(onlineMatches) onlineMatches.textContent=Number(s.onlineMatches)||0;
  if(onlineWins) onlineWins.textContent=Number(s.onlineWins)||0;
  if(onlineLosses) onlineLosses.textContent=Number(s.onlineLosses)||0;
};

/*
  Immediate refresh means a frame unlocks as soon as its requirement
  changes, without requiring the player to reopen the profile.
*/
window.addEventListener("DOMContentLoaded",()=>{
  bw126NormalizePlayerCosmetics();
  renderPlayerStats();
  updateProfileSelectionButtons(getPlayerProfileData());
});
