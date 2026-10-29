(() => {
 'use strict';
 const $=id=>document.getElementById(id),KEY='crystal-campaign-v4',campaign=CrystalCampaign;
 const defaults={music:.65,fx:.65,voice:false,contrast:false,motion:false,assist:false};
 let settings={...defaults},completed=[],records={},current=1,screen='home',customLevel=null,toastTimer,checkpoint=null,showFallback;
 let save;
 try{save=JSON.parse(localStorage.getItem(KEY));}catch{}
 if(save){settings={...defaults,...cleanSettings(save.settings)};completed=cleanProgress(save.completed);records=save.records&&typeof save.records==='object'?save.records:{};current=Math.min(21,Math.max(1,Number(save.current)||1));}
 let engine=new KineticGame($('playfield'),{
  message:notify,describe:speak,
  mistake(){CrystalScore.mistake();},
  progress(count,total,index){$('stepLights').children[index]?.classList.add('lit');const item=$('resolvedSteps').children[index];if(item){item.classList.add('done');item.setAttribute('aria-label',engine.level.goals[index]+' concluído');}CrystalAudio.reward(count);CrystalMusic.setLayers(count);updateRestoration(count/total);if(engine.level&&!engine.finished)speak(engine.level.goals[index]+' concluído.');},
  complete:completeLevel,
  timer(left){$('timer').hidden=false;$('timer').textContent=left+' s';},
  timeout(){notify('O tempo acabou. Vamos tentar de novo? Você também pode ativar Ritmo tranquilo.');$('retryButton').focus();}
 });
 CrystalMusic.init();applySettings();renderMap();
 window.CrystalMenuAudio?.setVolume?.(settings.music);
 window.CrystalMenuAudio?.autoStart?.();
 const stepsToggle=document.createElement('button');stepsToggle.className='steps-toggle';stepsToggle.textContent='Etapas';stepsToggle.setAttribute('aria-expanded','false');stepsToggle.setAttribute('aria-controls','phaseSteps');$('resolvedSteps').closest('aside').id='phaseSteps';$('game').append(stepsToggle);stepsToggle.onclick=()=>{const expanded=document.body.classList.toggle('steps-open');stepsToggle.setAttribute('aria-expanded',String(expanded));};
 function cleanSettings(s){const out={};for(const k of ['music','fx'])if(Number.isFinite(s?.[k]))out[k]=Math.max(0,Math.min(1,s[k]));for(const k of ['voice','contrast','motion','assist'])if(typeof s?.[k]==='boolean')out[k]=s[k];return out;}
 function cleanProgress(list){return Array.isArray(list)?[...new Set(list.filter(n=>Number.isInteger(n)&&n>=1&&n<=21))]:[];}
 function unlocked(){let n=1;while(completed.includes(n)&&n<20)n++;return n;}
 function notify(message){$('feedback').textContent=message;$('feedback').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('feedback').classList.remove('visible'),4300);speak(message);}
 function speak(text){if(!settings.voice||!('speechSynthesis'in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='pt-BR';u.rate=.95;speechSynthesis.speak(u);}
 function persist(){
  try{localStorage.setItem(KEY,JSON.stringify({version:4,settings,completed,current,records}));return true;}catch{return false;}
 }
 function goto(name){
  CrystalStory.close();CrystalRhythm.stop();
  if(name!=='home')window.CrystalMenuAudio?.pause?.();
  if(name!=='map')CrystalJourney.close();
  if(name!=='game')window.CaveChapter1?.deactivateCanvas?.();
  if(screen==='game'&&name!=='game'){persist();engine.stop();CrystalMusic.reset();}
  screen=name;document.body.dataset.screen=name;for(const id of ['home','map','game'])$(id).hidden=id!==name;
  if(name==='map'){renderMap();setTimeout(()=>$('levelNodes').querySelector('.current')?.focus(),0);}
  if(name==='home'){$('homeSave').textContent=completed.length?completed.length+' de 20 fases restauradas. Seu caminho está salvo.':'Sua jornada começa com um pequeno brilho.';$('playButton').focus();window.CrystalMenuAudio?.play?.();}
 }
 function startFromMap(id){
  if(id===21?![5,10,15,20].every(n=>completed.includes(n)):id>unlocked()){notify('Siga as luzes na ordem para aprender cada movimento.');return;}
  if(window.CaveChapter1&&id>=1&&id<=4){
   window.CrystalMenuAudio?.pause?.();
   CrystalStory.close();CrystalRhythm.stop();CrystalJourney.close();
   if(screen==='game'){engine.stop();CrystalMusic.reset();}
   current=id;screen='game';persist();
   for(const s of ['home','map','game'])$(s).hidden=true;
   document.body.dataset.screen='game';
   if(id===1)window.CaveChapter1.startCutsceneAndFase1();
   else if(id===2)window.CaveChapter1.startFase2();
   else if(id===3)window.CaveChapter1.startFase3();
   else window.CaveChapter1.startFase4();
   return;
  }
  window.CaveChapter1?.deactivateCanvas?.();
  startLevel(id);
 }
 function renderMap(){
  CrystalJourney.render({completed,current,unlocked:unlocked(),records,reduced:settings.motion,start:startFromMap,notify});
  window.TruePixelEngine?.ActorAnimator?.adaptMapFairyIcon?.();
  $('mapProgress').textContent=completed.filter(id=>id<=20).length+' / 20 fases restauradas';
 }
 function startLevel(id,imported=null,snapshot=null){
  window.CrystalMenuAudio?.pause?.();
  if(!imported&&(id===21?![5,10,15,20].every(n=>completed.includes(n)):id>unlocked())){notify('Siga as luzes na ordem para aprender cada movimento.');return;}
  window.CaveChapter1?.deactivateCanvas?.();
  current=id;customLevel=imported;const level=imported||campaign.levels[id-1];if(!level)return;
  CrystalStory.close();CrystalRhythm.stop();
  CrystalScenery.load(level.final?'door':level.scene,level);CrystalStage.load(level,settings);CrystalScore.start(()=>notify(level.hint));
  screen='game';for(const s of ['home','map','game'])$(s).hidden=s!=='game';document.body.dataset.screen='game';document.body.classList.remove('musical-show');
  $('levelTitle').textContent=level.name;$('worldName').textContent=campaign.worlds[level.world].name;$('levelNumber').textContent=id===21?'FINAL':String(id).padStart(2,'0')+' / 20';$('hintText').textContent=level.hint;$('worldBackdrop').dataset.world=level.world;
  $('stepLights').replaceChildren();$('resolvedSteps').replaceChildren();level.goals.forEach(goal=>{const e=document.createElement('span');e.className='step-light';e.title=goal;$('stepLights').append(e);const item=document.createElement('li');item.textContent=goal;$('resolvedSteps').append(item);});$('timer').hidden=!level.time||settings.assist;makeEcology(level.world);
  CrystalMusic.reset();CrystalMusic.setRhythm(level.kind==='rhythm'||!!level.rhythm);engine.load(level,settings,snapshot);CrystalMusic.setLayers(engine.earned.size);engine.earned.forEach(i=>$('stepLights').children[i]?.classList.add('lit'));updateRestoration(engine.earned.size/level.goals.length);
  engine.earned.forEach(i=>$('resolvedSteps').children[i]?.classList.add('done'));
  $('tools').replaceChildren();const names={drag:'✥ Arrastar',launch:'➶ Lançar',cut:'╱ Cortar',shake:'↔ Dividir',rotate:'↻ Girar'};
  level.tools.forEach(tool=>{const b=document.createElement('button');b.textContent=names[tool];b.setAttribute('aria-pressed',String(engine.tool===tool));b.onclick=()=>{engine.tool=tool;for(const e of $('tools').children)e.setAttribute('aria-pressed',String(e===b));const hints={drag:'Arraste e solte: o cristal fica onde você deixou.',launch:'Puxe para trás e solte para lançar. No teclado: setas apontam e Espaço lança.',cut:'Deslize uma linha sobre a água-marinha. No teclado, selecione a gema e pressione C.',shake:'Toque duas vezes, segure e chacoalhe o citrino. No teclado, pressione Q.',rotate:'Clique no topázio ou use a roda do mouse. No teclado, R gira.'};notify(hints[tool]);};$('tools').append(b);});
  engine.gems.find(g=>!g.dark)?.el.focus();speak(level.hint);persist();if(!CrystalEntrance.active)beginIntro();
 }
 async function beginIntro(){const id=current;engine.paused=true;CrystalMusic.pause();await CrystalStory.intro(id,{speak});if(current!==id||screen!=='game')return;engine.paused=engine.finished; if(!engine.finished)CrystalMusic.resume();}
 function makeEcology(world){let host=$('ecology');if(!host){host=document.createElement('div');host.id='ecology';host.setAttribute('aria-hidden','true');$('game').insertBefore(host,$('game').querySelector('header'));}host.replaceChildren();
  const sprites=[[0,1,2,1,2],[4,3,11,3,4],[6,6,6,6,8],[10,10,10,10,10]][world];
  sprites.forEach((sprite,i)=>{const el=document.createElement('div');el.className='ecology-sprite life';el.style.backgroundPosition=`${sprite%4*100/3}% ${Math.floor(sprite/4)*50}%`;el.style.left=(5+i*20)+'%';el.style.bottom=(world===3?20+i%2*18:3+i%2*4)+'%';if(world===3){el.style.width='25vw';el.style.height='25vw';}host.append(el);});
  if(world>0)for(let i=0;i<5;i++){const sprite=world===1?5:world===2?7:9;const el=document.createElement('div');el.className='ecology-sprite damage';el.style.backgroundPosition=`${sprite%4*100/3}% ${Math.floor(sprite/4)*50}%`;el.style.left=(5+i*20)+'%';el.style.bottom=(world===3?15+i%2*25:5)+'%';host.append(el);}
 }
 function updateRestoration(part){if(!engine.level)return;const world=engine.level.world;const healed=completed.filter(n=>Math.floor((n-1)/5)===world).length;const amount=Math.min(1,(healed+part)/5);
  CrystalScenery.setProgress(engine.level.boss&&current!==5?part*.5:part);CrystalStage.restore(engine.level.boss?part*.5:part);
  $('worldBackdrop').style.filter=`saturate(${.15+amount*.9}) brightness(${.45+amount*.7})`;$('worldBackdrop').style.opacity=.35+part*.35;$('pollution').style.opacity=Math.max(.08,.65-part*.5-amount*.12);
  $('ecology')?.querySelectorAll('.life').forEach((e,i)=>{const visible=(i+1)/5<=Math.max(part,amount);e.style.opacity=visible?'1':'0';e.style.transform=visible?'scale(1)':'scale(.2)';});$('ecology')?.querySelectorAll('.damage').forEach((e,i)=>e.style.opacity=(i+1)/5<=Math.max(part,amount)?'0':'.85');
 }
 function recordCompletion(result){engine.rewardCompletion();if(!customLevel&&!completed.includes(current))completed.push(current);if(result&&(!records[current]||records[current].points<result.points))records[current]=result;checkpoint=null;persist();}
 async function completeLevel(){
  const id=current;engine.paused=true;CrystalMusic.reset();
  if(engine.level.boss){await CrystalStory.beforeMusic(id,{speak});if(current!==id||screen!=='game')return;CrystalRhythm.start({levelId:id,world:engine.level.world,volume:settings.music,assist:settings.assist,hard:id>=15,onCancel:()=>goto('map'),onProgress:ratio=>{CrystalScenery.setProgress(.5+ratio*.5);CrystalStage.restore(.5+ratio*.5);},gems:[...new Set(engine.level.pieces.map(p=>p.kind))]},async music=>{if(current!==id)return;const result=CrystalScore.result(music);CrystalScenery.setProgress(1);CrystalStage.restore(1);recordCompletion(result);await CrystalStory.afterMusic(id,{speak});if(current===id&&screen==='game')showResult(result);});}
  else{const result=CrystalScore.result();recordCompletion(result);showResult(result);}
 }
 function showResult(result){$('resultTitle').textContent=current===21?'As quatro gemas cantam juntas!':'Mais um pedaço do mundo despertou!';$('resultText').textContent=campaign.worlds[engine.level.world].healed+(result?` ${result.points} pontos · ${result.stars} de 3 estrelas.`:'');$('nextLevel').textContent=current>=20?'Voltar ao mapa':'Continuar jornada';$('resultDialog').showModal();}
 async function unlockAudio(){try{CrystalAudio.unlock();await CrystalMusic.unlock();}catch{notify('O áudio não está disponível. Você pode continuar jogando sem som.');}}
 function startShow(){
  engine.paused=true;document.body.classList.add('musical-show');$('playfield').inert=true;clearTimeout(showFallback);
  CrystalMusic.reset();CrystalMusic.pause();CrystalShowdown.start(finishShow);
  $('leaveShow').focus();speak('Sua composição está completa. Começa a apresentação com vocal.');
 }
 function finishShow(){if(!document.body.classList.contains('musical-show'))return;clearTimeout(showFallback);CrystalShowdown.stop();CrystalMusic.stopShow();CrystalMusic.setLayers(0);CrystalMusic.resume();document.body.classList.remove('musical-show');$('playfield').inert=false;
  $('resultTitle').textContent=current===20?'O céu encontrou sua canção!':'Mais um pedaço do mundo despertou!';$('resultText').textContent=campaign.worlds[engine.level.world].healed;$('nextLevel').textContent=current===20||customLevel?'Voltar ao mapa':'Continuar jornada';$('resultDialog').showModal();
 }
 function applySettings(){document.body.classList.toggle('high-contrast',settings.contrast);document.body.classList.toggle('reduce-motion',settings.motion);engine.options=settings;CrystalAudio.setVolume(settings.fx);CrystalMusic.setVolume(settings.music);CrystalShowdown.setVolume(settings.music);window.CrystalMenuAudio?.setVolume?.(settings.music);
  for(const [id,k]of [['voiceToggle','voice'],['contrastToggle','contrast'],['motionToggle','motion'],['assistToggle','assist']])$(id).checked=settings[k];for(const k of ['music','fx']){$(k+'Volume').value=Math.round(settings[k]*100);$(k+'Value').textContent=Math.round(settings[k]*100)+'%';}
  if(engine.level)$('timer').hidden=!engine.level.time||settings.assist;
 }
 function openSettings(){persist();engine.paused=true;CrystalMusic.pause();$('fileStatus').textContent='';$('settingsDialog').showModal();}
 $('settingsDialog').addEventListener('close',()=>{engine.paused=false;CrystalMusic.resume();if(engine.level?.time&&engine.elapsed>=engine.level.time&&!settings.assist)engine.paused=true;persist();});
 for(const tab of ['sound','access']){$(tab+'Tab').onclick=()=>{for(const t of ['sound','access']){$(t+'Tab').setAttribute('aria-selected',String(t===tab));$(t+'Tab').tabIndex=t===tab?0:-1;$(t+'Panel').hidden=t!==tab;}};$(tab+'Tab').onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const other=tab==='sound'?'access':'sound';$(other+'Tab').click();$(other+'Tab').focus();}};}
 document.querySelectorAll('[data-settings]').forEach(b=>b.onclick=openSettings);
 document.querySelectorAll('[data-home]').forEach(b=>b.onclick=()=>goto('home'));
 for(const [id,k]of [['voiceToggle','voice'],['contrastToggle','contrast'],['motionToggle','motion'],['assistToggle','assist']])$(id).onchange=e=>{settings[k]=e.target.checked;applySettings();persist();if(k==='voice'&&settings.voice)speak('Narrador ativado.');};
 for(const k of ['music','fx'])$(k+'Volume').oninput=e=>{settings[k]=Number(e.target.value)/100;applySettings();persist();};
 $('testSound').onclick=()=>CrystalAudio.shatter();
 $('playButton').onclick=()=>{unlockAudio();goto('map');};$('creditsButton').onclick=()=>$('creditsDialog').showModal();$('exitButton').onclick=()=>{const ok=persist();$('exitDialog').querySelector('p').textContent=ok?'Seu progresso foi guardado neste navegador. O estoque de Diamantes vale apenas nesta sessão.':'O navegador não permitiu salvar o progresso. Ele será perdido ao fechar esta aba.';$('exitDialog').showModal();};
 $('mapButton').onclick=()=>goto('map');
 $('retryButton').onclick=()=>{
  if(window.CaveChapter1?.isActiveGame?.()){
   window.CaveChapter1.restartCurrentPhase();
   return;
  }
  startLevel(current,customLevel);
 };
 $('leaveShow').onclick=finishShow;window.addEventListener('crystal-show-ended',finishShow);
 $('nextLevel').onclick=()=>{$('resultDialog').close();if(current>=20||customLevel)goto('map');else startLevel(current+1);};$('resultMap').onclick=()=>{$('resultDialog').close();goto('map');};$('watchShow').onclick=()=>{$('resultDialog').close();startShow();};
 $('resultDialog').addEventListener('cancel',()=>goto('map'));
 document.addEventListener('pointerdown',()=>{if(!$('settingsDialog').open)unlockAudio();},{once:true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!CrystalEntrance.active&&!CrystalRhythm.active&&!document.querySelector('dialog[open]')&&screen==='game'&&!document.body.classList.contains('musical-show'))openSettings();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)persist();else if($('settingsDialog').open)CrystalMusic.pause();});
 window.addEventListener('pagehide',persist);setInterval(()=>{if(screen==='game'&&engine.active&&!engine.paused)persist();},3000);
 // No phase file import/export. Only campaign progress is stored locally.
 const freshStart=startLevel;
 $('playButton').onclick=()=>{if(CrystalEntrance.active)return;if(window.CrystalAssetsReady===false)return;window.CrystalMenuAudio?.pause?.();unlockAudio();CrystalShowdown.unlock();CrystalAudio.start();CrystalEntrance.play(()=>{freshStart(1);engine.paused=true;CrystalMusic.pause();},()=>{beginIntro();});};
 $('homeSave').textContent=completed.length?completed.length+' de 20 fases restauradas. Seu caminho está salvo.':'Sua jornada começa com um pequeno brilho.';
 function syncProgress(ids=[],nextCurrent=null){
  for(const raw of ids){const n=Number(raw);if(Number.isInteger(n)&&n>=1&&n<=21&&!completed.includes(n))completed.push(n);}
  if(Number.isInteger(nextCurrent)&&nextCurrent>=1&&nextCurrent<=21)current=nextCurrent;
  persist();
  if($('mapProgress'))$('mapProgress').textContent=completed.filter(id=>id<=20).length+' / 20 fases restauradas';
  if($('homeSave'))$('homeSave').textContent=completed.length?completed.length+' de 20 fases restauradas. Seu caminho está salvo.':'Sua jornada começa com um pequeno brilho.';
  if(screen==='map')renderMap();
 }
 window.CrystalApp={goto,startLevel:freshStart,startFromMap,syncProgress,notify,openSettings,unlockAll(){completed=Array.from({length:20},(_,i)=>i+1);persist();renderMap();},get state(){return {completed:[...completed],current,screen,settings:{...settings}};}};
})();
