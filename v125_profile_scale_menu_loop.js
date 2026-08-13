
/* ============================================================
   BEACON WARS v125
   Main-menu music loop
   ============================================================ */

const bw125MenuMusic = new Audio(AUDIO_FILES.intro);
bw125MenuMusic.loop = true;
bw125MenuMusic.volume = 0.72;

function bw125StartMenuMusic(){
  if(!settings.music) return;
  bw125MenuMusic.play().catch(()=>{});
}

function bw125StopMenuMusic(){
  bw125MenuMusic.pause();
  bw125MenuMusic.currentTime = 0;
}

/* Command Center now carries both the established room hum and
   the looping menu track. */
const BW125_startCommandCenterAudio = startCommandCenterAudio;
startCommandCenterAudio = function(options={}){
  const result = BW125_startCommandCenterAudio(options);
  bw125StartMenuMusic();
  return result;
};

/* Battle audio takes over cleanly. */
const BW125_startMatchAudio = startMatchAudio;
startMatchAudio = function(){
  bw125StopMenuMusic();
  return BW125_startMatchAudio();
};

/* Title splash remains quiet until the player enters the room. */
const BW125_showTitleMenu = showTitleMenu;
showTitleMenu = function(){
  bw125StopMenuMusic();
  return BW125_showTitleMenu();
};

/* Avoid playing intro.mp3 twice. The old enterCommandCenter()
   fired it once as a one-shot and then started the room audio.
   v125 uses the same file as the looping menu music instead. */
enterCommandCenter = function(){
  const menu=document.getElementById('menu');
  if(!menu) return;

  unlockAudio();
  startCommandCenterAudio({announce:true});

  menu.classList.remove('intro-active');
  commandCameraBusy=false;
  setCommandCamera('center','COMMAND CENTER');
  startHubSimulation();
};

/* MUSIC toggle also controls the new loop. */
const BW125_toggleSetting = toggleSetting;
toggleSetting = function(k){
  const result = BW125_toggleSetting(k);

  if(k==='music'){
    if(!settings.music){
      bw125StopMenuMusic();
    }else{
      const menu=document.getElementById('menu');
      const onMenu=!!(menu && menu.classList.contains('active') && !menu.classList.contains('intro-active'));
      const battleLive=['deploy','player','ai','waiting','commit'].includes(phase);

      if(onMenu && !battleLive){
        bw125StartMenuMusic();
      }
    }
  }
  return result;
};

/* If the browser restores the Command Center screen after a
   visibility change, resume the loop once audio has been unlocked. */
document.addEventListener('visibilitychange',()=>{
  if(document.hidden || !audioBus.unlocked) return;

  const menu=document.getElementById('menu');
  if(menu && menu.classList.contains('active') && !menu.classList.contains('intro-active')){
    bw125StartMenuMusic();
  }
});
