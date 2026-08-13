/* ============================================================
   BEACON WARS v193 · COMMANDER JAMAL

   FUTURE RENAME: edit ONLY displayName below.
   Keep id/profileIconId/asset filenames unchanged so existing saves and
   multiplayer snapshots remain compatible after a visible-name change.
   ============================================================ */
const BW193_COMMANDER_JAMAL={
  id:'jamal',
  profileIconId:'commander_jamal',
  displayName:'Commander Jamal', // <-- FUTURE NAME CHANGE: EDIT THIS VALUE ONLY.
  role:'Starfleet command officer.',
  voice:'jamal',
  piece:'CMD_JAMAL.png',
  redPiece:'RED_CMD_JAMAL.png',
  profile:'PROF_CMD_JAMAL.jpg',
  setupArt:'SETUP_COMMANDER_JAMAL.png',
  profilePhoto:'PROFILE_PHOTO_COMMANDER_JAMAL.png',
  profileCanvas:'PROFILE_CANVAS_PHOTO_COMMANDER_JAMAL.png'
};
window.BW193_COMMANDER_JAMAL=BW193_COMMANDER_JAMAL;

function bw193CommanderName(){
  return BW193_COMMANDER_JAMAL.displayName;
}

if(!commanders.some(c=>c.id===BW193_COMMANDER_JAMAL.id)){
  commanders.push({
    id:BW193_COMMANDER_JAMAL.id,
    name:bw193CommanderName(),
    role:BW193_COMMANDER_JAMAL.role,
    voice:BW193_COMMANDER_JAMAL.voice,
    piece:BW193_COMMANDER_JAMAL.piece,
    redPiece:BW193_COMMANDER_JAMAL.redPiece,
    profile:BW193_COMMANDER_JAMAL.profile
  });
}

BW119_COMMANDER_ART[BW193_COMMANDER_JAMAL.id]=BW193_COMMANDER_JAMAL.setupArt;
PROFILE_ICON_ASSETS[BW193_COMMANDER_JAMAL.profileIconId]=BW193_COMMANDER_JAMAL.profileCanvas;
PROFILE_ICON_NAMES[BW193_COMMANDER_JAMAL.profileIconId]=bw193CommanderName().toUpperCase();

function bw193ApplyVisibleName(){
  const name=bw193CommanderName();
  const upper=name.toUpperCase();
  const profileButton=document.querySelector('[data-profile-icon="commander_jamal"]');
  if(profileButton){
    profileButton.title=upper;
    const img=profileButton.querySelector('img');
    const label=profileButton.querySelector('[data-jamal-name]');
    if(img) img.alt=upper+' profile photo';
    if(label) label.textContent=upper;
  }
}

/* Register after all previous commander/profile wrappers are installed. */
renderCommanders();
bw119UpdateBriefing();
bw193ApplyVisibleName();
updateProfileSelectionButtons(getPlayerProfileData());

window.addEventListener('DOMContentLoaded',()=>{
  bw193ApplyVisibleName();
  renderCommanders();
  bw119UpdateBriefing();
  updateProfileSelectionButtons(getPlayerProfileData());
});
