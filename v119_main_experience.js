
/* =========================================================
   BEACON WARS v119 MAIN EXPERIENCE
   Keeps the uploaded v116 battle core intact.
   ========================================================= */

const BW119_XP_RULES={
  matchComplete:25,
  victory:100,
  elimination:10,
  scanReveal:5,
  tactic:10,
  beacon:75,
  commander:75,
  commanderSurvived:25
};

const BW119_REACTIONS={
  hello:{label:"HELLO",asset:"REACTION_HELLO_WHITE.png"},
  bringit:{label:"BRING IT!",asset:"REACTION_BRINGIT_WHITE.png"},
  makeitso:{label:"MAKE IT SO",asset:"REACTION_MAKEITSO_WHITE.png"},
  livelong:{label:"LIVE LONG & PROSPER",asset:"REACTION_LIVELONG_WHITE.png"},
  gg:{label:"GG",asset:"REACTION_GG_WHITE.png"},
  engage:{label:"ENGAGE!",asset:"REACTION_ENGAGE_YELLOW.png"},
  letsfly:{label:"LET'S FLY!",asset:"REACTION_LETSFLY_YELLOW.png"}
};
const BW119_DEFAULT_EQUIPPED=["hello","bringit","makeitso","livelong","gg"];

// Extend battle reaction support without altering the core v110 implementation.
try{
  BW110_REACTIONS.engage="REACTION_ENGAGE_YELLOW.png";
  BW110_REACTIONS.letsfly="REACTION_LETSFLY_YELLOW.png";
}catch(err){}

const BW119_COMMANDER_ART={
  fleet:"SETUP_COMMANDER_FLEET.png",
  mirlock:"SETUP_COMMANDER_MIRLOCK.png",
  naya:"SETUP_COMMANDER_NAYA.png",
  jay:"SETUP_COMMANDER_JAYY.png"
};
const BW119_TACTIC_ART={
  tacticalWarp:"SETUP_TACTIC_WARP.png",
  emergencyShield:"SETUP_TACTIC_SHIELD.png",
  brutalStrike:"SETUP_TACTIC_BRUTAL.png",
  picardManeuver:"SETUP_TACTIC_PICARD.png",
  batleth:"SETUP_TACTIC_BATLETH.png",
  sabotageProtocol:"SETUP_TACTIC_SABOTAGE.png",
  tricorderScan:"SETUP_TACTIC_TRICORDER.png"
};
const BW119_TACTIC_DETAILS={
  batleth:{
    title:"BAT’LETH",
    text:"After moving, the Commander attacks every enemy in the 1-square radius around them."
  },
  picardManeuver:{
    title:"PICARD MANEUVER",
    text:"Move the Commander any distance in a straight line. Once per match."
  },
  tricorderScan:{
    title:"TRICORDER SCAN",
    text:"Reveal 4 spaces in a T-shaped pattern anywhere on the board."
  },
  emergencyShield:{
    title:"EMERGENCY SHIELD",
    text:"Protects the Commander from one otherwise-losing attack, including a bomb attack. The shield is consumed immediately when attacked."
  },
  tacticalWarp:{
    title:"TACTICAL WARP",
    text:"Teleport the Commander up to 3 spaces."
  },
  sabotageProtocol:{
    title:"SABOTAGE PROTOCOL",
    text:"Destroy up to 2 Shield Mines. The Commander gains the Tech Engineer’s mine-disable ability until both charges are used."
  },
  brutalStrike:{
    title:"BRUTAL STRIKE",
    text:"Allows the Commander to move and then attack during the same activation."
  }
};

function bw119RenderTacticDetail(){
  const tactic=currentTactic();
  const detail=BW119_TACTIC_DETAILS[tactic.id]||{
    title:String(tactic.name||"COMMANDER TACTIC").toUpperCase(),
    text:String(tactic.text||"")
  };
  const title=document.getElementById("tacticDetailTitle");
  const text=document.getElementById("tacticDetailText");
  if(title)title.textContent=detail.title;
  if(text)text.textContent=detail.text;
}
window.BW119_TACTIC_DETAILS=BW119_TACTIC_DETAILS;

let bw119MatchXP=null;
function bw119ResetMatchXP(){
  bw119MatchXP={
    matchComplete:0,
    victory:0,
    eliminations:0,
    scans:0,
    tactics:0,
    beacons:0,
    commanders:0,
    commanderSurvived:0
  };
}
bw119ResetMatchXP();

function bw119AddMatchXP(key,amount){
  if(typeof onlineState!=="undefined"&&onlineState.enabled)return;
  if(!bw119MatchXP) bw119ResetMatchXP();
  bw119MatchXP[key]=(Number(bw119MatchXP[key])||0)+(Number(amount)||0);
}

function bw119EnsureProfileData(){
  const data=getPlayerProfileData();
  if(!Array.isArray(data.equippedReactions)){
    data.equippedReactions=[...BW119_DEFAULT_EQUIPPED];
    savePlayerProfileData(data);
  }
  data.equippedReactions=data.equippedReactions
    .filter((id,index,arr)=>BW119_REACTIONS[id] && arr.indexOf(id)===index)
    .slice(0,5);
  if(!data.equippedReactions.length){
    data.equippedReactions=[...BW119_DEFAULT_EQUIPPED];
  }
  savePlayerProfileData(data);
  return data;
}

function bw119RankForLevel(level){
  const ranks=[
    [1,"CADET"],[5,"ENSIGN"],[10,"LIEUTENANT"],[20,"FIRST OFFICER"],
    [30,"COMMANDER"],[40,"CAPTAIN"],[50,"FLEET CAPTAIN"],[60,"COMMODORE"],
    [75,"ADMIRAL"],[100,"FLEET ADMIRAL"]
  ];
  let current=ranks[0];
  for(const row of ranks) if(level>=row[0]) current=row;
  return current;
}
function bw119NextRank(level){
  const ranks=[
    [5,"ENSIGN"],[10,"LIEUTENANT"],[20,"FIRST OFFICER"],[30,"COMMANDER"],
    [40,"CAPTAIN"],[50,"FLEET CAPTAIN"],[60,"COMMODORE"],[75,"ADMIRAL"],[100,"FLEET ADMIRAL"]
  ];
  return ranks.find(row=>row[0]>level)||[100,"FLEET ADMIRAL"];
}

function bw119RenderProfileProgress(){
  const stats=getPlayerStats();
  const progress=typeof getPlayerXPProgress==='function'
    ? getPlayerXPProgress(stats)
    : {level:getPlayerLevel(stats),intoLevel:0,required:XP_PER_LEVEL,percent:0,maxed:false};
  const level=progress.level;
  const rank=bw119RankForLevel(level);
  const next=bw119NextRank(level);

  const fill=document.getElementById("profileProgressFill");
  const levelEl=document.getElementById("profileProgressLevel");
  const xpEl=document.getElementById("profileProgressXPText");
  const nextEl=document.getElementById("profileProgressNext");
  const titleEl=document.getElementById("profileCurrentTitleName");
  const data=getPlayerProfileData();

  if(fill) fill.style.width=progress.percent+"%";
  if(levelEl) levelEl.textContent="LEVEL "+level;
  if(xpEl) xpEl.textContent=(progress.maxed?"MAX":`${progress.intoLevel} / ${progress.required} XP`);
  if(nextEl) nextEl.textContent=progress.maxed ? "MAX ACADEMY LEVEL" : `NEXT RANK: ${next[1]} • LEVEL ${next[0]}`;
  if(titleEl) titleEl.textContent=(PROFILE_TITLE_NAMES[data.title]||rank[1]||"CADET");
}

function bw119ReactionAsset(id){
  return (BW119_REACTIONS[id]||BW119_REACTIONS.hello).asset;
}
function bw119RenderProfileReactions(){
  const data=bw119EnsureProfileData();
  const equipped=data.equippedReactions;
  const slots=document.getElementById("profileEquippedReactionSlots");
  const library=document.getElementById("profileReactionLibrary");
  const chip=document.getElementById("profileReactionCountChip");

  if(chip) chip.textContent=`${equipped.length} / 5 EQUIPPED`;

  if(slots){
    const parts=[];
    for(let i=0;i<5;i++){
      const id=equipped[i];
      if(id){
        const r=BW119_REACTIONS[id];
        parts.push(`<button class="reaction-equipped-slot" type="button" onclick="bw119ToggleReaction('${id}')"><img src="${r.asset}" alt="${r.label}"></button>`);
      }else{
        parts.push(`<div class="reaction-equipped-slot empty">EMPTY SLOT</div>`);
      }
    }
    slots.innerHTML=parts.join("");
  }

  if(library){
    library.innerHTML=Object.entries(BW119_REACTIONS).map(([id,r])=>{
      const active=equipped.includes(id);
      const maxed=equipped.length>=5 && !active;
      return `<button class="reaction-library-card ${active?"equipped":""}" type="button"
        ${maxed?"disabled":""} onclick="bw119ToggleReaction('${id}')">
        <img src="${r.asset}" alt="${r.label}">
        <span>${r.label}</span>
        <b>${active?"EQUIPPED":(maxed?"5/5":"EQUIP")}</b>
      </button>`;
    }).join("");
  }
}
function bw119ToggleReaction(id){
  if(!BW119_REACTIONS[id]) return;
  const data=bw119EnsureProfileData();
  let eq=[...data.equippedReactions];
  const at=eq.indexOf(id);
  if(at>=0) eq.splice(at,1);
  else{
    if(eq.length>=5) return;
    eq.push(id);
  }
  data.equippedReactions=eq;
  savePlayerProfileData(data);
  if(typeof playSound==="function") playSound("beep",{volume:.42});
  bw119RenderProfileReactions();
  bw119RenderBattleReactionPicker();
}
window.bw119ToggleReaction=bw119ToggleReaction;

function bw119RenderBattleReactionPicker(){
  const picker=document.getElementById("reactionPicker");
  if(!picker) return;
  const data=bw119EnsureProfileData();
  const equipped=data.equippedReactions.slice(0,5);
  picker.innerHTML=`
    <div class="reaction-picker-header">
      <strong>EQUIPPED REACTIONS</strong>
      <span>SELECT TO SEND</span>
    </div>
    <div class="reaction-picker-grid">
      ${equipped.map(id=>{
        const r=BW119_REACTIONS[id];
        return `<button type="button" onclick="sendMatchReaction('${id}',event)"><img src="${r.asset}" alt="${r.label}"></button>`;
      }).join("")}
    </div>`;
}

// Replace profile tab router so Reactions is a first-class tab.
showProfileTab=function(tab){
  const ids=["customization","stats","achievements","titles","reactions"];
  if(!ids.includes(tab)) tab="customization";
  ids.forEach(name=>{
    const cap=name.charAt(0).toUpperCase()+name.slice(1);
    const button=document.getElementById("profileTab"+cap);
    const panel=document.getElementById("profilePanel"+cap);
    if(button) button.classList.toggle("active",name===tab);
    if(panel) panel.classList.toggle("active",name===tab);
  });
  if(tab==="stats") renderPlayerStats();
  if(tab==="achievements") renderPlayerAchievements();
  if(tab==="titles") updateProfileSelectionButtons(getPlayerProfileData());
  if(tab==="reactions") bw119RenderProfileReactions();
};

// Wrap existing profile rendering.
const BW119_loadPlayerProfile=loadPlayerProfile;
loadPlayerProfile=function(){
  bw119EnsureProfileData();
  BW119_loadPlayerProfile();
  bw119RenderProfileProgress();
  bw119RenderProfileReactions();
  bw119RenderBattleReactionPicker();
};

const BW119_renderPlayerStats=renderPlayerStats;
renderPlayerStats=function(){
  BW119_renderPlayerStats();
  bw119RenderProfileProgress();
};

// ---------- XP RULES + MATCH RECEIPT ----------
// These replace only progression accounting; battle mechanics remain untouched.
recordProfileTactic=function(amount=1){
  if(typeof onlineState!=="undefined"&&onlineState.enabled)return;
  const n=Math.max(1,Number(amount)||1);
  const s=getPlayerStats();
  s.tactics=(Number(s.tactics)||0)+n;
  const gain=BW119_XP_RULES.tactic*n;
  s.xp=(Number(s.xp)||0)+gain;
  bw119AddMatchXP("tactics",gain);
  saveAndRefreshStats(s);
};
recordProfileSuccessfulScan=function({count=1,beacon=false}={}){
  if(typeof onlineState!=="undefined"&&onlineState.enabled)return;
  const n=Math.max(1,Number(count)||1);
  const s=getPlayerStats();
  s.scans=(Number(s.scans)||0)+n;
  s.scanReveals=(Number(s.scanReveals)||0)+n;
  if(beacon) s.beaconScans=(Number(s.beaconScans)||0)+n;
  const gain=BW119_XP_RULES.scanReveal*n;
  s.xp=(Number(s.xp)||0)+gain;
  bw119AddMatchXP("scans",gain);
  saveAndRefreshStats(s);
};
recordProfileBeaconCapture=function(amount=1){
  if(typeof onlineState!=="undefined"&&onlineState.enabled)return;
  const n=Math.max(1,Number(amount)||1);
  const s=getPlayerStats();
  s.beacons=(Number(s.beacons)||0)+n;
  const gain=BW119_XP_RULES.beacon*n;
  s.xp=(Number(s.xp)||0)+gain;
  bw119AddMatchXP("beacons",gain);
  saveAndRefreshStats(s);
};
recordProfileElimination=function(amount=1){
  if(typeof onlineState!=="undefined"&&onlineState.enabled)return;
  const n=Math.max(1,Number(amount)||1);
  const s=getPlayerStats();
  s.eliminations=(Number(s.eliminations)||0)+n;
  const gain=BW119_XP_RULES.elimination*n;
  s.xp=(Number(s.xp)||0)+gain;
  bw119AddMatchXP("eliminations",gain);
  saveAndRefreshStats(s);
};
recordProfileCommanderCapture=function(){
  if(typeof onlineState!=="undefined"&&onlineState.enabled)return;
  const s=getPlayerStats();
  s.commanders=(Number(s.commanders)||0)+1;
  s.xp=(Number(s.xp)||0)+BW119_XP_RULES.commander;
  bw119AddMatchXP("commanders",BW119_XP_RULES.commander);
  saveAndRefreshStats(s);
};
recordProfileMatchResult=function(message){
  if(typeof onlineState!=="undefined"&&onlineState.enabled)return;
  const s=getPlayerStats();
  s.matches=(Number(s.matches)||0)+1;

  const msg=String(message||"").toUpperCase();
  const myTeam=(typeof playerTeam==="function" && typeof teamLabel==="function")
    ? teamLabel(playerTeam()).toUpperCase()
    : "BLUE";
  const draw=msg.includes("DRAW");
  const won=!draw && msg.startsWith(myTeam+" ");
  const commanderSurvives=profileCommanderSurvives();

  s.xp=(Number(s.xp)||0)+BW119_XP_RULES.matchComplete;
  bw119AddMatchXP("matchComplete",BW119_XP_RULES.matchComplete);

  if(won){
    s.wins=(Number(s.wins)||0)+1;
    s.xp+=BW119_XP_RULES.victory;
    bw119AddMatchXP("victory",BW119_XP_RULES.victory);
    s.winStreak=(Number(s.winStreak)||0)+1;
    s.bestWinStreak=Math.max(Number(s.bestWinStreak)||0,s.winStreak);
    if(profileIsAIMatch()) s.aiWins=(Number(s.aiWins)||0)+1;
    if(commanderSurvives) s.commanderSurvivalWins=(Number(s.commanderSurvivalWins)||0)+1;
    else s.winsWithoutCommander=(Number(s.winsWithoutCommander)||0)+1;
  }else{
    if(!draw) s.losses=(Number(s.losses)||0)+1;
    s.winStreak=0;
  }

  if(commanderSurvives){
    s.xp+=BW119_XP_RULES.commanderSurvived;
    bw119AddMatchXP("commanderSurvived",BW119_XP_RULES.commanderSurvived);
  }

  saveAndRefreshStats(s);
};

function bw119RenderXPReceipt(){
  const box=document.getElementById("matchXPBreakdown");
  const totalEl=document.getElementById("matchXPTotal");
  const receipt=document.getElementById("matchXPReport");
  if(typeof onlineState!=="undefined"&&onlineState.enabled){
    if(receipt)receipt.style.display="none";
    return;
  }
  if(receipt)receipt.style.display="";
  if(!box||!totalEl) return;

  const x=bw119MatchXP||{};
  const rows=[
    ["MATCH COMPLETE","Finish the match",x.matchComplete||0],
    ["VICTORY","Win the battle",x.victory||0],
    ["ENEMY UNITS ELIMINATED","Combat captures",x.eliminations||0],
    ["SUCCESSFUL SCANS","Enemy units revealed by scans",x.scans||0],
    ["TACTICS USED","Commander tactics activated",x.tactics||0],
    ["BEACONS CAPTURED","Enemy Beacon secured",x.beacons||0],
    ["COMMANDERS DEFEATED","Enemy Commander captured",x.commanders||0],
    ["COMMANDER SURVIVED","Your Commander remains in play",x.commanderSurvived||0]
  ];
  const total=rows.reduce((sum,row)=>sum+(Number(row[2])||0),0);
  totalEl.textContent=`+${total} XP`;
  box.innerHTML=rows.map(row=>`
    <div class="match-xp-row">
      <div>${row[0]}<small>${row[1]}</small></div>
      <b>${row[2]?`+${row[2]} XP`:"—"}</b>
    </div>`).join("");

  const s=getPlayerStats();
  const progress=typeof getPlayerXPProgress==='function'
    ? getPlayerXPProgress(s)
    : {level:getPlayerLevel(s),intoLevel:0,required:XP_PER_LEVEL,percent:0,maxed:false};
  const level=progress.level;
  const levelEl=document.getElementById("matchXPLevelLabel");
  const progressText=document.getElementById("matchXPProgressText");
  const fill=document.getElementById("matchXPProgressFill");
  if(levelEl) levelEl.textContent=`LEVEL ${level}`;
  if(progressText) progressText.textContent=progress.maxed?"MAX LEVEL":`${progress.intoLevel} / ${progress.required} XP`;
  if(fill) requestAnimationFrame(()=>fill.style.width=Math.max(0,Math.min(100,progress.percent))+"%");
}

// Wrap result rendering from v110.
const BW119_showMatchResult=showMatchResult;
showMatchResult=function(result,msg){
  BW119_showMatchResult(result,msg);
  bw119RenderXPReceipt();
};

// Reset per-match XP when the battle resets.
const BW119_initGame=initGame;
initGame=function(){
  bw119ResetMatchXP();
  return BW119_initGame();
};

// ---------- PNG-ONLY MISSION SETUP ----------
function bw119SetupTeam(){
  const setupScreen=document.getElementById("setup");
  if(setupScreen) setupScreen.dataset.team=(setup.side===RED?"red":"blue");
}
function bw119UpdateBriefing(){
  bw119SetupTeam();
  const sideEl=document.getElementById("briefingSideValue");
  const commanderEl=document.getElementById("briefingCommanderValue");
  const tacticEl=document.getElementById("briefingTacticValue");
  const commander=currentCommander();
  const tactic=currentTactic();
  if(sideEl) sideEl.textContent=sideLabel(setup.side).toUpperCase();
  if(commanderEl) commanderEl.textContent=String(commander.name||"FLEET COMMANDER").toUpperCase();
  if(tacticEl) tacticEl.textContent=String(tactic.name||"TACTICAL WARP").toUpperCase();
}
renderSides=function(){
  const box=document.getElementById("sideBox");
  if(!box) return;
  if(onlineState.enabled){
    box.innerHTML=`<div class="side-lock">${onlineSummary()}<div class="small-note">Online room locks color choice.</div></div>`;
    return;
  }
  box.innerHTML=[
    {id:BLUE,name:"BLUE ACADEMY",asset:"SETUP_ACADEMY_BLUE.png",cls:"blue"},
    {id:RED,name:"RED ACADEMY",asset:"SETUP_ACADEMY_RED.png",cls:"red"}
  ].map(side=>`
    <button class="bw119-side-png ${side.cls} ${setup.side===side.id?"active":""}" type="button"
      aria-label="${side.name}" data-side="${side.id}">
      <img src="${side.asset}" alt="${side.name}">
    </button>`).join("");
  box.querySelectorAll(".bw119-side-png").forEach(btn=>{
    btn.onclick=()=>{
      setup.side=btn.dataset.side;
      if(typeof playSound==="function") playSound("beep",{volume:.45});
      renderSides();renderCommanders();renderTactics();bw119UpdateBriefing();
    };
  });
  bw119UpdateBriefing();
};
renderCommanders=function(){
  const box=document.getElementById("commanderBox");
  if(!box) return;
  box.innerHTML=commanders.map(c=>`
    <button class="bw119-commander-png ${setup.commander===c.id?"active":""}" type="button"
      aria-label="${c.name}" data-commander="${c.id}">
      <img src="${BW119_COMMANDER_ART[c.id]||c.profile||c.piece}" alt="${c.name}">
    </button>`).join("");
  box.querySelectorAll(".bw119-commander-png").forEach(btn=>{
    btn.onclick=()=>{
      setup.commander=btn.dataset.commander;
      renderCommanders();
      bw119UpdateBriefing();
      const commander=commanders.find(c=>c.id===btn.dataset.commander);
      const voiceKey=String(commander?.voice||'');
      playSound(voiceKey&&AUDIO_FILES[voiceKey]?voiceKey:'commanderConfirmed',{volume:voiceKey ? .95 : .75,delay:voiceKey?120:80});
    };
  });
  bw119UpdateBriefing();
};
renderTactics=function(){
  const box=document.getElementById("tacticBox");
  if(!box) return;
  box.innerHTML=tactics.map(t=>`
    <button class="bw119-tactic-png ${setup.tactic===t.id?"active":""}" type="button"
      aria-label="${t.name}" aria-describedby="tacticDetailText" data-tactic="${t.id}">
      <img src="${BW119_TACTIC_ART[t.id]||"SETUP_TACTIC_WARP.png"}" alt="${t.name}">
    </button>`).join("");
  box.querySelectorAll(".bw119-tactic-png").forEach(btn=>{
    btn.onclick=()=>{
      setup.tactic=btn.dataset.tactic;
      playSound("beep",{volume:.45});
      renderTactics();
      bw119UpdateBriefing();
    };
  });
  bw119RenderTacticDetail();
  bw119UpdateBriefing();
};

// Let the Mission screen announce itself once audio is unlocked.
const BW119_startLocalGameFlow=startLocalGameFlow;
startLocalGameFlow=function(){
  BW119_startLocalGameFlow();
  renderSides();renderCommanders();renderTactics();bw119UpdateBriefing();
  if(typeof playSound==="function") playSound("simulationReady",{volume:.82,delay:450});
};

// Refresh battle reaction picker whenever it opens.
const BW119_toggleReactionPicker=toggleReactionPicker;
toggleReactionPicker=function(event){
  bw119RenderBattleReactionPicker();
  return BW119_toggleReactionPicker(event);
};

window.addEventListener("DOMContentLoaded",()=>{
  setTimeout(()=>{
    bw119EnsureProfileData();
    loadPlayerProfile();
    bw119RenderBattleReactionPicker();
    renderSides();renderCommanders();renderTactics();bw119UpdateBriefing();
  },0);
});
