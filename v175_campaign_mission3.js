/* ============================================================
   BEACON WARS v175 · CAMPAIGN MISSION 3: ESCAPE!
   Open-layout revision: scanning identifies which rank should take each lane.
   ============================================================ */
(function(){
  'use strict';

  const SCREEN_ID='campaignMission3';
  const ASSETS={
    target:'campaign_target_specialist_1.png',
    engineer:'campaign_engineer_m2.png',
    security:'campaign_security_m2.png',
    hunter:'campaign_hunter_m2.png',
    scout:'campaign_scout_m2.png',
    mine:'campaign_enemy_mine.png',
    mask:'campaign_BW_token.png',
    maskOpen:'campaign_BW_token_open.png'
  };

  const COLS='ABCDEFGHIJ'.split('');
  const X_BOUNDS=[476,572,669,766,863,960,1057,1153,1250,1347,1443];
  const Y_BOUNDS=[164,262,356,451,545,640,734,829,923];
  const X_CENTERS=X_BOUNDS.slice(0,-1).map((x,i)=>(x+X_BOUNDS[i+1])/2);
  const Y_CENTERS=Y_BOUNDS.slice(0,-1).map((y,i)=>(y+Y_BOUNDS[i+1])/2);

  const BLOCKED=new Set([
    'C8','H8',
    'B7','I7',
    'B6','I6',
    'B5','I5',
    'B4','I4',
    'B3','H3',
    'B2','H2',
    'B1','G1'
  ]);

  const EXTRACTION=new Set(['C1','D1','E1','F1']);

  const MINE_CELLS=[
    'C7','D7','E7','F7','G7','H7',
    'C6','E6','F6','G6','H6',
    'E5','F5',
    'D4','H4',
    'C3','D3','E3','F3','G3',
    'F2','G2',
    'D1','F1'
  ];

  const PLAYER_DEFS=[
    {id:'target',name:'TARGET SPECIALIST',rank:1,coord:'D8',asset:ASSETS.target,scanner:true},
    {id:'engineer',name:'TECH ENGINEER',rank:3,coord:'E8',asset:ASSETS.engineer,engineer:true},
    {id:'security',name:'SECURITY CHIEF',rank:6,coord:'F8',asset:ASSETS.security}
  ];

  const ENEMY_DEFS=[
    {id:'scoutA',name:'SCOUT',rank:1,coord:'D6',asset:ASSETS.scout},
    {id:'hunterA',name:'HUNTER',rank:4,coord:'H5',asset:ASSETS.hunter},
    {id:'hunterB',name:'HUNTER',rank:4,coord:'C4',asset:ASSETS.hunter},
    {id:'scoutB',name:'SCOUT',rank:1,coord:'G4',asset:ASSETS.scout},
    {id:'scoutC',name:'SCOUT',rank:1,coord:'C1',asset:ASSETS.scout},
    {id:'hunterC',name:'HUNTER',rank:4,coord:'E2',asset:ASSETS.hunter}
  ];

  const INITIAL_MINES=MINE_CELLS.length;
  const INITIAL_ENEMIES=ENEMY_DEFS.length;
  const ENEMY_DELAY=430;

  const state={
    players:[],enemies:[],mines:[],
    selectedId:null,scanMode:false,turn:'player',turnNumber:1,
    inputLocked:false,complete:false,failed:false,intel:[],enemyCursor:0,
    successStoryShown:false
  };

  const el=id=>document.getElementById(id);

  function parseCoord(coord){
    const m=/^([A-J])([1-8])$/.exec(String(coord||'').toUpperCase());
    return m?{c:COLS.indexOf(m[1]),r:Number(m[2]),coord:m[1]+m[2]}:null;
  }
  function coordOf(c,r){return (COLS[c]||'?')+String(r)}
  function visualRowIndex(logicalRow){return 8-Number(logicalRow)}
  function centerOf(coord){
    const p=parseCoord(coord);if(!p)return{x:960,y:540};
    return{x:X_CENTERS[p.c],y:Y_CENTERS[visualRowIndex(p.r)]};
  }
  function rectOf(c,r){
    const ri=visualRowIndex(r);
    return{
      left:X_BOUNDS[c],top:Y_BOUNDS[ri],
      width:X_BOUNDS[c+1]-X_BOUNDS[c],
      height:Y_BOUNDS[ri+1]-Y_BOUNDS[ri]
    };
  }
  function manhattan(a,b){
    const A=parseCoord(a),B=parseCoord(b);if(!A||!B)return 999;
    return Math.abs(A.c-B.c)+Math.abs(A.r-B.r);
  }
  function isInside(coord){return !!parseCoord(coord)}
  function isBlocked(coord){return BLOCKED.has(coord)}
  function playerAt(coord){return state.players.find(p=>p.alive!==false&&!p.escaped&&p.coord===coord)||null}
  function enemyAt(coord){return state.enemies.find(p=>p.alive!==false&&p.coord===coord)||null}
  function mineAt(coord){return state.mines.find(p=>p.alive!==false&&p.coord===coord)||null}
  function livingPlayers(){return state.players.filter(p=>p.alive!==false&&!p.escaped)}
  function survivingPlayers(){return state.players.filter(p=>p.alive!==false)}
  function minesRemaining(){return state.mines.filter(m=>m.alive!==false).length}

  function orthogonalNeighbors(coord){
    const p=parseCoord(coord);if(!p)return[];
    return [[0,-1],[-1,0],[1,0],[0,1]]
      .map(([dc,dr])=>[p.c+dc,p.r+dr])
      .filter(([c,r])=>c>=0&&c<10&&r>=1&&r<=8)
      .map(([c,r])=>coordOf(c,r));
  }

  function legalMovesFor(piece){
    if(!piece||piece.alive===false||piece.escaped||state.turn!=='player'||state.inputLocked)return[];
    return orthogonalNeighbors(piece.coord).filter(coord=>{
      if(isBlocked(coord))return false;
      const own=playerAt(coord);
      if(own&&own.id!==piece.id)return false;
      return true;
    });
  }

  /* Target Specialist scans a full two-square radius in every direction,
     including diagonals. Every square receives the same yellow box. */
  function scanAreaCells(){
    const target=state.players.find(p=>p.id==='target'&&p.alive!==false&&!p.escaped);
    if(!target)return[];
    const here=parseCoord(target.coord);if(!here)return[];
    const cells=[];
    for(let dc=-2;dc<=2;dc++){
      for(let dr=-2;dr<=2;dr++){
        if(dc===0&&dr===0)continue;
        const c=here.c+dc,r=here.r+dr;
        if(c<0||c>=10||r<1||r>8)continue;
        cells.push(coordOf(c,r));
      }
    }
    return cells;
  }

  function scanTargets(){
    const area=new Set(scanAreaCells());
    return state.enemies.filter(e=>e.alive!==false&&!e.revealed&&area.has(e.coord)).map(e=>e.coord);
  }

  function buildCells(){
    const host=el('campaignM3HitLayer');if(!host)return;
    host.innerHTML='';
    for(let r=1;r<=8;r++){
      for(let c=0;c<10;c++){
        const coord=coordOf(c,r),box=rectOf(c,r);
        const b=document.createElement('button');
        b.type='button';
        b.className='campaign-m3-cell'+(isBlocked(coord)?' blocked':'')+(EXTRACTION.has(coord)?' extraction':'');
        b.dataset.coordinate=coord;
        b.setAttribute('aria-label','Mission 3 tile '+coord);
        b.style.left=box.left+'px';b.style.top=box.top+'px';
        b.style.width=box.width+'px';b.style.height=box.height+'px';
        b.addEventListener('click',()=>onCell(coord));
        host.appendChild(b);
      }
    }
  }

  function makePiece(piece,type){
    const img=document.createElement('img');
    img.id='campaignM3Piece_'+piece.id;
    img.className='campaign-m3-piece '+type;
    img.alt=piece.name||'';img.draggable=false;
    if(type==='enemy'&&!piece.revealed)img.src=ASSETS.mask;
    else img.src=piece.asset;
    if(type==='enemy'&&piece.revealed)img.classList.add('revealed');
    if(type==='player'&&piece.id===state.selectedId)img.classList.add('selected');
    return img;
  }

  function positionPiece(node,coord){
    const p=centerOf(coord);node.style.left=p.x+'px';node.style.top=p.y+'px';
  }

  function renderPieces(){
    const host=el('campaignM3PieceLayer');if(!host)return;
    host.innerHTML='';

    state.mines.forEach(m=>{
      if(m.alive===false)return;
      const node=document.createElement('img');
      node.id='campaignM3Piece_'+m.id;
      node.className='campaign-m3-piece mine'+(m.revealed?' revealed':' concealed-mine');
      node.alt=m.revealed?'Shield Mine':'Hidden contact';node.draggable=false;
      node.src=m.revealed?ASSETS.mine:ASSETS.mask;
      positionPiece(node,m.coord);host.appendChild(node);
    });

    state.enemies.forEach(e=>{
      if(e.alive===false)return;
      const node=makePiece(e,'enemy');positionPiece(node,e.coord);host.appendChild(node);
    });

    state.players.forEach(p=>{
      if(p.alive===false||p.escaped)return;
      const node=makePiece(p,'player');positionPiece(node,p.coord);host.appendChild(node);
    });
  }

  function selectedPiece(){
    return state.players.find(p=>p.id===state.selectedId&&p.alive!==false&&!p.escaped)||null;
  }

  function refreshCells(){
    const selected=selectedPiece();
    const legal=new Set(!state.scanMode&&selected?legalMovesFor(selected):[]);
    const scanArea=new Set(state.scanMode?scanAreaCells():[]);
    document.querySelectorAll('#campaignMission3 .campaign-m3-cell').forEach(node=>{
      const coord=node.dataset.coordinate;
      node.disabled=state.inputLocked||state.complete||state.failed||state.turn!=='player';
      node.classList.toggle('legal',legal.has(coord));
      node.classList.toggle('scan-range',scanArea.has(coord));
      node.classList.toggle('open',EXTRACTION.has(coord));
    });
  }

  function setStatus(msg){
    const node=el('campaignM3Status');if(node)node.innerHTML=msg;
  }

  function renderIntel(){
    const host=el('campaignM3Intel');if(!host)return;
    if(!state.intel.length){
      host.innerHTML='<div class="campaign-m3-intel-empty">NO CONTACTS IDENTIFIED. Select the Target Specialist and scan any square within 2 spaces.</div>';
      return;
    }
    host.innerHTML=state.intel.slice(-7).map(i=>`
      <div class="campaign-m3-intel-row">
        <img src="${i.asset}" alt="">
        <div><strong>${i.name}</strong><span>${i.coord} · ${i.rank==='HAZARD'?'HAZARD':('RANK '+i.rank)} · ${i.reason}</span></div>
      </div>
    `).join('');
  }

  function renderHud(){
    const mineCount=minesRemaining(),neutralized=INITIAL_MINES-mineCount;
    const mineReadout=el('campaignM3MineReadout');if(mineReadout)mineReadout.textContent=String(neutralized);
    const mineBar=el('campaignM3MineBar');if(mineBar)mineBar.style.width=(neutralized/INITIAL_MINES*100)+'%';
    const scanned=state.enemies.filter(e=>e.revealed&&e.scanRevealed).length;
    const scanReadout=el('campaignM3ScanReadout');if(scanReadout)scanReadout.textContent=scanned+' / '+INITIAL_ENEMIES;

    const p=selectedPiece(),sel=el('campaignM3Selected');
    if(sel)sel.innerHTML=(state.turn==='enemy'?'COMPUTER TURN':('YOUR TURN · '+state.turnNumber))+
      '<strong>'+(p?p.name:(state.turn==='enemy'?'ENEMY PATROL MOVING':'SELECT A BLUE UNIT'))+'</strong>';

    const scanBtn=el('campaignM3ScanBtn');
    if(scanBtn){
      scanBtn.disabled=state.turn!=='player'||state.inputLocked||!p||p.id!=='target';
      scanBtn.textContent=state.scanMode?'CANCEL SCAN':'SCAN CONTACT';
    }
    const survivors=survivingPlayers(),extracted=survivors.filter(unit=>unit.escaped).length;
    const escapeText=document.querySelector('#campaignMission3 .campaign-m3-escape span');
    if(escapeText)escapeText.textContent=`C1 · D1 · E1 · F1. Every surviving crew member must extract · ${extracted}/${survivors.length} aboard.`;
    renderIntel();refreshCells();
  }

  function selectPlayer(coord){
    if(state.turn!=='player'||state.inputLocked)return false;
    const p=playerAt(coord);if(!p)return false;
    state.selectedId=p.id;state.scanMode=false;
    renderPieces();renderHud();
    setStatus('<em>'+p.name+'</em> selected. Choose a highlighted destination.');
    return true;
  }

  function revealEnemy(enemy,reason,scanReveal){
    if(!enemy||enemy.revealed)return;
    enemy.revealed=true;if(scanReveal)enemy.scanRevealed=true;
    if(!state.intel.some(i=>i.id===enemy.id)){
      state.intel.push({id:enemy.id,name:enemy.name,rank:enemy.rank,coord:enemy.coord,asset:enemy.asset,reason});
    }
  }

  function revealMine(mine){
    if(!mine||mine.revealed)return;
    mine.revealed=true;
    if(!state.intel.some(i=>i.id===mine.id)){
      state.intel.push({id:mine.id,name:'SHIELD MINE',rank:'HAZARD',coord:mine.coord,asset:ASSETS.mine,reason:'TARGET SPECIALIST SCAN'});
    }
  }

  function animateReveal(enemy,done){
    const old=el('campaignM3Piece_'+enemy.id);
    state.inputLocked=true;
    if(old){old.src=ASSETS.maskOpen;old.classList.add('revealing')}
    renderHud();
    window.setTimeout(()=>{
      renderPieces();state.inputLocked=false;renderHud();if(done)done();
    },650);
  }

  function removePlayer(p){p.alive=false;if(state.selectedId===p.id)state.selectedId=null}
  function removeEnemy(e){e.alive=false}
  function removeMine(m){m.alive=false}

  function extractPlayer(player){
    if(!player||player.alive===false||player.escaped||!EXTRACTION.has(player.coord))return false;
    player.escaped=true;
    if(state.selectedId===player.id)state.selectedId=null;
    const survivors=survivingPlayers(),extracted=survivors.filter(unit=>unit.escaped).length;
    setStatus('<em>'+player.name+'</em> extracted. '+extracted+'/'+survivors.length+' surviving crew members aboard the Peregrine.');
    try{if(typeof playSound==='function')playSound('teleport',{volume:.72})}catch(err){}
    return true;
  }

  function combatMessage(player,enemy,result){
    if(result==='player')return '<em>'+player.name+'</em> defeated '+enemy.name+' at '+enemy.coord+'.';
    if(result==='tie')return player.name+' and '+enemy.name+' eliminated each other at '+enemy.coord+'.';
    return enemy.name+' defeated '+player.name+' at '+enemy.coord+'.';
  }

  function resolvePlayerEnemyCombat(player,enemy){
    const attackCoord=enemy.coord;
    player.revealed=true;
    const finish=()=>{
      let result='enemy';
      if(player.rank>enemy.rank){result='player';removeEnemy(enemy);player.coord=attackCoord}
      else if(player.rank===enemy.rank){result='tie';removePlayer(player);removeEnemy(enemy)}
      else removePlayer(player);

      const extracted=result==='player'&&extractPlayer(player);
      if(!extracted)setStatus(combatMessage(player,enemy,result));
      renderPieces();afterPlayerAction();
    };
    if(!enemy.revealed){revealEnemy(enemy,'COMBAT',false);animateReveal(enemy,finish)}
    else finish();
  }

  /* APPROVED MINE RULE:
     Engineer clears safely and survives.
     Any other player sacrifices itself, the mine is consumed, and that square
     becomes passable for the surviving team. */
  function resolveMine(player,mine){
    const coord=mine.coord;
    player.revealed=true;
    if(player.engineer){
      removeMine(mine);player.coord=coord;
      if(!extractPlayer(player))setStatus('<em>TECH ENGINEER</em> safely disabled the Shield Mine at '+coord+'.');
    }else{
      removeMine(mine);removePlayer(player);
      setStatus(player.name+' triggered a Shield Mine at '+coord+'. The route is now open.');
    }
    renderPieces();afterPlayerAction();
  }

  function moveSelectedTo(coord){
    const p=selectedPiece();if(!p||!legalMovesFor(p).includes(coord))return false;
    const mine=mineAt(coord);
    if(mine){state.scanMode=false;resolveMine(p,mine);return true}
    const enemy=enemyAt(coord);
    if(enemy){state.scanMode=false;resolvePlayerEnemyCombat(p,enemy);return true}
    p.coord=coord;if(!extractPlayer(p))setStatus('<em>'+p.name+'</em> moved to '+coord+'.');
    state.scanMode=false;renderPieces();afterPlayerAction();return true;
  }

  function doScan(enemy){
    if(!enemy||enemy.revealed)return;
    const target=state.players.find(p=>p.id==='target'&&p.alive!==false&&!p.escaped);
    if(target)target.revealed=true;
    revealEnemy(enemy,'TARGET SPECIALIST SCAN',true);
    state.scanMode=false;
    animateReveal(enemy,()=>{
      setStatus('<em>'+enemy.name+'</em> identified at '+enemy.coord+'. Target Specialist is now revealed to the enemy.');
      afterPlayerAction();
    });
  }

  function onCell(coord){
    if(state.complete||state.failed||state.inputLocked||state.turn!=='player')return;
    if(selectPlayer(coord))return;

    if(state.scanMode){
      const inRange=scanAreaCells().includes(coord);
      if(!inRange){
        state.scanMode=false;renderHud();
        setStatus('Scan cancelled. Target Specialist scans up to 2 squares in every direction.');
        return;
      }

      const enemy=enemyAt(coord),mine=mineAt(coord);
      if(enemy&&!enemy.revealed){doScan(enemy);return}

      const target=state.players.find(p=>p.id==='target'&&p.alive!==false&&!p.escaped);
      if(target)target.revealed=true;

      if(mine&&!mine.revealed){
        revealMine(mine);state.scanMode=false;
        renderPieces();renderHud();
        setStatus('<em>SHIELD MINE</em> identified at '+coord+'. Target Specialist is now revealed to the enemy.');
        afterPlayerAction();return;
      }

      state.scanMode=false;renderHud();
      setStatus('Scan complete at '+coord+'. No hidden contact detected. Target Specialist is now revealed to the enemy.');
      afterPlayerAction();return;
    }

    if(moveSelectedTo(coord))return;
    if(isBlocked(coord))setStatus('MOUNTAIN WALL. Neither side can enter that square.');
  }

  function toggleScan(){
    if(state.complete||state.failed||state.inputLocked||state.turn!=='player')return;
    const p=selectedPiece();
    if(!p||p.id!=='target'){setStatus('Select the <em>TARGET SPECIALIST</em> to scan.');return}
    if(state.scanMode){state.scanMode=false;renderHud();setStatus('Scan cancelled.');return}
    state.scanMode=true;renderHud();
    setStatus('2-SPACE SCAN ACTIVE. Choose ANY yellow square within 2 spaces. Every square is treated the same.');
  }

  function addCredits(amount){
    if(typeof bw135ReadExchange!=='function'||typeof bw135SaveExchange!=='function')return;
    const wallet=bw135ReadExchange();
    wallet.credits=Math.max(0,Number(wallet.credits)||0)+Math.max(0,Number(amount)||0);
    bw135SaveExchange(wallet);
  }

  function markFirstClear(){
    let data={};
    try{data=JSON.parse(localStorage.getItem('beaconWarsV192CampaignProgress')||'{}')||{}}catch(err){}
    const first=!data.mission3;
    data.mission3=true;
    try{localStorage.setItem('beaconWarsV192CampaignProgress',JSON.stringify(data))}catch(err){}
    return first;
  }

  function missionCompleteCheck(){
    const survivors=survivingPlayers();
    if(!survivors.length||!survivors.every(p=>p.escaped))return false;

    state.complete=true;state.inputLocked=true;state.turn='none';
    const first=markFirstClear(),reward=200+(first?150:0);
    addCredits(reward);
    if(typeof awardProfileXP==='function')awardProfileXP(150);

    const bonusAchieved=state.enemies.every(enemy=>enemy.alive===false);
    const showFallbackResult=()=>{
      const ui=window.BW185CampaignUI;
      if(ui&&typeof ui.showCompletion==='function'){
        ui.showCompletion({
          resultId:'campaignM3Result',prefix:'campaignM3',missionId:'mission3',
          xp:150,credits:reward,moves:state.turnNumber,moveTarget:40,
          bonusAchieved,firstClear:first
        });
        return;
      }
      const result=el('campaignM3Result');
      if(!result)return;
      result.classList.remove('failure');
      const kicker=el('campaignM3ResultKicker'),title=el('campaignM3ResultTitle'),
            txt=el('campaignM3ResultText'),rewardEl=el('campaignM3Reward');
      if(kicker)kicker.textContent='STARFLEET CAMPAIGN // MISSION COMPLETE';
      if(title)title.textContent='ESCAPE!';
      if(txt)txt.textContent='Every surviving crew member reached the yellow extraction zone.';
      if(rewardEl)rewardEl.textContent='+'+reward+' CREDITS'+(first?' · FIRST CLEAR BONUS INCLUDED':'');
      result.classList.add('active');
    };
    try{if(typeof playSound==='function')playSound('win',{volume:.85})}catch(err){}
    const story=window.BW180FirstCommandStory;
    const continueToFinale=()=>{
      if(story&&typeof story.onMission3Complete==='function'){
        state.successStoryShown=true;
        story.onMission3Complete(showFallbackResult);
      }else showFallbackResult();
    };
    if(story&&typeof story.showTacticReward==='function'){
      story.showTacticReward('batleth',continueToFinale);
    }else continueToFinale();
    return true;
  }

  function failureCheck(){
    if(state.failed||state.complete)return state.failed;
    if(survivingPlayers().length)return false;
    state.failed=true;state.inputLocked=true;state.turn='none';
    const result=el('campaignM3Result');
    if(result){
      result.classList.add('failure');
      const kicker=el('campaignM3ResultKicker'),title=el('campaignM3ResultTitle'),
            txt=el('campaignM3ResultText'),rewardEl=el('campaignM3Reward');
      if(kicker)kicker.textContent='STARFLEET CAMPAIGN // MISSION FAILED';
      if(title)title.textContent='ESCAPE!';
      if(txt)txt.textContent='The away team was eliminated before reaching the extraction route.';
      if(rewardEl)rewardEl.textContent='NO CREDITS AWARDED';
      result.classList.add('active');
    }
    try{if(typeof playSound==='function')playSound('defeat',{volume:.8})}catch(err){}
    return true;
  }

  function enemyCanEnter(coord,enemyId){
    if(!isInside(coord)||isBlocked(coord)||mineAt(coord))return false;
    const other=enemyAt(coord);
    return !(other&&other.id!==enemyId);
  }

  function legalEnemySteps(enemy){
    return orthogonalNeighbors(enemy.coord).filter(c=>enemyCanEnter(c,enemy.id));
  }

  function enemyRank(enemy){return Number(enemy&&enemy.rank)||0}
  function playerRank(player){return Number(player&&player.rank)||0}
  function enemyCanSafelyBeat(enemy,player){return enemyRank(enemy)>playerRank(player)}

  function nearestTarget(from,targets){
    return targets.slice().sort((a,b)=>manhattan(from,a.coord)-manhattan(from,b.coord))[0]||null;
  }

  function bestStepToward(enemy,target,{allowAttack=true,stopAdjacent=false}={}){
    const steps=legalEnemySteps(enemy);
    if(!steps.length||!target)return null;
    const targetStep=steps.find(c=>c===target.coord);
    if(targetStep&&allowAttack&&!stopAdjacent)return targetStep;
    const nonTarget=steps.filter(c=>c!==target.coord);
    if(!nonTarget.length)return null;
    nonTarget.sort((a,b)=>{
      const da=manhattan(a,target.coord),db=manhattan(b,target.coord);
      if(stopAdjacent){
        const aa=da===1?0:1,ab=db===1?0:1;
        if(aa!==ab)return aa-ab;
      }
      if(da!==db)return da-db;
      return a.localeCompare(b);
    });
    if(stopAdjacent){
      const adjacent=nonTarget.filter(c=>manhattan(c,target.coord)===1);
      if(adjacent.length)return adjacent[0];
    }
    return nonTarget[0]||null;
  }

  /* INFORMATION-AWARE AI:
     Hidden player -> lowest enemy probes first.
     Revealed player -> highest enemy that can safely beat it.
     Known losing/equal enemy -> bluff nearby and do not suicide. */
  function chooseInformationAwareEnemyAction(){
    const enemies=state.enemies.filter(e=>e.alive!==false);
    const players=livingPlayers();
    if(!enemies.length||!players.length)return null;

    const hiddenPlayers=players.filter(p=>!p.revealed);
    const revealedPlayers=players.filter(p=>p.revealed);

    if(hiddenPlayers.length){
      const immediate=[];
      enemies.forEach(enemy=>{
        legalEnemySteps(enemy).forEach(step=>{
          const victim=playerAt(step);
          if(victim&&!victim.revealed)immediate.push({enemy,target:victim,step});
        });
      });
      if(immediate.length){
        immediate.sort((a,b)=>{
          const rankDiff=enemyRank(a.enemy)-enemyRank(b.enemy);
          if(rankDiff!==0)return rankDiff;
          return manhattan(a.enemy.coord,a.target.coord)-manhattan(b.enemy.coord,b.target.coord);
        });
        const pick=immediate[0];
        return{mode:'probe-attack',enemy:pick.enemy,target:pick.target,step:pick.step};
      }

      const probes=enemies.slice().sort((a,b)=>{
        const rankDiff=enemyRank(a)-enemyRank(b);
        if(rankDiff!==0)return rankDiff;
        const ta=nearestTarget(a.coord,hiddenPlayers),tb=nearestTarget(b.coord,hiddenPlayers);
        return manhattan(a.coord,ta?.coord)-manhattan(b.coord,tb?.coord);
      });
      for(const enemy of probes){
        const target=nearestTarget(enemy.coord,hiddenPlayers);
        const step=bestStepToward(enemy,target,{allowAttack:true});
        if(step)return{mode:'probe-move',enemy,target,step};
      }
    }

    if(revealedPlayers.length){
      const safePlans=[];
      revealedPlayers.forEach(target=>{
        enemies.filter(enemy=>enemyCanSafelyBeat(enemy,target)).forEach(enemy=>{
          const step=bestStepToward(enemy,target,{allowAttack:true});
          if(step)safePlans.push({
            mode:step===target.coord?'known-attack':'known-hunt',
            enemy,target,step,rank:enemyRank(enemy),distance:manhattan(enemy.coord,target.coord)
          });
        });
      });
      if(safePlans.length){
        safePlans.sort((a,b)=>{
          if(a.mode!==b.mode)return a.mode==='known-attack'?-1:1;
          if(a.rank!==b.rank)return b.rank-a.rank;
          return a.distance-b.distance;
        });
        return safePlans[0];
      }

      const bluffers=enemies.slice().sort((a,b)=>enemyRank(b)-enemyRank(a));
      for(const enemy of bluffers){
        const target=nearestTarget(enemy.coord,revealedPlayers);
        const step=bestStepToward(enemy,target,{allowAttack:false,stopAdjacent:true});
        if(step)return{mode:'bluff',enemy,target,step};
      }
    }

    for(const enemy of enemies){
      const step=legalEnemySteps(enemy).find(c=>!playerAt(c));
      if(step)return{mode:'patrol',enemy,target:null,step};
    }
    return null;
  }

  function resolveEnemyCombat(enemy,player){
    if(!enemy||!player||enemy.alive===false||player.alive===false){
      state.inputLocked=false;beginPlayerTurn();return;
    }

    const targetCoord=player.coord;
    player.revealed=true;revealEnemy(enemy,'COMBAT',false);

    const finish=()=>{
      const er=enemyRank(enemy),pr=playerRank(player);
      if(er>pr){
        removePlayer(player);enemy.coord=targetCoord;
        setStatus('<em>'+enemy.name+'</em> defeated '+player.name+' at '+targetCoord+'.');
      }else if(er===pr){
        removeEnemy(enemy);removePlayer(player);
        setStatus(enemy.name+' and '+player.name+' eliminated each other at '+targetCoord+'.');
      }else{
        removeEnemy(enemy);
        setStatus(player.name+' defeated '+enemy.name+' at '+targetCoord+'.');
      }

      renderPieces();state.inputLocked=false;
      if(missionCompleteCheck())return;
      if(failureCheck())return;
      beginPlayerTurn();
    };

    const node=el('campaignM3Piece_'+enemy.id);
    if(node&&!node.classList.contains('revealed')){
      state.inputLocked=true;node.src=ASSETS.maskOpen;node.classList.add('revealing');
      window.setTimeout(()=>{renderPieces();finish()},650);
    }else finish();
  }

  function enemyTurn(){
    if(state.complete||state.failed)return;
    state.turn='enemy';state.inputLocked=true;state.scanMode=false;
    renderPieces();renderHud();

    const action=chooseInformationAwareEnemyAction();
    if(!action){state.inputLocked=false;beginPlayerTurn();return}

    window.setTimeout(()=>{
      try{
        const {enemy,step,mode}=action;
        if(!enemy||enemy.alive===false){state.inputLocked=false;beginPlayerTurn();return}

        const victim=playerAt(step);
        if(victim){
          if(victim.revealed&&!enemyCanSafelyBeat(enemy,victim)){
            const bluffStep=bestStepToward(enemy,victim,{allowAttack:false,stopAdjacent:true});
            if(bluffStep){
              enemy.coord=bluffStep;renderPieces();
              setStatus(enemy.revealed
                ?enemy.name+' moved close to a revealed target but refused the losing attack.'
                :'A hidden enemy contact moved close, but did not attack.');
            }
            state.inputLocked=false;
            if(failureCheck())return;
            beginPlayerTurn();return;
          }
          resolveEnemyCombat(enemy,victim);return;
        }

        enemy.coord=step;renderPieces();
        if(mode==='bluff')setStatus(enemy.revealed?enemy.name+' moved into bluffing range without attacking.':'A hidden enemy contact moved close to a revealed crew member.');
        else if(mode==='probe-move')setStatus(enemy.revealed?enemy.name+' is probing an unidentified crew position.':'A hidden enemy contact moved toward an unidentified crew member.');
        else if(mode==='known-hunt')setStatus(enemy.revealed?enemy.name+' is closing on a revealed crew member.':'A hidden enemy contact is closing on a revealed crew member.');
        else setStatus(enemy.revealed?enemy.name+' patrolled to '+step+'.':'A hidden enemy contact moved.');

        state.inputLocked=false;
        if(failureCheck())return;
        beginPlayerTurn();
      }catch(err){
        console.error('Mission 3 enemy turn recovered from error:',err);
        state.inputLocked=false;beginPlayerTurn();
      }
    },ENEMY_DELAY);
  }

  function beginPlayerTurn(){
    if(state.complete||state.failed)return;
    state.turn='player';state.turnNumber++;state.inputLocked=false;

    const current=selectedPiece();
    if(!current){
      state.selectedId=state.players.find(p=>p.alive!==false&&!p.escaped)?.id||null;
    }

    renderPieces();renderHud();
    setStatus('<em>YOUR TURN</em> · Your selected unit remains active until you switch pieces.');
  }

  function afterPlayerAction(){
    // STICKY SELECTION:
    // the same blue unit remains selected after its action and the CPU turn.
    // removePlayer() already clears selectedId if that unit dies.
    state.scanMode=false;
    renderPieces();renderHud();
    if(missionCompleteCheck())return;
    if(failureCheck())return;
    enemyTurn();
  }

  function resetMission(){
    state.players=PLAYER_DEFS.map(p=>({...p,alive:true,escaped:false,revealed:false}));
    state.enemies=ENEMY_DEFS.map(e=>({...e,alive:true,revealed:false,scanRevealed:false}));
    state.mines=MINE_CELLS.map((coord,i)=>({
      id:'mine'+(i+1),name:'SHIELD MINE',coord,asset:ASSETS.mine,alive:true,revealed:false
    }));
    state.selectedId='target';state.scanMode=false;state.turn='player';state.turnNumber=1;
    state.inputLocked=false;state.complete=false;state.failed=false;state.intel=[];state.enemyCursor=0;state.successStoryShown=false;

    const result=el('campaignM3Result');if(result)result.classList.remove('active','failure');
    buildCells();renderPieces();renderHud();
    setStatus('Reach <em>C1 · D1 · E1 · F1</em> with EVERY surviving crew member. Extracted units leave the board and cannot be targeted.');
  }

  function enterMission3(){
    try{
      const story=window.BW180FirstCommandStory;
      if(story&&typeof story.disarmMission3ReturnTeaser==='function')story.disarmMission3ReturnTeaser();
    }catch(err){}
    if(typeof resetOnlineState==='function')resetOnlineState();
    window.BW159RequestedBattleMode='campaign';
    window.BW159RequestedMissionId='mission3';
    try{if(typeof bw125StopMenuMusic==='function')bw125StopMenuMusic()}catch(err){}
    const beginMission=()=>{
      if(typeof showScreen==='function')showScreen(SCREEN_ID);
      try{if(typeof startMatchAudio==='function')startMatchAudio()}catch(err){}
      resetMission();
    };
    const launch=()=>{
      const ui=window.BW185CampaignUI;
      if(ui&&typeof ui.showObjective==='function')ui.showObjective('mission3',beginMission);
      else beginMission();
    };
    if(typeof bw159RunTransition==='function'){
      bw159RunTransition({
        mode:'battle',
        campaign:true,
        kicker:'STARFLEET CAMPAIGN NETWORK',
        title:'MISSION 3 · ESCAPE!',
        sub:'Canyon extraction route loading · Hidden hazards active · Reach the yellow extraction zone...',
        onComplete:launch
      });
    }else launch();
  }

  function leaveMission(){
    state.inputLocked=true;
    if(typeof returnToCommandCenter==='function')returnToCommandCenter();
  }

  window.bw175StartMission3=enterMission3;
  window.bw175ResetMission3=resetMission;
  window.bw175CampaignScan=toggleScan;
  window.bw175CampaignReturn=leaveMission;
  window.bw180ContinueToMission3=function(){
    const story=window.BW180FirstCommandStory;
    if(story&&typeof story.playMission3Intro==='function')story.playMission3Intro(enterMission3);
    else enterMission3();
  };

})();
