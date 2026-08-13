
/* ============================================================
   BEACON WARS v132
   VULCAN + KLINGON COMMANDERS
   Commander identity, art, and online synchronization. Shop ownership is
   enforced by the Exchange module loaded later in the release.
   ============================================================ */

const BW132_COMMANDER_PREVIEW_IDS=["vulcan","klingon"];

/* Add the two commander definitions to the existing live commander array. */
if(!commanders.some(c=>c.id==="vulcan")){
  commanders.push({
    id:"vulcan",
    name:"Vulcan Commander",
    role:"Logical command specialist.",
    piece:"CMD_VULCAN.png",
    redPiece:"RED_CMD_VULCAN.png",
    profile:"PROF_CMD_VULCAN.jpg",
    bundlePreview:true
  });
}

/* Existing voiced commanders use the same data-driven selection path as any
   commander added after this module. */
const bw132Mirlock=commanders.find(c=>c.id==="mirlock");
const bw132Jayy=commanders.find(c=>c.id==="jay");
if(bw132Mirlock) bw132Mirlock.voice="mirlock";
if(bw132Jayy) bw132Jayy.voice="jayy";

if(!commanders.some(c=>c.id==="klingon")){
  commanders.push({
    id:"klingon",
    name:"Klingon Commander",
    role:"Close-combat command specialist.",
    piece:"CMD_KLINGON.png",
    redPiece:"RED_CMD_KLINGON.png",
    profile:"PROF_CMD_KLINGON.jpg",
    bundlePreview:true
  });
}

/* Mission-select artwork. */
BW119_COMMANDER_ART.vulcan="SETUP_COMMANDER_VULCAN.png";
BW119_COMMANDER_ART.klingon="SETUP_COMMANDER_KLINGON.png";

/* Register the two bundle profile-photo assets for the Exchange gate. */
PROFILE_ICON_ASSETS.commander_vulcan="PROFILE_CANVAS_PHOTO_COMMANDER_VULCAN.png";
PROFILE_ICON_ASSETS.commander_klingon="PROFILE_CANVAS_PHOTO_COMMANDER_KLINGON.png";
PROFILE_ICON_NAMES.commander_vulcan="VULCAN COMMANDER";
PROFILE_ICON_NAMES.commander_klingon="KLINGON COMMANDER";

function bw132CommanderByChoice(id){
  return commanders.find(c=>c.id===id)||null;
}

/*
  Online snapshots already transmit commanderChoice. Apply the matching
  board piece + console portrait to received Fleet Commander pieces too.
*/
function bw132ApplyCommanderIdentity(piece){
  if(!piece || piece.id!=="FC" || !piece.commanderChoice) return piece;

  const cmd=bw132CommanderByChoice(piece.commanderChoice);
  if(!cmd) return piece;

  piece.name=cmd.name;
  piece.img=commanderPieceForTeam(cmd,piece.team);
  piece.profile=cmd.profile;
  return piece;
}

/* Authoritative online board construction flows through this helper. */
const BW132_pieceFromSyncData=pieceFromSyncData;
pieceFromSyncData=function(data,r,c){
  return bw132ApplyCommanderIdentity(BW132_pieceFromSyncData(data,r,c));
};

/* Initial opponent deployment is built through a separate path. */
const BW132_installOpponentDeployment=installOpponentDeployment;
installOpponentDeployment=function(data){
  const installed=BW132_installOpponentDeployment(data);

  if(installed){
    for(let r=0;r<ROWS;r++){
      for(let c=0;c<COLS;c++){
        const p=board[r][c];
        if(p && p.team===enemyTeam() && p.id==="FC"){
          bw132ApplyCommanderIdentity(p);
        }
      }
    }
    renderBoard();
  }

  return installed;
};

/* Make the Command Console honor the received commander identity as well. */
const BW132_updateConsole=updateConsole;
updateConsole=function(obj){
  if(obj && obj.id==="FC") bw132ApplyCommanderIdentity(obj);
  return BW132_updateConsole(obj);
};

/* The Exchange module replaces this initial registration pass with its
   ownership-aware gate after every module has loaded. */
function bw132EnsurePreviewUnlocked(){
  document.querySelectorAll(
    '[data-commander="vulcan"],[data-commander="klingon"],' +
    '[data-profile-icon="commander_vulcan"],[data-profile-icon="commander_klingon"]'
  ).forEach(el=>{
    el.disabled=false;
    el.classList.remove("locked");
  });
}

window.addEventListener("DOMContentLoaded",()=>{
  bw132EnsurePreviewUnlocked();

  /* v119's setup renderer runs on load too. A zero-delay refresh ensures
     the six-card row includes the two new commanders on every entry path. */
  setTimeout(()=>{
    renderCommanders();
    bw119UpdateBriefing();
    bw132EnsurePreviewUnlocked();
    updateProfileSelectionButtons(getPlayerProfileData());
  },0);
});
