(() => {
 'use strict';
 // Targets are detected ahead of the audible track. A delay node gives players
 // the approach time without guessing the BPM of the supplied recording.
 const lead=1.35, track=new Audio('assets/audio/o-que-um-cristal-pode-fazer.mp3');
 track.preload='auto';
 const host=document.createElement('section');host.className='rhythm-stage';host.hidden=true;host.setAttribute('aria-label','Desafio musical');document.body.append(host);
 let context,analyser,gain,bins,active=false,paused=false,notes=[],lastOnset=-10,average=0,lastEnergy=0,frameId,callback,options={},serial=0,points=0,hits=0,total=0,endAt=Infinity,session=0,assistHold=null;
 const layout=[[.23,.32],[.65,.4],[.4,.7],[.76,.72],[.5,.25],[.2,.7]];
 function init(){if(context)return;context=new (window.AudioContext||window.webkitAudioContext)();const source=context.createMediaElementSource(track);analyser=context.createAnalyser();analyser.fftSize=512;analyser.smoothingTimeConstant=.2;bins=new Uint8Array(analyser.frequencyBinCount);const delay=context.createDelay(2);delay.delayTime.value=lead;gain=context.createGain();source.connect(analyser).connect(delay).connect(gain).connect(context.destination);}
 function message(text){host.querySelector('.rhythm-judgment').textContent=text;}
 function display(){host.querySelector('.rhythm-score').textContent=`${points} pontos · ${hits}/${total} acertos`;const fraction=total?points/(total*100):0;host.querySelector('progress').value=fraction;if(Number.isFinite(track.duration)&&track.duration>0)options.onProgress?.(Math.min(1,Math.max(0,(track.currentTime-lead)/track.duration)));}
 function target(time,practice=false){const id=serial++,el=document.createElement('button');el.className='rhythm-target';el.setAttribute('aria-label',`Cristal ${id+1}. Clique quando o círculo encontrar a base, ou pressione Espaço.`);const p=layout[id%layout.length];el.style.left=p[0]*100+'%';el.style.top=p[1]*100+'%';el.innerHTML='<span class="rhythm-base"></span><span class="rhythm-gem"></span><span class="rhythm-approach"></span>';
  const gem=el.querySelector('.rhythm-gem'),types=options.gems?.length?options.gems:['quartz'];const sprite={quartz:0,opal:3,aqua:4,citrine:2,emerald:5}[types[id%types.length]]??0;gem.style.backgroundPosition=`${sprite%3*50}% ${Math.floor(sprite/3)*50}%`;
  const note={el,time,practice,ring:el.querySelector('.rhythm-approach')};el.onpointerdown=e=>{e.preventDefault();e.stopPropagation();hit(note);};el.onclick=e=>{if(e.detail===0)hit(note);};notes.push(note);host.append(el);if(!practice){total++;display();}}
 function remove(note){note.el.remove();notes=notes.filter(n=>n!==note);}
 function burst(note,value){
  const fx=document.createElement('div');fx.className='rhythm-hit';fx.style.left=note.el.style.left;fx.style.top=note.el.style.top;fx.setAttribute('aria-hidden','true');
  const label=document.createElement('strong');label.textContent=value===100?'PERFEITO!':value===70?'ÓTIMO!':'OK!';fx.append(label);
  for(let i=0;i<12;i++){const shard=document.createElement('i'),angle=i*Math.PI/6;shard.style.setProperty('--dx',Math.cos(angle)*85+'px');shard.style.setProperty('--dy',Math.sin(angle)*85+'px');shard.style.setProperty('--turn',i*67+'deg');fx.append(shard);}
  host.append(fx);setTimeout(()=>fx.remove(),850);
 }
 function hit(note){if(!active||paused||!notes.includes(note))return;const delta=Math.abs(context.currentTime-note.time),window=options.assist?.48:.26;
  if(note.practice){if(context.currentTime<note.time-window){message('Espere o círculo fechar. No treino, ele vai aguardar seu toque.');return;}burst(note,100);remove(note);message('Perfeito! Agora acompanhe a música.');beginTrack();return;}
  const value=assistHold===note||delta<=(options.assist?.16:.075)?100:delta<=(options.assist?.3:.15)?70:delta<=window?50:0;points+=value;if(value)hits++;message(value===100?'Perfeito!':value===70?'Ótimo!':value===50?'OK!':'Cedo demais · 0');if(value){burst(note,value);CrystalAudio.reward(1);}remove(note);display();if(assistHold===note){assistHold=null;context.resume().then(()=>{if(active&&!paused&&endAt===Infinity)beginTrack();});}}
 async function beginTrack(){try{await track.play();}catch{message('Não foi possível iniciar o áudio. Pressione “Retomar” para tentar.');paused=true;host.querySelector('.rhythm-pause').textContent='Retomar';}}
 function finish(){const result={points,possible:total*100,hits,total,stars:total?Math.min(3,Math.floor(points/(total*100)*3.34)):0};const done=callback;stop();done?.(result);}
 function frame(){if(!active)return;if(!paused){const now=context.currentTime;
   if(!track.paused){analyser.getByteFrequencyData(bins);let energy=0;for(let i=2;i<90;i++)energy+=bins[i];energy/=88;average=average*.96+energy*.04;
    const gap=options.hard?.34:.65;if(energy>25&&energy>average*1.12&&energy-lastEnergy>2&&now-lastOnset>gap){lastOnset=now;target(now+lead);}lastEnergy=energy;
   }
   for(const note of [...notes]){const left=note.time-now;note.ring.style.transform=`scale(${1+Math.max(0,left)/lead*1.8})`;note.ring.style.opacity=left<-.26&&!options.assist&&!note.practice?'.25':'1';if(note.practice){if(left<=0&&!note.ready){note.ready=true;note.el.classList.add('practice-ready');message('Agora toque no cristal ou pressione Espaço para começar.');}continue;}if(options.assist&&left<=0&&!assistHold){assistHold=note;track.pause();context.suspend();message('Ritmo tranquilo: toque no cristal. Sem limite de tempo.');}if(!options.assist&&left<-.26){remove(note);message('Tempo esgotado · 0');display();}}
   if(now>=endAt&&notes.length===0)finish();
  }if(active)frameId=requestAnimationFrame(frame);
 }
 function stop(){session++;assistHold=null;if(active)document.querySelector('main').inert=false;CrystalStage.musical(false);active=false;track.pause();cancelAnimationFrame(frameId);notes.forEach(n=>n.el.remove());notes=[];host.hidden=true;context?.suspend();}
 async function pause(){if(!active)return;paused=!paused;host.querySelector('.rhythm-pause').textContent=paused?'Retomar':'Pausar';if(paused){track.pause();await context.suspend();}else if(!assistHold){await context.resume();if(!notes.some(n=>n.practice)&&endAt===Infinity)await beginTrack();}}
 track.onended=()=>{endAt=context.currentTime+lead+.6;};
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active&&!paused)pause();});
 document.addEventListener('keydown',e=>{if(!active||e.repeat)return;if(e.key==='Escape'){e.preventDefault();pause();return;}if(e.target.closest('button:not(.rhythm-target)'))return;if(e.key===' '||e.key==='Enter'){e.preventDefault();const note=notes.reduce((a,b)=>!a||Math.abs(b.time-context.currentTime)<Math.abs(a.time-context.currentTime)?b:a,null);if(note)hit(note);}});
 window.CrystalRhythm={async start(config,done){
  stop();const token=++session;options=config;callback=done;init();await context.resume();if(token!==session)return;
  gain.gain.value=config.volume??.65;track.currentTime=0;active=true;paused=false;serial=points=hits=total=0;average=lastEnergy=0;lastOnset=-10;endAt=Infinity;
  document.querySelector('main').inert=true;host.hidden=false;host.tabIndex=-1;CrystalStage.musical(true,()=>Math.max(0,track.currentTime-lead));
  host.innerHTML='<header><h2>O canto dos cristais</h2><p>Clique quando o anel alcançar o círculo de fundo · Espaço também funciona</p><output class="rhythm-score"></output><progress max="1" value="0" aria-label="Precisão musical"></progress><button class="rhythm-pause pixel-button">Pausar</button><button class="rhythm-exit pixel-button">Voltar ao mapa</button></header><p class="rhythm-judgment" role="status" aria-live="polite"></p>';
  host.querySelector('.rhythm-pause').onclick=pause;host.querySelector('.rhythm-exit').onclick=()=>{const cancel=options.onCancel;stop();cancel?.();};
  host.onpointerdown=e=>{if(e.target===host&&notes.length&&!notes[0].practice&&!paused)message('Lugar errado · 0');};display();message('Treino: encontre o momento certo.');target(context.currentTime+lead,true);host.focus();frame();
 },stop,get active(){return active;},get state(){return {active,paused,points,total,hits,visible:notes.length,assistWaiting:!!assistHold,trackPosition:track.currentTime,duration:track.duration,trackPaused:track.paused,audioError:track.error?.code||0,readyState:track.readyState,contextState:context?.state,hidden:document.hidden};}};
})();
