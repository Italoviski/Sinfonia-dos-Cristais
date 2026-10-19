(() => {
 // Provisional balancing values, intentionally kept separate from the rules.
 const balance=Object.freeze({maximum:1000,invalidConnection:60,hint:100,stars:[300,600,900]});
 let points=balance.maximum,hints=0,errors=0;
 const hud=document.createElement('div');hud.className='phase-score';hud.innerHTML='<output aria-live="polite"></output><progress max="1000" aria-label="Pontos da fase"></progress><button type="button" class="score-hint" aria-label="Pedir uma dica. Custa 100 pontos.">Dica</button>';document.querySelector('.game-bar').insertBefore(hud,document.getElementById('levelNumber'));
 function render(){hud.querySelector('output').textContent=`${points} pontos · ${balance.stars.filter(n=>points>=n).length}/3 ★`;hud.querySelector('progress').value=points;}
 window.CrystalScore={balance,start(onHint){points=balance.maximum;hints=errors=0;hud.querySelector('button').onclick=()=>{if(window.CrystalBoard?.paused||window.CrystalBoard?.finished)return;hints++;points=Math.max(0,points-balance.hint);render();onHint?.();};render();},mistake(){errors++;points=Math.max(0,points-balance.invalidConnection);render();},result(music){const final=music?Math.round((points+(music.possible?music.points/music.possible*balance.maximum:0))/2):points;return {points:final,stars:balance.stars.filter(n=>final>=n).length,hints,errors,...(music?{music}:{} )};}};
 render();
})();
