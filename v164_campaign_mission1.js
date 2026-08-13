/* ============================================================
   BEACON WARS v164 · CAMPAIGN MISSION 1: BOLDLY GO!
   Campaign-only Stratego mission engine.

   Mission rules locked here:
   • Campaign coordinates are permanently A-J / 1-8, with row 1 at BOTTOM and row 8 at TOP.
   • Player moves once, then the computer moves ONE enemy Rank 9.
   • Standard units move one ORTHOGONAL square.
   • Recon Runner moves any number of OPEN squares in a STRAIGHT
     ORTHOGONAL line. No diagonal movement.
   • Rank 8 sentries and mines do not move in Mission 1.
   • Enemy Rank 9s patrol. If a player comes within detection range,
     the active Rank 9 tries to close the distance.
   • Mines, contacts, X terrain and center rocks block paths.
   • D1-G1 is the bottom escape corridor and stays locked until THREE SOLDIERS are scanned.
   • Campaign pieces are flat top-down puzzle pieces centered inside their squares.
   • The two movable Rank 9s rotate. If both can legally move, the same Rank 9 may NOT move on consecutive computer turns.
   • Only SCANS count toward the objective. Combat reveals do not.
   ============================================================ */
(function(){
  'use strict';

  const SCREEN_ID='campaignMission1';
  const COLS='ABCDEFGHIJ'.split('');

  /* Exact mission_one_bg.png grid in the 1920×1080 stage. */
  const X_BOUNDS=[476,572,669,766,863,960,1057,1153,1250,1347,1443];
  const Y_BOUNDS=[164,262,356,451,545,640,734,829,923];
  const X_CENTERS=X_BOUNDS.slice(0,-1).map((x,i)=>(x+X_BOUNDS[i+1])/2);
  const Y_CENTERS=Y_BOUNDS.slice(0,-1).map((y,i)=>(y+Y_BOUNDS[i+1])/2);

  const ESCAPE_CELLS=new Set(['D1','E1','F1','G1']);
  const REQUIRED_SCANS=3;
  const REQUIRED_ESCAPE_IDS=new Set(['target','recon']);
  const ENEMY_AGGRO_RANGE=4;
  const ENEMY_TURN_DELAY=520;

  /* User-marked X cells plus the three obvious center rock tiles. */
  const BLOCKED=new Set([
    /* Permanent Mission 1 no-movement cells from the annotated A-J / 1-8 map. */
    'C8','H8',
    'B7','I7',
    'A6','I6','J6',
    /* Center rock formation. */
    'F6','F5','E4',
    'A3','J3',
    'B2','I2',
    'C1','H1'
  ]);

  const PLAYER_DEFS=[
    {id:'target',name:'TARGET SPECIALIST',rank:1,coord:'E2',asset:'campaign_target_specialist_1.png',move:'step',scanner:true},
    {id:'recon',name:'RECON RUNNER',rank:2,coord:'F2',asset:'campaign_recon_runner.png',move:'recon'}
  ];

  /* Exact Mission 1 layout from the user's board mockup.
     Rank 9 generals are the ONLY computer-controlled moving pieces.
     Rank 8 brutes are stationary sentries. Mines never move. */
  const CONTACT_DEFS=[
    /* Exact revealed formation from the user's Mission 1 layout reference.
       IMPORTANT: the gold art files were originally named opposite to the
       intended mission ranks. Keep the VISUALS from the reference while the
       Stratego ranks/mechanics stay correct here. */
    {id:'g9a',coord:'D8',kind:'soldier',rank:9,movable:true,name:'GENERAL',asset:'campaign_brute_8.png'},

    {id:'b8a',coord:'C7',kind:'soldier',rank:8,movable:false,name:'BRUTE',asset:'campaign_general_9.png'},
    {id:'m1', coord:'D7',kind:'mine',rank:null,movable:false,name:'SHIELD MINE',asset:'campaign_enemy_mine.png'},
    {id:'g9b',coord:'F7',kind:'soldier',rank:9,movable:true,name:'GENERAL',asset:'campaign_brute_8.png'},
    {id:'m2', coord:'G7',kind:'mine',rank:null,movable:false,name:'SHIELD MINE',asset:'campaign_enemy_mine.png'},
    {id:'b8b',coord:'H7',kind:'soldier',rank:8,movable:false,name:'BRUTE',asset:'campaign_general_9.png'},

    {id:'m3',coord:'C6',kind:'mine',rank:null,movable:false,name:'SHIELD MINE',asset:'campaign_enemy_mine.png'},
    {id:'m4',coord:'D6',kind:'mine',rank:null,movable:false,name:'SHIELD MINE',asset:'campaign_enemy_mine.png'},
    {id:'m5',coord:'E6',kind:'mine',rank:null,movable:false,name:'SHIELD MINE',asset:'campaign_enemy_mine.png'},
    {id:'m6',coord:'G6',kind:'mine',rank:null,movable:false,name:'SHIELD MINE',asset:'campaign_enemy_mine.png'},
    {id:'m7',coord:'H6',kind:'mine',rank:null,movable:false,name:'SHIELD MINE',asset:'campaign_enemy_mine.png'}
  ];

  const state={
    players:[], contacts:[], selectedId:null, scanMode:false,
    soldierScans:0, escaped:new Set(), complete:false, failed:false,
    intel:[], started:false, turn:'player', inputLocked:false,
    enemyCursor:0, lastEnemyId:null, turnNumber:1,
    thirdScanStoryShown:false
  };

  function parseCoord(coord){
    const m=/^([A-J])([1-8])$/.exec(String(coord||'').toUpperCase());
    return m?{c:COLS.indexOf(m[1]),r:Number(m[2]),coord:m[1]+m[2]}:null;
  }
  function coordOf(c,r){return (COLS[c]||'?')+String(r);}
  /* Logical campaign rows count upward from the player's side: row 1 is the
     bottom printed row, row 8 is the top printed row. The background PNG is
     stored top-to-bottom, so every coordinate passes through this conversion. */
  function visualRowIndex(logicalRow){ return 8-Number(logicalRow); }
  function centerOf(coord){
    const p=parseCoord(coord); if(!p)return{x:960,y:540};
    return{x:X_CENTERS[p.c],y:Y_CENTERS[visualRowIndex(p.r)]};
  }
  function rectOf(c,r){
    const ri=visualRowIndex(r);
    return{left:X_BOUNDS[c],top:Y_BOUNDS[ri],width:X_BOUNDS[c+1]-X_BOUNDS[c],height:Y_BOUNDS[ri+1]-Y_BOUNDS[ri]};
  }
  function manhattan(a,b){
    const A=parseCoord(a),B=parseCoord(b);if(!A||!B)return 999;
    return Math.abs(A.c-B.c)+Math.abs(A.r-B.r);
  }
  function isBlocked(coord){return BLOCKED.has(coord);}
  function playerAt(coord){return state.players.find(p=>p.alive!==false&&!p.escaped&&p.coord===coord)||null;}
  function contactAt(coord){return state.contacts.find(p=>p.alive!==false&&p.coord===coord)||null;}
  function ownPlayerBlocks(coord,ignorePlayerId=null){
    const p=playerAt(coord);return !!(p&&p.id!==ignorePlayerId);
  }
  function escapeUnlocked(){return state.soldierScans>=REQUIRED_SCANS;}

  function orthogonalNeighbors(coord){
    const p=parseCoord(coord);if(!p)return[];
    return [[0,-1],[-1,0],[1,0],[0,1]].map(([dc,dr])=>[p.c+dc,p.r+dr])
      .filter(([c,r])=>c>=0&&c<10&&r>=1&&r<=8)
      .map(([c,r])=>coordOf(c,r));
  }

  function playerCanStepInto(coord,piece){
    if(isBlocked(coord))return false;
    if(ESCAPE_CELLS.has(coord)&&!escapeUnlocked())return false;
    if(ownPlayerBlocks(coord,piece.id))return false;
    return true; // enemy contact may be challenged
  }

  function legalMovesFor(piece){
    if(!piece||piece.alive===false||piece.escaped||state.turn!=='player'||state.inputLocked)return[];
    if(piece.move==='step'){
      return orthogonalNeighbors(piece.coord).filter(c=>playerCanStepInto(c,piece));
    }

    /* Recon Runner: straight line only, exactly like the core game.
       The first enemy contact in a ray may be challenged, but cannot
       be passed through. */
    const p=parseCoord(piece.coord); if(!p)return[];
    const out=[];
    const dirs=[[0,-1],[-1,0],[1,0],[0,1]];
    dirs.forEach(([dc,dr])=>{
      let c=p.c+dc,r=p.r+dr;
      while(c>=0&&c<10&&r>=1&&r<=8){
        const coord=coordOf(c,r);
        if(isBlocked(coord)||(ESCAPE_CELLS.has(coord)&&!escapeUnlocked())||ownPlayerBlocks(coord,piece.id))break;
        const enemy=contactAt(coord);
        out.push(coord);
        if(enemy)break;
        c+=dc;r+=dr;
      }
    });
    return out;
  }

  function scanTargets(){
    const target=state.players.find(p=>p.id==='target'&&p.alive!==false&&!p.escaped); if(!target)return[];
    const here=parseCoord(target.coord); if(!here)return[];
    return state.contacts.filter(c=>c.alive!==false&&!c.revealed).filter(c=>{
      const there=parseCoord(c.coord);
      /* Scan up to two spaces away, including diagonals. */
      return Math.max(Math.abs(there.c-here.c),Math.abs(there.r-here.r))<=2;
    }).map(c=>c.coord);
  }

  function buildCells(){
    const host=document.getElementById('campaignM1HitLayer');if(!host)return;
    host.innerHTML='';
    for(let r=1;r<=8;r++)for(let c=0;c<10;c++){
      const coord=coordOf(c,r),box=rectOf(c,r);
      const b=document.createElement('button');
      b.type='button';
      b.className='campaign-cell'+(isBlocked(coord)?' blocked':'');
      b.dataset.coordinate=coord;
      b.setAttribute('aria-label','Mission tile '+coord);
      b.style.left=box.left+'px';b.style.top=box.top+'px';b.style.width=box.width+'px';b.style.height=box.height+'px';
      b.addEventListener('click',()=>onCell(coord));
      host.appendChild(b);
    }
  }

  function makePiece(piece,kind){
    const img=document.createElement('img');
    img.id='campaignM1Piece_'+piece.id;
    img.className='campaign-piece '+kind;
    img.alt=piece.name||'';
    img.draggable=false;
    const hidden=kind==='enemy-contact'&&!piece.revealed;
    img.src=hidden?'campaign_BW_token.png':piece.asset;
    if(hidden)img.classList.add('hidden-contact');
    return img;
  }
  function positionPiece(el,coord){
    const p=centerOf(coord);el.style.left=p.x+'px';el.style.top=p.y+'px';
  }
  function renderPieces(){
    const host=document.getElementById('campaignM1PieceLayer');if(!host)return;
    host.innerHTML='';
    state.contacts.forEach(contact=>{
      if(contact.alive===false)return;
      const el=makePiece(contact,'enemy-contact');
      if(contact.revealed)el.classList.add('revealed');
      positionPiece(el,contact.coord);host.appendChild(el);
    });
    state.players.forEach(piece=>{
      if(piece.alive===false||piece.escaped)return;
      const el=makePiece(piece,'player-piece');
      if(piece.id===state.selectedId)el.classList.add('selected');
      positionPiece(el,piece.coord);host.appendChild(el);
    });
  }

  function refreshCellStates(){
    const selected=state.players.find(p=>p.id===state.selectedId&&p.alive!==false&&!p.escaped)||null;
    const legal=new Set(!state.scanMode&&selected?legalMovesFor(selected):[]);
    const scans=new Set(state.scanMode?scanTargets():[]);
    document.querySelectorAll('#campaignM1HitLayer .campaign-cell').forEach(el=>{
      const coord=el.dataset.coordinate;
      el.disabled=state.inputLocked||state.complete||state.failed;
      el.classList.toggle('legal',legal.has(coord));
      el.classList.toggle('scan-target',scans.has(coord));
      el.classList.toggle('escape-locked',ESCAPE_CELLS.has(coord)&&!escapeUnlocked());
      el.classList.toggle('escape-open',ESCAPE_CELLS.has(coord)&&escapeUnlocked());
    });
  }

  function setStatus(text){const el=document.getElementById('campaignM1Status');if(el)el.innerHTML=text;}
  function renderHud(){
    const selected=state.players.find(p=>p.id===state.selectedId&&p.alive!==false&&!p.escaped)||null;
    const sel=document.getElementById('campaignM1Selected');
    if(sel){
      const turnLabel=state.turn==='enemy'?'COMPUTER TURN':`YOUR TURN · ${state.turnNumber}`;
      sel.innerHTML=`${turnLabel}<strong>${selected?selected.name:(state.turn==='enemy'?'RANK 9 MOVING':'SELECT A BLUE UNIT')}</strong>`;
    }
    for(let i=1;i<=3;i++){
      const pip=document.getElementById('campaignM1Pip'+i);if(pip)pip.classList.toggle('on',state.soldierScans>=i);
    }
    const count=document.getElementById('campaignM1ScanCount');if(count)count.textContent=state.soldierScans+' / '+REQUIRED_SCANS+' SOLDIERS IDENTIFIED';
    const escape=document.getElementById('campaignM1Escape');
    if(escape){
      escape.classList.toggle('open',escapeUnlocked());
      const b=escape.querySelector('b'),s=escape.querySelector('span');
      if(b)b.textContent=escapeUnlocked()?'ESCAPE CORRIDOR OPEN':'ESCAPE CORRIDOR LOCKED';
      if(s)s.textContent=escapeUnlocked()?'Move Target Specialist and Recon Runner into D1, E1, F1, or G1.':'D1 · E1 · F1 · G1 unlock after 3 enemy soldiers are scanned.';
    }
    const scan=document.getElementById('campaignM1ScanBtn');
    if(scan){
      scan.disabled=state.turn!=='player'||state.inputLocked||!selected||selected.id!=='target'||state.complete||state.failed||scanTargets().length===0;
      scan.textContent=state.scanMode?'CANCEL SCAN':'SCAN CONTACT';
    }
    renderIntel();
    refreshCellStates();
  }

  function renderIntel(){
    const list=document.getElementById('campaignM1IntelList');if(!list)return;
    if(!state.intel.length){list.innerHTML='<div class="campaign-intel-empty">NO CONTACTS IDENTIFIED. Use the Target Specialist to scan hidden BW contacts.</div>';return;}
    list.innerHTML=state.intel.map(item=>`<div class="campaign-intel-row"><img src="${item.asset}" alt=""><div><strong>${item.kind==='soldier'?'ENEMY SOLDIER':'MINE DETECTED'}</strong><span>${item.name} · ${item.coord}${item.kind==='soldier'?' · COUNTS TOWARD OBJECTIVE':''}</span></div></div>`).join('');
  }

  function selectPlayerAt(coord){
    if(state.turn!=='player'||state.inputLocked)return false;
    const p=playerAt(coord);if(!p)return false;
    state.selectedId=p.id;state.scanMode=false;
    renderPieces();renderHud();
    setStatus(`<em>${p.name}</em> selected. ${p.move==='recon'?'Straight lines only. ':''}Choose a highlighted destination${p.scanner?' or use SCAN CONTACT':''}.`);
    return true;
  }

  function removePlayer(piece){
    if(!piece)return;
    piece.alive=false;
    if(piece.id===state.selectedId)state.selectedId=null;
  }
  function removeContact(contact){if(contact)contact.alive=false;}

  function revealForCombat(contact){
    if(!contact||contact.revealed)return;
    contact.revealed=true;
  }

  function combatTextPlayer(piece,contact,result){
    if(contact.kind==='mine')return `${piece.name} hit a SHIELD MINE at ${contact.coord}.`;
    if(result==='player')return `${piece.name} defeated ${contact.name} at ${contact.coord}.`;
    if(result==='tie')return `${piece.name} and ${contact.name} eliminated each other at ${contact.coord}.`;
    return `${contact.name} defeated ${piece.name} at ${contact.coord}.`;
  }

  function resolvePlayerChallenge(piece,contact){
    const attackCoord=contact.coord;
    piece.revealed=true;
    revealForCombat(contact);
    state.inputLocked=true;
    renderPieces();renderHud();
    try{if(typeof playSound==='function')playSound('attack',{volume:.78});}catch(err){}

    window.setTimeout(()=>{
      let result='enemy';
      if(contact.kind==='mine'){
        removePlayer(piece);
        try{if(typeof playSound==='function')playSound('bomb',{volume:.78});}catch(err){}
      }else if(piece.rank>contact.rank){
        result='player'; removeContact(contact); piece.coord=attackCoord;
      }else if(piece.rank===contact.rank){
        result='tie'; removePlayer(piece); removeContact(contact);
      }else{
        removePlayer(piece);
      }
      setStatus(combatTextPlayer(piece,contact,result));
      renderPieces();
      if(checkMissionFailure())return;
      finishPlayerAction();
    },650);
  }

  function moveSelectedTo(coord){
    const piece=state.players.find(p=>p.id===state.selectedId&&p.alive!==false&&!p.escaped);if(!piece)return false;
    if(!legalMovesFor(piece).includes(coord))return false;

    const enemy=contactAt(coord);
    if(enemy){
      state.scanMode=false;
      resolvePlayerChallenge(piece,enemy);
      return true;
    }

    piece.coord=coord;
    if(ESCAPE_CELLS.has(coord)&&escapeUnlocked()&&REQUIRED_ESCAPE_IDS.has(piece.id)){
      piece.escaped=true;state.escaped.add(piece.id);
      setStatus(`<em>${piece.name}</em> reached the escape corridor. ${state.escaped.size}/2 mission personnel extracted.`);
      playFx('teleport');
    }else{
      setStatus(`<em>${piece.name}</em> moved to ${coord}. Computer response incoming.`);
      playFx('move_piece');
    }
    state.scanMode=false;
    renderPieces();renderHud();
    if(checkComplete())return true;
    finishPlayerAction();
    return true;
  }

  function revealContact(contact){
    if(!contact||contact.revealed||state.inputLocked)return;
    const scanner=state.players.find(p=>p.id==='target'&&p.alive!==false&&!p.escaped);
    if(scanner)scanner.revealed=true;
    const el=document.getElementById('campaignM1Piece_'+contact.id);
    state.inputLocked=true;
    if(el){el.src='campaign_BW_token_open.png';el.classList.add('revealing');}
    playFx('scanner');
    renderHud();

    window.setTimeout(()=>{
      contact.revealed=true;
      /* Keep counting after the required third scan so the fourth-scan bonus
         shown on the objective card can actually be earned. */
      if(contact.kind==='soldier')state.soldierScans++;
      state.intel.push({kind:contact.kind,name:contact.name,asset:contact.asset,coord:contact.coord});
      if(typeof recordProfileSuccessfulScan==='function')recordProfileSuccessfulScan({count:1,beacon:false});
      renderPieces();renderHud();
      if(contact.kind==='soldier'){
        setStatus(`<em>${contact.name}</em> identified at ${contact.coord}. Soldier scan ${state.soldierScans}/${REQUIRED_SCANS}.${escapeUnlocked()?' Escape corridor unlocked.':''}`);
      }else{
        setStatus(`<em>SHIELD MINE</em> identified at ${contact.coord}. Mines do not count toward the 3-soldier objective.`);
      }
      state.scanMode=false;
      if(contact.kind==='soldier'&&state.soldierScans===REQUIRED_SCANS&&!state.thirdScanStoryShown){
        state.thirdScanStoryShown=true;
        state.inputLocked=true;
        renderHud();
        const resume=()=>{
          if(checkComplete())return;
          finishPlayerAction();
        };
        const story=window.BW180FirstCommandStory;
        if(story&&typeof story.onThirdScan==='function')story.onThirdScan(resume);
        else resume();
        return;
      }
      if(checkComplete())return;
      finishPlayerAction();
    },720);
  }

  function onCell(coord){
    if(state.complete||state.failed||state.inputLocked||state.turn!=='player')return;
    if(selectPlayerAt(coord))return;
    if(state.scanMode){
      const target=contactAt(coord);
      if(target&&!target.revealed&&scanTargets().includes(coord)){revealContact(target);return;}
      state.scanMode=false;renderHud();setStatus('Scan cancelled. Select the Target Specialist and try again.');return;
    }
    if(moveSelectedTo(coord))return;
    if(isBlocked(coord))setStatus('NON-MOVEMENT AREA. Choose a corridor square.');
    else if(ESCAPE_CELLS.has(coord)&&!escapeUnlocked())setStatus('ESCAPE CORRIDOR LOCKED. Identify 3 enemy soldiers first.');
  }

  function toggleScan(){
    if(state.complete||state.failed||state.inputLocked||state.turn!=='player')return;
    const selected=state.players.find(p=>p.id===state.selectedId&&p.alive!==false&&!p.escaped);
    if(!selected||selected.id!=='target'){setStatus('Select the TARGET SPECIALIST to scan contacts.');return;}
    const targets=scanTargets();
    if(!targets.length){setStatus('No hidden contact is within the Target Specialist\'s 2-space scan range.');return;}
    state.scanMode=!state.scanMode;
    renderHud();
    setStatus(state.scanMode?'SCAN ACTIVE. Select a highlighted hidden BW contact.':'Scan cancelled.');
  }

  /* --------------------------- ENEMY TURN --------------------------- */
  function enemyCellOpen(coord,enemyId){
    /* Escape cells are a PLAYER objective lock. Enemy movement remains governed
       by terrain and occupied squares, so the bottom extraction strip does not
       become an invisible wall for a chasing Rank 9. */
    if(isBlocked(coord))return false;
    const enemy=contactAt(coord);
    if(enemy&&enemy.id!==enemyId)return false; // mines/sentries/other 9s form walls
    return true;
  }

  function legalEnemySteps(enemy){
    if(!enemy||enemy.alive===false||!enemy.movable||enemy.rank!==9)return[];
    return orthogonalNeighbors(enemy.coord).filter(c=>enemyCellOpen(c,enemy.id));
  }

  function livingPlayers(){return state.players.filter(p=>p.alive!==false&&!p.escaped);}

  function chooseAggroTarget(enemy){
    const live=livingPlayers();
    const hidden=live.filter(p=>!p.revealed)
      .map(p=>({p,d:manhattan(enemy.coord,p.coord)})).sort((a,b)=>a.d-b.d);
    if(hidden.length&&hidden[0].d<=ENEMY_AGGRO_RANGE)return hidden[0].p;

    const known=live.filter(p=>p.revealed)
      .map(p=>({p,d:manhattan(enemy.coord,p.coord)})).sort((a,b)=>a.d-b.d);
    if(known.length&&known[0].d<=ENEMY_AGGRO_RANGE)return known[0].p;
    return null;
  }

  function stepScore(enemy,coord,target){
    let score=0;
    if(target)score-=manhattan(coord,target.coord)*100;
    /* Slight preference for forward/down-board movement while patrolling,
       then center lanes. Keeps patrol purposeful without omniscience. */
    const p=parseCoord(coord);
    score+=p.r*4;
    score-=Math.abs(p.c-4.5)*1.5;
    return score;
  }

  function chooseEnemyStep(enemy){
    const steps=legalEnemySteps(enemy);if(!steps.length)return null;
    const target=chooseAggroTarget(enemy);
    const attackSteps=steps.filter(c=>!!playerAt(c));
    if(attackSteps.length){
      if(target&&attackSteps.includes(target.coord))return{coord:target.coord,target,aggro:true};
      const p=playerAt(attackSteps[0]);return{coord:attackSteps[0],target:p,aggro:true};
    }
    const ranked=steps.map(c=>({coord:c,score:stepScore(enemy,c,target)})).sort((a,b)=>b.score-a.score);
    if(target){
      const current=manhattan(enemy.coord,target.coord);
      const closer=ranked.filter(s=>manhattan(s.coord,target.coord)<current);
      if(closer.length)return{coord:closer[0].coord,target,aggro:true};
    }
    /* Patrol one legal square when nobody is in range. Alternate direction
       choices through enemyCursor so the same 9 does not jitter in place. */
    const pick=ranked[state.turnNumber%ranked.length]||ranked[0];
    return{coord:pick.coord,target:null,aggro:false};
  }

  function selectEnemyNine(){
    /* Only the two Rank 9 Generals are movable in Mission 1.
       Fair-rotation rule: if more than one General has a legal move,
       the General that moved last turn MUST sit out this turn. */
    const allMovers=state.contacts.filter(c=>
      c.alive!==false &&
      c.kind==='soldier' &&
      c.rank===9 &&
      c.movable
    );

    if(!allMovers.length){
      state.lastEnemyId=null;
      return null;
    }

    const canMove=allMovers.filter(e=>legalEnemySteps(e).length>0);
    if(!canMove.length)return allMovers[0]||null;

    let pool=canMove;

    if(state.lastEnemyId && canMove.length>1){
      const alternate=canMove.filter(e=>e.id!==state.lastEnemyId);
      if(alternate.length)pool=alternate;
    }

    /* Within the forced rotation, an enemy that currently has a valid aggro
       target may still pursue it. Rotation decides WHO gets the turn;
       normal AI decides WHERE that General moves. */
    const aggro=pool
      .map(e=>({e,t:chooseAggroTarget(e)}))
      .filter(x=>x.t)
      .sort((a,b)=>
        manhattan(a.e.coord,a.t.coord)-manhattan(b.e.coord,b.t.coord)
      );

    let enemy=null;

    if(aggro.length){
      enemy=aggro[0].e;
    }else{
      enemy=pool[state.enemyCursor % pool.length];
      state.enemyCursor=(state.enemyCursor+1)%Math.max(1,pool.length);
    }

    if(enemy)state.lastEnemyId=enemy.id;
    return enemy;
  }

  function resolveEnemyChallenge(enemy,player){
    const targetCoord=player.coord;
    player.revealed=true;
    enemy.revealed=true; // combat always reveals the attacker
    state.inputLocked=true;
    renderPieces();renderHud();
    try{if(typeof playSound==='function')playSound('batleth',{volume:.82});}catch(err){
      try{if(typeof playSound==='function')playSound('attack',{volume:.78});}catch(_err){}
    }
    window.setTimeout(()=>{
      let message='';
      if(enemy.rank>player.rank){
        removePlayer(player);enemy.coord=targetCoord;
        message=`${enemy.name} challenged ${player.name} at ${targetCoord}. ${player.name} was eliminated.`;
      }else if(enemy.rank===player.rank){
        removePlayer(player);removeContact(enemy);
        message=`${enemy.name} and ${player.name} eliminated each other at ${targetCoord}.`;
      }else{
        removeContact(enemy);
        message=`${player.name} held the corridor and defeated ${enemy.name} at ${targetCoord}.`;
      }
      renderPieces();
      setStatus(message);
      if(checkMissionFailure())return;
      endEnemyTurn();
    },650);
  }

  function runEnemyTurn(){
    if(state.complete||state.failed)return;
    state.turn='enemy';state.inputLocked=true;state.scanMode=false;
    renderHud();
    setStatus('<em>COMPUTER TURN</em> · One enemy Rank 9 is moving. Mobile Generals rotate whenever both can move.');

    window.setTimeout(()=>{
      const enemy=selectEnemyNine();
      if(!enemy){endEnemyTurn();return;}
      const choice=chooseEnemyStep(enemy);
      if(!choice){
        setStatus(`<em>${enemy.name}</em> is boxed in by terrain, mines, or other units.`);
        endEnemyTurn();return;
      }
      const defender=playerAt(choice.coord);
      if(defender){resolveEnemyChallenge(enemy,defender);return;}
      enemy.coord=choice.coord;
      renderPieces();
      setStatus(choice.aggro
        ? `<em>${enemy.name}</em> moved to ${choice.coord} and is closing on your team.`
        : `<em>${enemy.name}</em> patrolled to ${choice.coord}.`);
      playFx('move_piece');
      window.setTimeout(endEnemyTurn,360);
    },ENEMY_TURN_DELAY);
  }

  function endEnemyTurn(){
    if(state.complete||state.failed)return;
    state.turn='player';state.inputLocked=false;state.turnNumber++;
    const selected=state.players.find(p=>p.id===state.selectedId&&p.alive!==false&&!p.escaped);
    if(!selected)state.selectedId=state.players.find(p=>p.alive!==false&&!p.escaped)?.id||null;
    renderPieces();renderHud();
    setStatus('<em>YOUR TURN</em> · Move one piece or scan one contact. Recon Runner travels in straight lines only.');
  }

  function finishPlayerAction(){
    if(state.complete||state.failed)return;
    state.inputLocked=true;
    renderHud();
    window.setTimeout(runEnemyTurn,250);
  }

  function playFx(name){
    try{
      if(name==='scanner'&&typeof playSound==='function')playSound('scanner',{volume:.8});
      else if(name==='move_piece'&&typeof playSound==='function')playSound('movePiece',{volume:.55});
      else if(name==='teleport'&&typeof playSound==='function')playSound('teleport',{volume:.72});
    }catch(err){}
  }

  function addCredits(amount){
    if(typeof bw135ReadExchange!=='function'||typeof bw135SaveExchange!=='function')return;
    const wallet=bw135ReadExchange();
    wallet.credits=Math.max(0,Number(wallet.credits)||0)+Math.max(0,Number(amount)||0);
    bw135SaveExchange(wallet);
  }
  function markFirstClear(){
    let data={};
    try{data=JSON.parse(localStorage.getItem('beaconWarsV192CampaignProgress')||'{}')||{};}catch(err){}
    const first=!data.mission1;
    data.mission1=true;
    try{localStorage.setItem('beaconWarsV192CampaignProgress',JSON.stringify(data));}catch(err){}
    return first;
  }

  function showResult({failure=false,title,text,reward}){
    const result=document.getElementById('campaignM1Result');if(!result)return;
    result.classList.toggle('failure',failure);
    const kicker=document.getElementById('campaignM1ResultKicker');
    const titleEl=document.getElementById('campaignM1ResultTitle');
    const textEl=document.getElementById('campaignM1ResultText')||result.querySelector('p');
    const rewardEl=document.getElementById('campaignM1Reward');
    if(kicker)kicker.textContent=failure?'STARFLEET CAMPAIGN // MISSION FAILED':'STARFLEET CAMPAIGN // MISSION COMPLETE';
    if(titleEl)titleEl.textContent=title;
    if(textEl)textEl.textContent=text;
    if(rewardEl)rewardEl.textContent=reward;
    result.classList.add('active');
  }

  function checkMissionFailure(){
    if(state.failed||state.complete)return state.failed;
    const target=state.players.find(p=>p.id==='target');
    const recon=state.players.find(p=>p.id==='recon');
    if((target&&target.alive===false)||(recon&&recon.alive===false)){
      state.failed=true;state.inputLocked=true;state.turn='none';
      showResult({
        failure:true,
        title:'MISSION FAILED',
        text:'The reconnaissance team was compromised before the scan data could be extracted.',
        reward:'NO CREDITS AWARDED'
      });
      try{if(typeof playSound==='function')playSound('defeat',{volume:.8});}catch(err){}
      renderHud();
      return true;
    }
    return false;
  }

  function checkComplete(){
    if(state.complete||state.failed||!escapeUnlocked())return false;
    const allEscaped=[...REQUIRED_ESCAPE_IDS].every(id=>state.escaped.has(id));
    if(!allEscaped)return false;
    state.complete=true;state.inputLocked=true;state.turn='none';
    const first=markFirstClear();
    const reward=100+(first?150:0);
    addCredits(reward);
    if(typeof awardProfileXP==='function')awardProfileXP(100);
    setStatus('MISSION COMPLETE. Target Specialist and Recon Runner extracted with the scan data.');
    try{if(typeof playSound==='function')playSound('win',{volume:.85});}catch(err){}
    const showCompletionResult=()=>{
      const ui=window.BW185CampaignUI;
      if(ui&&typeof ui.showCompletion==='function'){
        ui.showCompletion({
          resultId:'campaignM1Result',prefix:'campaignM1',missionId:'mission1',
          xp:100,credits:reward,moves:state.turnNumber,moveTarget:22,
          bonusAchieved:state.soldierScans>=4,firstClear:first
        });
      }else showResult({
        failure:false,
        title:'BOLDLY GO!',
        text:'Three enemy soldiers identified. Reconnaissance data secured and the survey team extracted.',
        reward:`+${reward} CREDITS${first?' · FIRST CLEAR BONUS INCLUDED':''}`
      });
    };
    const story=window.BW180FirstCommandStory;
    if(story&&typeof story.showTacticReward==='function'){
      story.showTacticReward('picardManeuver',showCompletionResult);
    }else showCompletionResult();
    return true;
  }

  function resetMission(){
    state.players=PLAYER_DEFS.map(p=>({...p,alive:true,escaped:false,revealed:false}));
    state.contacts=CONTACT_DEFS.map(p=>({...p,alive:true,revealed:false}));
    state.selectedId='target';state.scanMode=false;state.soldierScans=0;state.escaped=new Set();
    state.complete=false;state.failed=false;state.intel=[];state.started=true;state.turn='player';
    state.inputLocked=false;state.enemyCursor=0;state.lastEnemyId=null;state.turnNumber=1;state.thirdScanStoryShown=false;
    const result=document.getElementById('campaignM1Result');if(result){result.classList.remove('active','failure');}
    buildCells();renderPieces();renderHud();
    setStatus('<em>YOUR TURN</em> · TARGET SPECIALIST E2 · RECON RUNNER F2. Move one piece or scan. Computer moves one Rank 9 after every action.');
  }

  function enterCampaignMission(){
    if(typeof resetOnlineState==='function')resetOnlineState();
    window.BW159RequestedBattleMode='campaign';
    window.BW159RequestedMissionId='mission1';
    if(typeof unlockAudio==='function')unlockAudio();
    try{if(typeof bw125StopMenuMusic==='function')bw125StopMenuMusic();}catch(err){}
    try{if(typeof stopLoop==='function'){stopLoop('hum');stopLoop('matchAmbiance');}}catch(err){}
    try{if(typeof playSound==='function')playSound('shipWarp',{volume:.86,delay:180});}catch(err){}
    const beginMission=()=>{
      if(typeof showScreen==='function')showScreen(SCREEN_ID);
      try{if(typeof startMatchAudio==='function')startMatchAudio();}catch(err){}
      resetMission();
    };
    const launch=()=>{
      const ui=window.BW185CampaignUI;
      if(ui&&typeof ui.showObjective==='function')ui.showObjective('mission1',beginMission);
      else beginMission();
    };
    if(typeof bw159RunTransition==='function'){
      bw159RunTransition({
        mode:'battle',
        campaign:true,
        kicker:'STARFLEET CAMPAIGN NETWORK',
        title:'MISSION 1 · BOLDLY GO!',
        sub:'Loading survey grid · Stratego rules active · Scan three enemy soldiers and extract...',
        onComplete:launch
      });
    }else launch();
  }

  function leaveCampaign(){
    state.scanMode=false;state.selectedId=null;state.inputLocked=true;
    if(typeof returnToCommandCenter==='function')returnToCommandCenter();
  }

  window.openCampaignMenu=enterCampaignMission;
  window.bw161StartMission1=enterCampaignMission;
  window.bw161ResetMission1=resetMission;
  window.bw161CampaignScan=toggleScan;
  window.bw161CampaignReturn=leaveCampaign;

})();
