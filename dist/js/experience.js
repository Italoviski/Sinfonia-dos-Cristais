(() => {
 'use strict';
 const $=id=>document.getElementById(id),reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('reduce-motion');
 let entering=false;
 window.CrystalEntrance={get active(){return entering;},async play(reveal,ready){
  if(entering)return;entering=true;const main=document.querySelector('main');main.inert=true;
  const overlay=document.createElement('div');overlay.id='entryCinema';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Entrando na caverna');overlay.innerHTML='<div class="veil"></div><div class="portal"></div><button type="button">Pular animação</button>';document.body.append(overlay);
  const veil=overlay.querySelector('.veil'),portal=overlay.querySelector('.portal'),skip=overlay.querySelector('button');let skipped=false,shown=false;const animations=[];
  const run=(el,frames,duration,easing='ease-in-out')=>{if(skipped)return Promise.resolve();const a=el.animate(frames,{duration,fill:'forwards',easing});animations.push(a);return a.finished.catch(()=>{});};
  const show=()=>{if(!shown){shown=true;reveal();}};
  skip.focus();skip.onclick=()=>{skipped=true;animations.forEach(a=>a.finish());};
  try{
   await run(veil,[{opacity:0},{opacity:1}],reduced()?160:650);
   if(!reduced()&&!skipped){
    const rotation=portal.animate([{transform:'rotate(-12deg) scale(.98)'},{transform:'rotate(62deg) scale(1.08)'}],{duration:4700,fill:'forwards',easing:'linear'});animations.push(rotation);
    await run(portal,[{opacity:0},{opacity:1}],800);
    await run(portal,[{opacity:1},{opacity:1}],1850);
    await run(portal,[{opacity:1},{opacity:0}],700);
   }
   show();portal.remove();
   if(!reduced()&&!skipped){
    const top=document.createElement('div'),bottom=document.createElement('div');top.className='lid top';bottom.className='lid bottom';overlay.append(top,bottom);veil.style.opacity='0';animations.filter(a=>a.effect?.target===veil).forEach(a=>a.cancel());
    await Promise.all([run(top,[{transform:'translateY(0)'},{transform:'translateY(-12%)',offset:.25},{transform:'translateY(-8%)',offset:.4},{transform:'translateY(-105%)'}],1900),run(bottom,[{transform:'translateY(0)'},{transform:'translateY(12%)',offset:.25},{transform:'translateY(8%)',offset:.4},{transform:'translateY(105%)'}],1900)]);
   }else await run(veil,[{opacity:1},{opacity:0}],180);
  }finally{show();animations.forEach(a=>a.cancel());overlay.remove();main.inert=false;entering=false;ready();}
 }};

 const track=new Audio('assets/audio/o-que-um-cristal-pode-fazer.mp3');track.preload='metadata';
 let context,analyser,gain,bins,active=false,raf=0,onEnd,pausedByVisibility=false,generation=0;
 function init(){if(context)return;const C=window.AudioContext||window.webkitAudioContext;if(!C)return;context=new C();const source=context.createMediaElementSource(track);analyser=context.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.65;gain=context.createGain();source.connect(analyser).connect(gain).connect(context.destination);bins=new Uint8Array(analyser.frequencyBinCount);}
 function draw(){if(!active)return;const t=track.currentTime,host=$('showCrystals');if(analyser)analyser.getByteFrequencyData(bins);
  const crystals=[...host.children],width=host.clientWidth,height=host.clientHeight;
  crystals.forEach((el,i)=>{let power=0;const low=[1,4,10,22,45,12][i],high=[4,10,22,45,90,65][i];if(bins){for(let j=low;j<high;j++)power+=bins[j]/255;power/=high-low;}const prior=Number(el.dataset.energy)||0;const energy=Math.max(power,prior*.89);el.dataset.energy=energy;
   const angle=i/(crystals.length-1)*Math.PI*2+t*.09,orbit=i===crystals.length-1?0:1;const x=Math.cos(angle)*width*.34*orbit,y=Math.sin(angle)*height*.32*orbit;
   el.style.transform=`translate(calc(-50% + ${reduced()?Math.cos(i*1.256)*width*.34*orbit:x}px),calc(-50% + ${reduced()?Math.sin(i*1.256)*height*.32*orbit:y}px)) scale(${reduced()?1:1+energy*.3}) rotate(${reduced()?0:Math.sin(t*.8+i)*8}deg)`;
   el.style.filter=`brightness(${1+energy*.35}) drop-shadow(0 0 ${5+energy*20}px ${i===5?'#ffaaff':'#b6dfff'})`;
  });
  $('showProgress').style.width=(Number.isFinite(track.duration)?track.currentTime/track.duration*100:0)+'%';$('showAct').textContent=track.paused?'Apresentação pausada':t<12?'Cada encontro acende uma nova voz.':'Cristais, ritmo e voz em harmonia.';raf=requestAnimationFrame(draw);
 }
 window.CrystalShowdown={
  unlock(){try{init();return context?.resume().catch(()=>{});}catch{return Promise.resolve();}},
  async start(done){this.stop();onEnd=done;const token=++generation;active=true;track.currentTime=0;const host=$('showCrystals');host.replaceChildren();[0,2,4,5,7,8].forEach((sprite,i)=>{const el=document.createElement('div');el.className='show-crystal'+(i===5?' vocal':'');el.style.backgroundPosition=`${sprite%3*50}% ${Math.floor(sprite/3)*50}%`;host.append(el);});
   try{init();await context?.resume();if(token!==generation)return;await track.play();if(token!==generation){track.pause();return;}raf=requestAnimationFrame(draw);}catch{if(token!==generation)return;$('showAct').textContent='Não foi possível tocar a música. Use “Tentar áudio novamente”.';const retry=document.createElement('button');retry.className='pixel-button';retry.id='retryShowAudio';retry.textContent='Tentar áudio novamente';retry.onclick=()=>{retry.remove();this.start(done);};document.querySelector('.show-controls').append(retry);}
  },
  stop(){generation++;active=false;cancelAnimationFrame(raf);track.pause();$('retryShowAudio')?.remove();pausedByVisibility=false;},
  setVolume(v){track.volume=Math.max(0,Math.min(1,v));},
  get active(){return active;},get currentTime(){return track.currentTime;}
 };
 track.addEventListener('ended',()=>{if(active){const done=onEnd;CrystalShowdown.stop();done?.();}});
 document.addEventListener('visibilitychange',()=>{if(!active)return;if(document.hidden){pausedByVisibility=!track.paused;track.pause();}else if(pausedByVisibility){pausedByVisibility=false;track.play().catch(()=>{$('showAct').textContent='Áudio pausado. Conclua ou reveja a apresentação.';});}});
 let interacted=false,lastHover=0;
 document.addEventListener('pointerdown',()=>{interacted=true;CrystalAudio.unlock();},{once:true});
 document.addEventListener('keydown',()=>{interacted=true;CrystalAudio.unlock();},{once:true});
 document.addEventListener('pointerover',e=>{if(interacted&&e.target.closest('button')&&!e.target.closest('button')?.contains(e.relatedTarget)&&performance.now()-lastHover>100){lastHover=performance.now();CrystalAudio.hover();}});
 document.addEventListener('click',e=>{if(e.target.closest('button')&&e.target.closest('button').id!=='playButton')CrystalAudio.click();});
 $('pieces').addEventListener('pointerdown',()=>CrystalAudio.grab());
 $('playfield').addEventListener('pointerup',()=>CrystalAudio.drop());
})();
