/* ============================================================
   BEACON WARS v172 · CAMPAIGN MISSION 2: UNKNOWN PLANET
   Clean campaign-only puzzle engine.

   LOCKED RULES
   • Same A-J / 1-8 flat board frame as Mission 1.
   • Security Officer + Recon Runner enter from the bottom.
   • Tech Engineer begins trapped in the upper-left facility.
   • White wall geometry is impassable. Players must route around it.
   • The green console at B8 drops the sealed green wall around the Engineer cell.
   • Engineer becomes controllable only after the console is activated.
   • Turns strictly alternate: PLAYER → ONE ENEMY → PLAYER → ONE ENEMY.
   • Enemy movers rotate so the same enemy cannot take every response turn.
   • Mines never move.
   • Recon Runner moves any number of OPEN squares in a straight orthogonal line.
   • Standard pieces move one orthogonal square.
   • Hidden BW contacts reveal when engaged or approached.
   • Engineer safely disables mines.
   • Mission completes only after the Engineer and every other surviving unit
     have each reached the blue extraction pad at D1.
   ============================================================ */
(function(){
  'use strict';

  const SCREEN_ID='campaignMission2';
  const COLS='ABCDEFGHIJ'.split('');
  const X_BOUNDS=[476,572,669,766,863,960,1057,1153,1250,1347,1443];
  const Y_BOUNDS=[164,262,356,451,545,640,734,829,923];
  const X_CENTERS=X_BOUNDS.slice(0,-1).map((x,i)=>(x+X_BOUNDS[i+1])/2);
  const Y_CENTERS=Y_BOUNDS.slice(0,-1).map((y,i)=>(y+Y_BOUNDS[i+1])/2);

  const CONSOLE_CELL='B8';
  const ENGINEER_CELL='A7';
  const ENGINEER_SAFE_CELLS=new Set(['A7','A8']);
  /* IMPORTANT COORDINATE NOTE
     The Mission 2 reference art is read top-to-bottom, while this engine's
     inherited Stratego grid stores rows bottom-to-top. The player's visual
     row-7 to row-8 passage is therefore the internal row-2 to row-1 boundary. */
  const ALWAYS_OPEN_CORRIDOR_CELLS=new Set(['A7','A8']);
  const VISUAL_ROW_7_TO_8_PASSAGE_EDGES=new Set([
    'A1|A2','B1|B2','C1|C2','D1|D2'
  ]);
  /* Cells covered by mission_two_bg_roof.png. The roof stays down until at
     least one live, active blue unit is inside this footprint. */
  const BUILDING_INTERIOR_CELLS=new Set([
    'A1','B1','C1','D1','A2','B2','C2','D2',
    'A3','B3','A4','B4','A5','B5','A6','B6',
    'A7','B7','C7','D7','E7','A8','B8','C8','D8','E8'
  ]);
  const EXIT_CELL='D1';
  const ENEMY_TURN_DELAY=460;
  const AGGRO_RANGE=4;

  /* Rock wall / cliff cells marked X in the user's Mission 2 plan. */
  const BLOCKED_CELLS=new Set([
    /* Facility / terrain cells marked unavailable in the Mission 2 board plan. */
    'D7','G5',
    'I8','J8','J7','J6','J5','J4','J3',
    'I2','H1'
  ]);

  /* Facility walls are edges, not whole cells. These prevent crossing directly
     through the white wall art while still letting pieces route around it. */
  const WALL_EDGES=new Set([
    /* Long vertical facility wall between B and C, rows 3-6. */
    'B3|C3','B4|C4','B5|C5','B6|C6',

    /* Top horizontal facility wall beneath C7-E7.
       A/B remain the intended approach into the upper structure. */
    'C6|C7','D6|D7','E6|E7',

    /* Lower horizontal facility wall visible across B-D.
       A2 <-> A3 is the intentional doorway, so A is NOT blocked here. */
    'B2|B3','C2|C3','D2|D3',

    /* The entire A-D row-1 / row-2 boundary is the OPEN passage represented
       by visual row 7 passing down to visual row 8. */

    /* Wall wrapping the D1 extraction enclosure on its right side. */
    'D1|E1','D2|E2'
  ]);

  /* A7 and A8 are intentionally OPEN corridor cells.
     Do not seal them with wall-edge logic. The mission still requires the
     Engineer because the extraction doorway is physically blocked by a mine. */
  const ALWAYS_OPEN_EDGES=new Set([
    'A7|A8','A2|A3',...VISUAL_ROW_7_TO_8_PASSAGE_EDGES
  ]);
  const OPEN_AFTER_CONSOLE_EDGES=new Set();
  const GREEN_WALL_EDGES=new Set();

  const PLAYER_DEFS=[
    {id:'security',name:'SECURITY OFFICER',rank:7,coord:'E1',asset:'campaign_security_m2.png',move:'step',active:true},
    {id:'recon',name:'RECON RUNNER',rank:2,coord:'F1',asset:'campaign_recon_m2.png',move:'recon',active:true},
    {id:'engineer',name:'TECH ENGINEER',rank:3,coord:'A7',asset:'campaign_engineer_m2.png',move:'step',active:false,rescue:true}
  ];

  const CONTACT_DEFS=[
    {id:'hunterA',name:'HUNTER',rank:4,coord:'B8',asset:'campaign_hunter_m2.png',movable:true,kind:'soldier'},
    {id:'hunterB',name:'HUNTER',rank:4,coord:'H7',asset:'campaign_hunter_m2.png',movable:true,kind:'soldier'},
    {id:'scoutA',name:'SCOUT',rank:1,coord:'F6',asset:'campaign_scout_m2.png',movable:true,kind:'soldier'},
    {id:'scoutB',name:'SCOUT',rank:1,coord:'C5',asset:'campaign_scout_m2.png',movable:true,kind:'soldier'},
    {id:'mineA',name:'SHIELD MINE',rank:null,coord:'A3',asset:'campaign_enemy_mine.png',movable:false,kind:'mine'},
    {id:'mineB',name:'SHIELD MINE',rank:null,coord:'D1',asset:'campaign_enemy_mine.png',movable:false,kind:'mine'}
  ];

  const state={
    players:[],contacts:[],selectedId:null,turn:'player',turnNumber:1,inputLocked:false,
    consoleActive:false,engineerRescued:false,complete:false,failed:false,intel:[],
    enemyCursor:0,lastEnemyId:null,engineerStoryShown:false
  };

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
    return{left:X_BOUNDS[c],top:Y_BOUNDS[ri],width:X_BOUNDS[c+1]-X_BOUNDS[c],height:Y_BOUNDS[ri+1]-Y_BOUNDS[ri]};
  }
  function manhattan(a,b){
    const A=parseCoord(a),B=parseCoord(b);if(!A||!B)return 999;
    return Math.abs(A.c-B.c)+Math.abs(A.r-B.r);
  }
  function edgeKey(a,b){return [a,b].sort().join('|')}
  function greenWallSealed(){return !state.consoleActive}
  function crossesGreenWall(a,b){
    if(!greenWallSealed())return false;
    return GREEN_WALL_EDGES.has(edgeKey(a,b));
  }
  function edgeBlocked(a,b){
    const key=edgeKey(a,b);

    /* Only explicitly approved passage EDGES are open.
       Previous builds used a blanket A7/A8 cell exemption, which accidentally
       opened every side of those cells and let the CPU walk through walls. */
    if(VISUAL_ROW_7_TO_8_PASSAGE_EDGES.has(key))return false;
    if(ALWAYS_OPEN_EDGES.has(key))return false;
    if(state.consoleActive&&OPEN_AFTER_CONSOLE_EDGES.has(key))return false;
    if(crossesGreenWall(a,b))return true;
    return WALL_EDGES.has(key);
  }
  function playerAt(coord){return state.players.find(p=>p.alive!==false&&!p.escaped&&p.coord===coord)||null}
  function contactAt(coord){return state.contacts.find(p=>p.alive!==false&&p.coord===coord)||null}
  function isBlockedCell(coord){return BLOCKED_CELLS.has(coord)}
  function isInside(coord){const p=parseCoord(coord);return !!p}

  function orthogonalNeighbors(coord){
    const p=parseCoord(coord);if(!p)return[];
    return [[0,-1],[-1,0],[1,0],[0,1]].map(([dc,dr])=>[p.c+dc,p.r+dr])
      .filter(([c,r])=>c>=0&&c<10&&r>=1&&r<=8)
      .map(([c,r])=>coordOf(c,r))
      .filter(next=>!edgeBlocked(coord,next));
  }

  function playerCanEnter(coord,piece,from){
    if(!piece||!isInside(coord)||isBlockedCell(coord))return false;

    const origin=from||piece.coord;
    const A=parseCoord(origin),B=parseCoord(coord);
    if(!A||!B)return false;

    // A standard step may never cross a blocked wall edge.
    const distance=Math.abs(A.c-B.c)+Math.abs(A.r-B.r);
    if(distance===1 && edgeBlocked(origin,coord))return false;

    const own=playerAt(coord);
    if(own&&own.id!==piece.id)return false;
    return true;
  }

  function legalMovesFor(piece){
    if(!piece||piece.alive===false||piece.escaped||!piece.active||state.turn!=='player'||state.inputLocked)return[];
    if(piece.move==='step') return orthogonalNeighbors(piece.coord).filter(c=>playerCanEnter(c,piece,piece.coord));
    const p=parseCoord(piece.coord);if(!p)return[];
    const out=[];
    [[0,-1],[-1,0],[1,0],[0,1]].forEach(([dc,dr])=>{
      let c=p.c+dc,r=p.r+dr,prev=piece.coord;
      while(c>=0&&c<10&&r>=1&&r<=8){
        const coord=coordOf(c,r);
        if(edgeBlocked(prev,coord)||isBlockedCell(coord))break;
        const own=playerAt(coord);if(own&&own.id!==piece.id)break;
        out.push(coord);
        if(contactAt(coord))break;
        prev=coord;c+=dc;r+=dr;
      }
    });
    return out;
  }

  function buildCells(){
    const host=document.getElementById('campaignM2HitLayer');if(!host)return;
    host.innerHTML='';
    for(let r=1;r<=8;r++)for(let c=0;c<10;c++){
      const coord=coordOf(c,r),box=rectOf(c,r),b=document.createElement('button');
      b.type='button';b.className='campaign-m2-cell'+(isBlockedCell(coord)?' blocked':'');
      b.dataset.coordinate=coord;b.setAttribute('aria-label','Mission 2 tile '+coord);
      b.style.left=box.left+'px';b.style.top=box.top+'px';b.style.width=box.width+'px';b.style.height=box.height+'px';
      b.addEventListener('click',()=>onCell(coord));host.appendChild(b);
    }
  }

  function makePiece(piece,type){
    const img=document.createElement('img');img.id='campaignM2Piece_'+piece.id;img.className='campaign-m2-piece '+type;img.alt=piece.name||'';img.draggable=false;
    if(type==='enemy'&&!piece.revealed){img.src='campaign_BW_token.png';img.classList.add('hidden-contact')}else img.src=piece.asset;
    if(piece.revealed)img.classList.add('revealed');if(piece.id===state.selectedId)img.classList.add('selected');
    return img;
  }
  function positionPiece(el,coord){const p=centerOf(coord);el.style.left=p.x+'px';el.style.top=p.y+'px'}
  function renderPieces(){
    const host=document.getElementById('campaignM2PieceLayer');if(!host)return;host.innerHTML='';
    state.contacts.forEach(p=>{if(p.alive===false)return;const el=makePiece(p,'enemy');positionPiece(el,p.coord);host.appendChild(el)});
    state.players.forEach(p=>{if(p.alive===false||p.escaped)return;const el=makePiece(p,'player');if(!p.active)el.style.opacity='.72';positionPiece(el,p.coord);host.appendChild(el)});
    renderRoof();
  }

  function controlledPlayerInsideBuilding(){
    return state.players.some(p=>p.alive!==false&&!p.escaped&&p.active&&BUILDING_INTERIOR_CELLS.has(p.coord));
  }
  function renderRoof(){
    const roof=document.getElementById('campaignM2Roof');if(!roof)return;
    const interiorVisible=controlledPlayerInsideBuilding();
    roof.classList.toggle('interior-visible',interiorVisible);
    roof.dataset.state=interiorVisible?'open':'closed';
  }

  function renderGreenWall(){
    /* A7/A8 are open in this mission revision. Remove the old containment
       wall graphic entirely so the art and movement rules say the same thing. */
    const old=document.getElementById('campaignM2GreenWall');
    if(old)old.remove();
  }


  function revealContact(contact,reason){
    if(!contact||contact.revealed)return;
    contact.revealed=true;
    if(!state.intel.some(i=>i.id===contact.id))state.intel.push({...contact,reason:reason||'CONTACT'});
    renderPieces();
    const el=document.getElementById('campaignM2Piece_'+contact.id);if(el){el.classList.add('revealing');setTimeout(()=>el&&el.classList.remove('revealing'),720)}
  }

  function selectedPiece(){return state.players.find(p=>p.id===state.selectedId&&p.alive!==false&&!p.escaped&&p.active)||null}
  function refreshCells(){
    const piece=selectedPiece(),legal=new Set(piece?legalMovesFor(piece):[]);
    document.querySelectorAll('#campaignM2HitLayer .campaign-m2-cell').forEach(el=>{
      const coord=el.dataset.coordinate;el.disabled=state.inputLocked||state.complete||state.failed;
      el.classList.toggle('legal',legal.has(coord));
      el.classList.toggle('console',coord===CONSOLE_CELL&&!state.consoleActive&&legal.has(coord));
      el.classList.toggle('exit-locked',coord===EXIT_CELL&&!state.engineerRescued);
      el.classList.toggle('exit-open',coord===EXIT_CELL&&state.engineerRescued);
    });
  }

  function renderIntel(){
    const list=document.getElementById('campaignM2IntelList');if(!list)return;
    const rows=[];
    if(state.consoleActive)rows.push(`<div class="campaign-m2-intel-row"><div><strong>ACCESS CONSOLE ACTIVE</strong><span>B8 · ENGINEER DOOR RELEASED</span></div></div>`);
    state.intel.slice(-5).forEach(i=>rows.push(`<div class="campaign-m2-intel-row"><img src="${i.asset}" alt=""><div><strong>${i.kind==='mine'?'MINE DETECTED':'ENEMY '+i.name}</strong><span>${i.coord} · ${i.revealed?'IDENTIFIED':'CONTACT'}</span></div></div>`));
    list.innerHTML=rows.length?rows.join(''):'<div class="campaign-m2-intel-empty">UNKNOWN CONTACTS ACTIVE. Reach the console, free the Engineer, and extract.</div>';
  }
  function setStatus(html){const el=document.getElementById('campaignM2Status');if(el)el.innerHTML=html}
  function renderHud(){
    const p=selectedPiece(),selected=document.getElementById('campaignM2Selected');
    if(selected){
      const t=state.turn==='enemy'?'COMPUTER TURN':`YOUR TURN · ${state.turnNumber}`;
      selected.innerHTML=`${t}<strong>${p?p.name:(state.turn==='enemy'?'ENEMY PATROL MOVING':'SELECT A BLUE UNIT')}</strong>`;
    }
    const stage=document.getElementById('campaignM2Stage');if(stage){
      stage.classList.toggle('open',state.engineerRescued);
      const b=stage.querySelector('b'),s=stage.querySelector('span');
      if(!state.consoleActive){if(b)b.textContent='ENGINEER CELL SEALED';if(s)s.textContent='Reach the GREEN CONSOLE at B8 to bring the Tech Engineer online. The lower A-D passage stays open.'}
      else if(!state.engineerRescued){if(b)b.textContent='ENGINEER ONLINE';if(s)s.textContent='Tech Engineer online. Select the Engineer and begin extraction.'}
      else{
        const survivors=state.players.filter(p=>p.alive!==false);
        const extracted=survivors.filter(p=>p.escaped).length;
        if(b)b.textContent='EXTRACTION ACTIVE';
        if(s)s.textContent=`Move every surviving crew member to D1 · ${extracted}/${survivors.length} extracted.`;
      }
    }
    renderIntel();renderGreenWall();renderRoof();refreshCells();
  }

  function selectPlayer(coord){
    if(state.turn!=='player'||state.inputLocked)return false;
    const p=playerAt(coord);if(!p||!p.active)return false;
    state.selectedId=p.id;renderPieces();renderHud();setStatus(`<em>${p.name}</em> selected. Choose a highlighted destination.`);return true;
  }

  function compareCombat(player,enemy){
    player.revealed=true;
    if(enemy.kind==='mine'){
      revealContact(enemy,'MINE');
      if(player.id==='engineer'){
        enemy.alive=false;setStatus('<em>TECH ENGINEER</em> safely disabled the mine.');return 'player';
      }
      player.alive=false;enemy.alive=false;setStatus(`${player.name} triggered a shield mine.`);return 'enemy';
    }
    revealContact(enemy,'COMBAT');
    const pr=Number(player.rank)||0,er=Number(enemy.rank)||0;
    if(pr>=er){enemy.alive=false;setStatus(`<em>${player.name}</em> defeated ${enemy.name}.`);return 'player'}
    player.alive=false;setStatus(`${enemy.name} defeated ${player.name}.`);return 'enemy';
  }

  function activateConsole(piece){
    if(piece.coord!==CONSOLE_CELL||state.consoleActive)return false;
    state.consoleActive=true;state.engineerRescued=true;
    const eng=state.players.find(p=>p.id==='engineer');if(eng)eng.active=true;
    try{if(typeof playSound==='function')playSound('beep',{volume:.8})}catch(err){}
    setStatus('<em>ACCESS GRANTED.</em> Tech Engineer controls unlocked. The extraction mine still has to be disabled.');
    state.inputLocked=true;
    state.engineerStoryShown=true;
    renderPieces();renderHud();
    const resume=()=>{playMove();finishPlayerAction()};
    const story=window.BW180FirstCommandStory;
    if(story&&typeof story.onEngineerReleased==='function')story.onEngineerReleased(resume);
    else resume();
    return true;
  }

  function survivingPlayers(){return state.players.filter(p=>p.alive!==false)}

  function extractPlayer(piece){
    if(!piece||piece.alive===false||piece.escaped||!state.engineerRescued||piece.coord!==EXIT_CELL)return false;
    piece.escaped=true;
    if(state.selectedId===piece.id)state.selectedId=null;
    const survivors=survivingPlayers();
    const extracted=survivors.filter(p=>p.escaped).length;
    setStatus(`<em>${piece.name}</em> extracted at D1. ${extracted}/${survivors.length} surviving crew members aboard.`);
    try{if(typeof playSound==='function')playSound('teleport',{volume:.72})}catch(err){}
    return true;
  }

  function allSurvivorsExtracted(){
    const engineer=state.players.find(p=>p.id==='engineer');
    const survivors=survivingPlayers();
    return state.engineerRescued&&engineer&&engineer.alive!==false&&engineer.escaped&&
      survivors.length>0&&survivors.every(p=>p.escaped);
  }

  function checkMissionComplete(){
    if(state.complete||state.failed||!allSurvivorsExtracted())return false;
    finishMission();return true;
  }

  function onCell(coord){
    if(state.complete||state.failed||state.inputLocked||state.turn!=='player')return;
    if(selectPlayer(coord))return;
    const piece=selectedPiece();if(!piece)return;
    const legal=legalMovesFor(piece);if(!legal.includes(coord))return;
    const enemy=contactAt(coord);
    if(enemy){
      const result=compareCombat(piece,enemy);
      if(result==='player'&&piece.alive!==false)piece.coord=coord;
    }else piece.coord=coord;
    if(activateConsole(piece))return;
    if(piece.alive!==false)extractPlayer(piece);
    renderPieces();renderHud();
    if(checkFailure())return;
    if(checkMissionComplete())return;
    playMove();finishPlayerAction();
  }

  function playMove(){try{if(typeof playSound==='function')playSound('movePiece',{volume:.55})}catch(err){}}

  function engineerProtectedInCell(){
    const engineer=state.players.find(p=>p.id==='engineer');
    return !!(engineer&&engineer.alive!==false&&!engineer.escaped&&ENGINEER_SAFE_CELLS.has(engineer.coord));
  }
  function enemyCanEnter(enemy,from,to){
    if(!isInside(from)||!isInside(to))return false;

    const A=parseCoord(from),B=parseCoord(to);
    if(!A||!B)return false;

    // Enemy soldiers in Mission 2 are step movers only.
    // Never allow diagonal, multi-square, or teleport-like movement.
    const distance=Math.abs(A.c-B.c)+Math.abs(A.r-B.r);
    if(distance!==1)return false;

    if(isBlockedCell(to))return false;
    if(edgeBlocked(from,to))return false;

    /* The Engineer cell is a hard safe cell while occupied by the Engineer.
       Before the switch is activated, the green wall also seals every edge. */
    if(ENGINEER_SAFE_CELLS.has(to)&&engineerProtectedInCell())return false;

    // Explicit hazard rule: CPU soldiers cannot enter a Shield Mine square.
    const contact=contactAt(to);
    if(contact){
      if(contact.kind==='mine')return false;
      return false; // no stacking with another enemy contact
    }

    // A player square is legal only because this becomes a combat attempt.
    if(playerAt(to))return true;

    return true;
  }
  function livingActivePlayers(){
    return state.players.filter(p=>p.alive!==false&&!p.escaped&&p.active);
  }

  function enemyRank(enemy){return Number(enemy&&enemy.rank)||0}
  function playerRank(player){return Number(player&&player.rank)||0}

  function enemyCanSafelyBeat(enemy,player){
    return enemyRank(enemy)>playerRank(player);
  }

  function nearestFrom(enemy,players){
    return players.slice().sort((a,b)=>manhattan(enemy.coord,a.coord)-manhattan(enemy.coord,b.coord))[0]||null;
  }

  function legalEnemyNeighbors(enemy){
    const p=parseCoord(enemy.coord);
    if(!p)return[];

    return [[0,-1],[-1,0],[1,0],[0,1]]
      .map(([dc,dr])=>[p.c+dc,p.r+dr])
      .filter(([c,r])=>c>=0&&c<10&&r>=1&&r<=8)
      .map(([c,r])=>coordOf(c,r))
      .filter(c=>enemyCanEnter(enemy,enemy.coord,c));
  }

  function bestEnemyStepToward(enemy,target,{allowAttack=true,stopAdjacent=false}={}){
    const neighbors=legalEnemyNeighbors(enemy);
    if(!neighbors.length||!target)return null;

    if(allowAttack&&neighbors.includes(target.coord))return target.coord;

    const empty=neighbors.filter(c=>c!==target.coord&&!playerAt(c));
    empty.sort((a,b)=>{
      const da=manhattan(a,target.coord),db=manhattan(b,target.coord);
      if(stopAdjacent){
        const aa=da===1?0:1,ab=db===1?0:1;
        if(aa!==ab)return aa-ab;
      }
      return da-db;
    });
    return empty[0]||null;
  }

  function chooseInformationAwareEnemyMove(){
    const enemies=state.contacts.filter(c=>c.movable&&c.alive!==false);
    const players=livingActivePlayers();
    if(!enemies.length||!players.length)return null;

    const hidden=players.filter(p=>!p.revealed);
    const known=players.filter(p=>p.revealed);

    // Unknown player: LOWEST-ranked enemy probes first.
    if(hidden.length){
      const attacks=[];
      enemies.forEach(enemy=>{
        legalEnemyNeighbors(enemy).forEach(coord=>{
          const victim=playerAt(coord);
          if(victim&&!victim.revealed)attacks.push({enemy,target:victim,dest:coord,mode:'probe-attack'});
        });
      });
      if(attacks.length){
        attacks.sort((a,b)=>enemyRank(a.enemy)-enemyRank(b.enemy));
        return attacks[0];
      }

      const probes=enemies.slice().sort((a,b)=>enemyRank(a)-enemyRank(b));
      for(const enemy of probes){
        const target=nearestFrom(enemy,hidden);
        const dest=bestEnemyStepToward(enemy,target,{allowAttack:true});
        if(dest)return{enemy,target,dest,mode:'probe'};
      }
    }

    // Known player: HIGHEST-ranked enemy that can safely win hunts it.
    if(known.length){
      const safe=[];
      known.forEach(target=>{
        enemies.filter(enemy=>enemyCanSafelyBeat(enemy,target)).forEach(enemy=>{
          const dest=bestEnemyStepToward(enemy,target,{allowAttack:true});
          if(dest)safe.push({
            enemy,target,dest,
            mode:dest===target.coord?'known-attack':'hunt',
            rank:enemyRank(enemy),
            distance:manhattan(enemy.coord,target.coord)
          });
        });
      });

      if(safe.length){
        safe.sort((a,b)=>{
          if(a.mode!==b.mode)return a.mode==='known-attack'?-1:1;
          if(a.rank!==b.rank)return b.rank-a.rank;
          return a.distance-b.distance;
        });
        return safe[0];
      }

      // No safe winner: bluff with the highest enemy, moving close but not attacking.
      const bluffers=enemies.slice().sort((a,b)=>enemyRank(b)-enemyRank(a));
      for(const enemy of bluffers){
        const target=nearestFrom(enemy,known);
        const dest=bestEnemyStepToward(enemy,target,{allowAttack:false,stopAdjacent:true});
        if(dest)return{enemy,target,dest,mode:'bluff'};
      }
    }

    // Normal patrol fallback.
    for(let i=0;i<enemies.length;i++){
      const enemy=enemies[(state.enemyCursor+i)%enemies.length];
      const dest=legalEnemyNeighbors(enemy).find(c=>!playerAt(c));
      if(dest){
        state.enemyCursor=(state.enemyCursor+i+1)%Math.max(1,enemies.length);
        return{enemy,target:null,dest,mode:'patrol'};
      }
    }
    return null;
  }

  function enemyAttack(enemy,player){
    if(player&&player.id==='engineer'&&ENGINEER_SAFE_CELLS.has(player.coord)){
      setStatus('<em>ENGINEER SAFE CELL.</em> Enemy contact cannot enter or attack the Engineer here.');
      return false;
    }
    player.revealed=true;
    revealContact(enemy,'COMBAT');
    const er=Number(enemy.rank)||0,pr=Number(player.rank)||0;
    if(er>pr){player.alive=false;enemy.coord=player.coord;setStatus(`${enemy.name} intercepted ${player.name}.`)}
    else{enemy.alive=false;setStatus(`${player.name} held position and defeated ${enemy.name}.`)}
  }


  function runEnemyTurn(){
    if(state.complete||state.failed)return;
    state.turn='enemy';state.inputLocked=true;renderHud();

    const action=chooseInformationAwareEnemyMove();
    if(!action){setTimeout(endEnemyTurn,220);return}

    const enemy=action.enemy;
    setStatus(`<em>COMPUTER TURN</em> · Enemy forces are responding to available intelligence.`);

    setTimeout(()=>{
      if(state.complete||state.failed||!enemy||enemy.alive===false){endEnemyTurn();return}

      const victim=playerAt(action.dest);
      if(victim){
        // Never knowingly take a losing/equal attack against a revealed piece.
        if(victim.revealed&&!enemyCanSafelyBeat(enemy,victim)){
          const bluff=bestEnemyStepToward(enemy,victim,{allowAttack:false,stopAdjacent:true});
          if(bluff)enemy.coord=bluff;
          setStatus('<em>COMPUTER BLUFF.</em> Enemy moved close to the revealed unit but refused a losing attack.');
        }else{
          enemyAttack(enemy,victim);
        }
      }else{
        enemy.coord=action.dest;
        if(action.mode==='bluff')setStatus('<em>COMPUTER BLUFF.</em> Enemy moved close without attacking.');
        else if(action.mode==='probe')setStatus('<em>COMPUTER PROBE.</em> A low-rank contact is closing on an unidentified crew member.');
        else if(action.mode==='hunt')setStatus('<em>COMPUTER HUNT.</em> A stronger contact is closing on a revealed crew member.');
      }

      renderPieces();renderHud();
      if(checkFailure())return;
      if(checkMissionComplete())return;
      setTimeout(endEnemyTurn,ENEMY_TURN_DELAY);
    },260);
  }

  function finishPlayerAction(){
    if(state.complete||state.failed)return;
    state.inputLocked=true;
    renderHud();
    setTimeout(runEnemyTurn,260);
  }

  function endEnemyTurn(){
    if(state.complete||state.failed)return;
    state.turn='player';state.inputLocked=false;state.turnNumber++;

    // STICKY SELECTION:
    // Keep the player's previously selected unit through the CPU response.
    // Only choose a replacement if that unit died, escaped, or is inactive.
    const current=selectedPiece();
    if(!current){
      state.selectedId=state.players.find(
        p=>p.alive!==false&&p.active&&!p.escaped
      )?.id||null;
    }

    renderPieces();renderHud();
    setStatus('<em>YOUR TURN</em> · Your selected unit remains active until you switch pieces.');
  }

  function checkFailure(){
    if(state.failed||state.complete)return state.failed;
    const security=state.players.find(p=>p.id==='security'),recon=state.players.find(p=>p.id==='recon'),engineer=state.players.find(p=>p.id==='engineer');
    const rescueImpossible=(security?.alive===false&&recon?.alive===false&&!state.engineerRescued)||(state.engineerRescued&&engineer?.alive===false);
    if(!rescueImpossible)return false;
    state.failed=true;state.turn='none';state.inputLocked=true;
    showResult(true,'MISSION FAILED','The rescue team was lost before the Engineer could be extracted.','NO CREDITS AWARDED');
    try{if(typeof playSound==='function')playSound('defeat',{volume:.8})}catch(err){}
    renderHud();return true;
  }

  function addCredits(amount){
    if(typeof bw135ReadExchange!=='function'||typeof bw135SaveExchange!=='function')return;
    const wallet=bw135ReadExchange();wallet.credits=Math.max(0,Number(wallet.credits)||0)+Math.max(0,Number(amount)||0);bw135SaveExchange(wallet);
  }
  function markFirstClear(){
    let data={};try{data=JSON.parse(localStorage.getItem('beaconWarsV192CampaignProgress')||'{}')||{}}catch(err){}
    const first=!data.mission2;data.mission2=true;try{localStorage.setItem('beaconWarsV192CampaignProgress',JSON.stringify(data))}catch(err){}return first;
  }
  function finishMission(){
    if(state.complete)return;state.complete=true;state.turn='none';state.inputLocked=true;
    const first=markFirstClear(),reward=150+(first?150:0);addCredits(reward);if(typeof awardProfileXP==='function')awardProfileXP(125);
    try{if(typeof playSound==='function')playSound('win',{volume:.85})}catch(err){}
    const bonusAchieved=state.contacts.filter(c=>c.kind==='soldier'&&c.alive!==false).length===0;
    const showCompletionResult=()=>{
      const ui=window.BW185CampaignUI;
      if(ui&&typeof ui.showCompletion==='function'){
        ui.showCompletion({
          resultId:'campaignM2Result',prefix:'campaignM2',missionId:'mission2',
          xp:125,credits:reward,moves:state.turnNumber,moveTarget:50,
          bonusAchieved,firstClear:first
        });
      }else showResult(false,'UNKNOWN PLANET','Access console secured. Tech Engineer and every surviving crew member extracted.',`+${reward} CREDITS${first?' · FIRST CLEAR BONUS INCLUDED':''}`);
    };
    const story=window.BW180FirstCommandStory;
    if(story&&typeof story.showTacticReward==='function'){
      story.showTacticReward('sabotageProtocol',showCompletionResult);
    }else showCompletionResult();
  }
  function showResult(failure,title,text,reward){
    const box=document.getElementById('campaignM2Result');if(!box)return;box.classList.toggle('failure',failure);
    const k=document.getElementById('campaignM2ResultKicker'),t=document.getElementById('campaignM2ResultTitle'),p=document.getElementById('campaignM2ResultText'),r=document.getElementById('campaignM2Reward');
    if(k)k.textContent=failure?'STARFLEET CAMPAIGN // MISSION FAILED':'STARFLEET CAMPAIGN // MISSION COMPLETE';if(t)t.textContent=title;if(p)p.textContent=text;if(r)r.textContent=reward;box.classList.add('active');
  }

  function resetMission(){
    state.players=PLAYER_DEFS.map(p=>({...p,alive:true,escaped:false,revealed:false}));
    state.contacts=CONTACT_DEFS.map(p=>({...p,alive:true,revealed:false}));
    state.selectedId='security';state.turn='player';state.turnNumber=1;state.inputLocked=false;state.consoleActive=false;state.engineerRescued=false;state.complete=false;state.failed=false;state.intel=[];state.enemyCursor=0;state.lastEnemyId=null;state.engineerStoryShown=false;
    const result=document.getElementById('campaignM2Result');if(result)result.classList.remove('active','failure');
    buildCells();renderPieces();renderHud();setStatus('<em>YOUR TURN</em> · Security Officer E1 · Recon Runner F1. Visual row 7 passes down to row 8 through A-D. Entering the facility reveals its interior. Step on B8 to bring the Engineer online, then use the Engineer to clear the extraction mine at D1.');
  }

  function enterMission2(){
    if(typeof resetOnlineState==='function')resetOnlineState();window.BW159RequestedBattleMode='campaign';window.BW159RequestedMissionId='mission2';
    try{if(typeof bw125StopMenuMusic==='function')bw125StopMenuMusic()}catch(err){}
    const beginMission=()=>{if(typeof showScreen==='function')showScreen(SCREEN_ID);try{if(typeof startMatchAudio==='function')startMatchAudio()}catch(err){}resetMission()};
    const launch=()=>{
      const ui=window.BW185CampaignUI;
      if(ui&&typeof ui.showObjective==='function')ui.showObjective('mission2',beginMission);
      else beginMission();
    };
    if(typeof bw159RunTransition==='function')bw159RunTransition({mode:'battle',campaign:true,kicker:'STARFLEET CAMPAIGN NETWORK',title:'MISSION 2 · UNKNOWN PLANET',sub:'Surface rescue grid loading · Alternating patrol response active · Recover the Engineer and extract...',onComplete:launch});else launch();
  }
  function leaveMission(){state.inputLocked=true;if(typeof returnToCommandCenter==='function')returnToCommandCenter()}

  /* FIRST COMMAND always begins with its prologue and Mission 1 briefing.
     Progress storage remains reward-only and never reroutes campaign order. */
  window.openCampaignMenu=function(){
    const launch=typeof window.bw161StartMission1==='function'?window.bw161StartMission1:enterMission2;
    const story=window.BW180FirstCommandStory;
    if(story&&typeof story.startCampaign==='function')story.startCampaign(launch);
    else launch();
  };

  window.bw180ContinueToMission2=function(){
    const story=window.BW180FirstCommandStory;
    if(story&&typeof story.playMission2Intro==='function')story.playMission2Intro(enterMission2);
    else enterMission2();
  };

  window.bw166StartMission2=enterMission2;
  window.bw166ResetMission2=resetMission;
  window.bw166CampaignReturn=leaveMission;
  window.bw168StartMission2=enterMission2;
  window.bw168ResetMission2=resetMission;
  window.bw168CampaignReturn=leaveMission;
})();
