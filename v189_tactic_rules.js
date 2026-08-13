/* ============================================================
   BEACON WARS v189 · DISTINCT COMMANDER TACTICS
   Picard Maneuver, Sabotage Protocol, and Bat’leth no longer
   borrow the Tactical Warp, Tricorder Scan, or Brutal Strike rules.
   ============================================================ */
(function(){
  'use strict';

  const directions8=[
    [-1,-1],[-1,0],[-1,1],
    [0,-1],          [0,1],
    [1,-1], [1,0],  [1,1]
  ];
  let batlethMoveArmed=false;
  let batlethResolving=false;

  function isCommander(piece){return !!(piece&&piece.id==='FC')}
  function commandTacticActive(id,piece){
    return setup.tactic===id&&isCommander(piece)&&piece.team===playerTeam();
  }
  function revealCommanderPermanently(piece){
    if(!isCommander(piece))return;
    piece.revealed=true;
    piece.tacticRevealed=true;
  }
  function consumeTactic(piece){
    revealCommanderPermanently(piece);
    commanderUse[piece.team]=0;
    if(typeof recordProfileTactic==='function')recordProfileTactic(1);
  }
  function clearTargeting(){
    pendingConfirm=null;
    hideConfirm();
    scanMode=false;
    abilityMoveMode=false;
    scanTargets=[];
    legal=[];
    if(typeof bw115SyncMarkerMode==='function')bw115SyncMarkerMode();
  }
  function lineTargets(piece){
    const out=[];
    const cardinal=[[1,0],[-1,0],[0,1],[0,-1]];
    for(const [dr,dc] of cardinal){
      let r=piece.r+dr,c=piece.c+dc;
      while(inBounds(r,c)&&!isBlocked(r,c)){
        const occupant=board[r][c];
        if(!occupant)out.push({r,c});
        else{
          if(occupant.team!==piece.team)out.push({r,c});
          break;
        }
        r+=dr;c+=dc;
      }
    }
    return out;
  }
  function batlethMoveTargets(piece){
    return getLegal(piece).filter(cell=>!(board[cell.r]&&board[cell.r][cell.c]));
  }
  function adjacentEnemies(piece){
    if(!piece)return[];
    return directions8.map(([dr,dc])=>({r:piece.r+dr,c:piece.c+dc}))
      .filter(cell=>inBounds(cell.r,cell.c))
      .map(cell=>board[cell.r][cell.c])
      .filter(target=>target&&target.team!==piece.team);
  }
  function commanderOnBoard(piece){
    return !!(piece&&inBounds(piece.r,piece.c)&&board[piece.r]&&board[piece.r][piece.c]===piece);
  }
  function refreshTacticConsole(piece){
    renderBoard();
    renderUnitList();
    updateConsole(piece);
  }

  /* A tactic reveal is permanent. The older reveal-expiry tracker is still
     authoritative for scans and normal combat, so simply restore this flag
     after every board render. */
  const previousRenderBoard=renderBoard;
  renderBoard=function(){
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      const piece=board[r]&&board[r][c];
      if(piece&&piece.tacticRevealed)piece.revealed=true;
    }
    const result=previousRenderBoard();
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      const piece=board[r]&&board[r][c];
      if(piece&&piece.tacticRevealed)piece.revealed=true;
    }
    return result;
  };

  /* Activation dispatcher for the three formerly cloned campaign rewards. */
  const previousUseCommanderTactic=useCommanderTactic;
  useCommanderTactic=function(piece){
    if(!isCommander(piece)||piece.team!==playerTeam()||commanderUse[piece.team]<=0||phase!=='player'){
      return previousUseCommanderTactic(piece);
    }

    if(setup.tactic==='picardManeuver'){
      consumeTactic(piece);
      selectedPiece=piece;
      legal=lineTargets(piece);
      abilityMoveMode=true;
      scanMode=false;
      scanTargets=[];
      renderBoard();
      updateConsole(piece);
      updateStatus(
        'PICARD MANEUVER',
        'CHOOSE A STRAIGHT-LINE DESTINATION',
        'Move any open distance like the Recon Runner, or attack the first enemy in that line. Once per match.'
      );
      log(piece.name+' revealed permanently and activated Picard Maneuver.');
      if(typeof bw115SyncMarkerMode==='function')bw115SyncMarkerMode();
      return;
    }

    if(setup.tactic==='sabotageProtocol'){
      consumeTactic(piece);
      piece.sabotageCharges=2;
      clearTargeting();
      selectedPiece=null;
      playSound('scanner',{volume:.88});
      refreshTacticConsole(piece);
      updateStatus(
        'SABOTAGE PROTOCOL',
        'TWO MINE-DISABLE CHARGES ARMED',
        'The Commander now safely removes Shield Mines like the Tech Engineer. Each mine consumes one charge.'
      );
      log(piece.name+' revealed permanently and armed Sabotage Protocol with 2 mine-disable charges.');
      finishPlayerTurn();
      return;
    }

    if(setup.tactic==='batleth'){
      const moveTargets=batlethMoveTargets(piece);
      if(!moveTargets.length){
        selectedPiece=null;
        legal=[];
        updateConsole(piece);
        renderBoard();
        updateStatus(
          'BAT’LETH',
          'NO OPEN LANDING SPACE',
          'The Commander must move to an empty adjacent square before the surrounding sweep.'
        );
        log('Bat’leth could not activate because the Commander has no open landing square.');
        return;
      }
      consumeTactic(piece);
      batlethMoveArmed=true;
      selectedPiece=piece;
      legal=moveTargets;
      scanMode=false;
      abilityMoveMode=false;
      scanTargets=[];
      renderBoard();
      updateConsole(piece);
      updateStatus(
        'BAT’LETH',
        'MOVE THE COMMANDER',
        'After the move, the Commander attacks every enemy in the surrounding 1-square radius.'
      );
      log(piece.name+' revealed permanently and readied the Bat’leth sweep.');
      return;
    }

    const result=previousUseCommanderTactic(piece);
    if(piece.revealed)piece.tacticRevealed=true;
    return result;
  };

  /* The core warp confirmation UI is reused only as a confirmation shell;
     Picard commits a normal long-distance move/attack with no teleport FX. */
  const previousChooseWarpTarget=chooseWarpTarget;
  chooseWarpTarget=function(r,c){
    if(setup.tactic==='picardManeuver'&&selectedPiece&&selectedPiece.id==='FC'&&abilityMoveMode){
      const target=board[r]&&board[r][c];
      pendingConfirm={type:'picard',r,c,piece:selectedPiece};
      showConfirm(
        'PICARD MANEUVER',
        target
          ? 'Attack the enemy at '+(c+1)+','+(ROWS-r)+'?'
          : 'Move to '+(c+1)+','+(ROWS-r)+'?',
        target?'ATTACK':'ENGAGE',
        ()=>confirmPending()
      );
      return;
    }
    return previousChooseWarpTarget(r,c);
  };

  const previousConfirmPending=confirmPending;
  confirmPending=function(){
    if(pendingConfirm&&pendingConfirm.type==='picard'){
      const action=pendingConfirm;
      pendingConfirm=null;
      hideConfirm();
      if(!action.piece||!legal.some(cell=>cell.r===action.r&&cell.c===action.c))return;
      abilityMoveMode=false;
      selectedPiece=null;
      legal=[];
      if(typeof bw115SyncMarkerMode==='function')bw115SyncMarkerMode();
      performAction(action.piece,action.r,action.c);
      return;
    }
    return previousConfirmPending();
  };

  /* Cancelling a one-shot targeting choice must not leave an invisible mode
     armed. The tactic is already spent when activated, matching Warp/Scan. */
  const previousCancelConfirm=cancelConfirm;
  cancelConfirm=function(){
    const picardCancel=!!(
      setup.tactic==='picardManeuver'&&
      selectedPiece&&selectedPiece.id==='FC'&&abilityMoveMode
    );
    const result=previousCancelConfirm();
    if(picardCancel){
      clearTargeting();
      selectedPiece=null;
      renderBoard();
      updateConsole(null);
      updateStatus(
        playerTeam().toUpperCase()+' ACADEMY TURN',
        'PICARD MANEUVER CANCELLED',
        'The once-per-match tactic has been spent. Choose a unit to continue.'
      );
    }
    return result;
  };

  /* Empty-board cancellation in the simple-click controller follows the same
     cleanup path as the confirmation panel. */
  if(typeof bw116CancelAbility==='function'){
    const previousCancelAbility=bw116CancelAbility;
    bw116CancelAbility=function(render=true){
      const picardCancel=!!(
        setup.tactic==='picardManeuver'&&
        selectedPiece&&selectedPiece.id==='FC'&&abilityMoveMode
      );
      const result=previousCancelAbility(render);
      if(picardCancel&&render){
        updateStatus(
          playerTeam().toUpperCase()+' ACADEMY TURN',
          'PICARD MANEUVER CANCELLED',
          'The once-per-match tactic has been spent. Choose a unit to continue.'
        );
      }
      return result;
    };
  }

  /* Commander combat treats each live Sabotage charge exactly like the Tech
     Engineer mine counter, without permanently changing the unit's class. */
  const previousResolveCombat=resolveCombat;
  resolveCombat=function(attacker,defender){
    const sabotageMine=!!(
      attacker&&defender&&defender.mine&&isCommander(attacker)&&
      Number(attacker.sabotageCharges)>0
    );
    const originalEngineer=attacker&&attacker.engineer;
    if(sabotageMine)attacker.engineer=true;
    const result=previousResolveCombat(attacker,defender);
    if(sabotageMine){
      attacker.engineer=originalEngineer;
      attacker.sabotageCharges=Math.max(0,Number(attacker.sabotageCharges)-1);
      log('Sabotage Protocol disabled a Shield Mine. '+attacker.sabotageCharges+' charge'+(attacker.sabotageCharges===1?'':'s')+' remaining.');
      updateConsole(attacker);
    }
    return result;
  };

  /* Bat’leth uses a normal legal move first, then queues every adjacent enemy
     present at the landing square. Each strike uses the real combat resolver
     (including shields, mines, rank rules, captures, sounds, and game-over). */
  const previousPerformAction=performAction;
  performAction=function(piece,r,c){
    if(batlethMoveArmed&&commandTacticActive('batleth',piece)&&(board[r]&&board[r][c])){
      updateStatus(
        'BAT’LETH',
        'CHOOSE AN OPEN LANDING SPACE',
        'Move first; every enemy in the surrounding eight squares will then be attacked.'
      );
      return;
    }
    const batlethMove=batlethMoveArmed&&commandTacticActive('batleth',piece)&&!(board[r]&&board[r][c]);
    if(!batlethMove)return previousPerformAction(piece,r,c);

    batlethMoveArmed=false;
    batlethResolving=true;
    const oldPhase=phase;
    phase='combatfx';
    if(typeof bw115SkipNextActionAnimation!=='undefined')bw115SkipNextActionAnimation=true;

    const from={r:piece.r,c:piece.c};
    const sweepOrigin={r,c};
    board[from.r][from.c]=null;
    piece.r=r;piece.c=c;board[r][c]=piece;
    lastMoveGlow={r,c};
    playSound('movePiece',{volume:.72});
    log(moveTextFor(piece,from,{r,c},null));
    refreshTacticConsole(piece);

    const targets=adjacentEnemies(piece);
    let index=0;
    const strikeNext=()=>{
      if(!commanderOnBoard(piece)||phase==='gameover'||index>=targets.length){
        batlethResolving=false;
        if(phase!=='gameover')phase=oldPhase;
        finishPlayerTurn();
        return;
      }
      const target=targets[index++];
      if(!target||!inBounds(target.r,target.c)||board[target.r][target.c]!==target){
        strikeNext();
        return;
      }
      updateStatus('BAT’LETH SWEEP','ADJACENT STRIKE '+index+' / '+targets.length,'Every enemy within one square is challenged.');
      playSound('batleth',{volume:.94});
      previousResolveCombat(piece,target);
      if(phase!=='gameover'&&commanderOnBoard(piece)&&
         (piece.r!==sweepOrigin.r||piece.c!==sweepOrigin.c)){
        board[piece.r][piece.c]=null;
        piece.r=sweepOrigin.r;piece.c=sweepOrigin.c;
        board[sweepOrigin.r][sweepOrigin.c]=piece;
      }
      refreshTacticConsole(piece);
      window.setTimeout(strikeNext,240);
    };

    if(!targets.length){
      log('Bat’leth sweep found no adjacent enemies.');
      window.setTimeout(strikeNext,120);
    }else{
      log('Bat’leth sweep engaged '+targets.length+' adjacent enem'+(targets.length===1?'y.':'ies.'));
      window.setTimeout(strikeNext,180);
    }
  };

  /* The click-control layer normally replaces legal movement with getLegal().
     Keep the armed Bat’leth move selection intact for the Commander. */
  const previousStartPiecePointer=startPiecePointer;
  startPiecePointer=function(event,piece){
    if(batlethMoveArmed&&commandTacticActive('batleth',piece)){
      event.preventDefault();event.stopPropagation();
      suppressNextBoardClick=true;
      selectedPiece=piece;
      legal=batlethMoveTargets(piece);
      scanMode=false;abilityMoveMode=false;scanTargets=[];
      renderBoard();updateConsole(piece);
      return;
    }
    if(batlethMoveArmed){
      event.preventDefault();event.stopPropagation();
      suppressNextBoardClick=true;
      updateStatus('BAT’LETH','MOVE THE COMMANDER','This activation belongs to the Commander. Choose one of the highlighted destination squares.');
      return;
    }
    return previousStartPiecePointer(event,piece);
  };

  const previousUpdateConsole=updateConsole;
  updateConsole=function(piece){
    const result=previousUpdateConsole(piece);
    if(isCommander(piece)&&piece.team===playerTeam()&&Number(piece.sabotageCharges)>0){
      const uses=document.getElementById('consoleUses');
      if(uses)uses.textContent=(uses.textContent?uses.textContent+'  | ':'')+'SABOTAGE: '+piece.sabotageCharges+'/2';
    }
    return result;
  };

  const previousInitGame=initGame;
  initGame=function(){
    batlethMoveArmed=false;
    batlethResolving=false;
    return previousInitGame();
  };

  const previousEndGame=endGame;
  endGame=function(message){
    batlethMoveArmed=false;
    batlethResolving=false;
    return previousEndGame(message);
  };

  window.BW189TacticRules={
    lineTargets,
    batlethMoveTargets,
    adjacentEnemies,
    isBatlethArmed:()=>batlethMoveArmed,
    isBatlethResolving:()=>batlethResolving
  };
})();
