/* Chiptune SFX: short square/triangle envelopes with restrained levels. */
(() => {
 let ctx,bus,volume=.65,enabled=true,lastClink=-1;
 function ensure(){
  if(!ctx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;ctx=new C();bus=ctx.createGain();bus.gain.value=enabled?volume:0;const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-14;limiter.ratio.value=8;bus.connect(limiter).connect(ctx.destination);}
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});return ctx;
 }
 function tone(f,t,d,type='square',v=.035,end=f){
  if(!enabled||!ctx)return;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(f,t);osc.frequency.exponentialRampToValueAtTime(Math.max(25,end),t+d);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(v,t+.005);gain.gain.exponentialRampToValueAtTime(.0001,t+d);osc.connect(gain).connect(bus);osc.start(t);osc.stop(t+d+.01);osc.onended=()=>{osc.disconnect();gain.disconnect();};
 }
 function cue(notes,delay=.055,type='square'){if(!enabled||!ensure())return;const t=ctx.currentTime;notes.forEach((f,i)=>tone(f,t+i*delay,.18,type,.035));}
 window.CrystalAudio={
  unlock:ensure,
  hover(){cue([880],.04,'triangle');},
  click(){cue([523,784],.04,'triangle');},
  start(){cue([262,392,523,784,1047],.08,'triangle');},
  grab(){cue([659,988],.025,'triangle');},
  drop(){cue([988,659],.025,'triangle');},
  setEnabled(v){enabled=v;if(bus)bus.gain.setTargetAtTime(v?volume:0,ctx.currentTime,.025);},
  setVolume(v){volume=Math.max(0,Math.min(1,v));if(bus)bus.gain.setTargetAtTime(enabled?volume:0,ctx.currentTime,.025);},
  clink(){if(!enabled||!ensure()||ctx.currentTime-lastClink<.065)return;lastClink=ctx.currentTime;tone(1568,ctx.currentTime,.065,'square',.023,1175);tone(3136,ctx.currentTime,.1,'triangle',.03);},
  shatter(){cue([784,988,1175,1568],.04);if(ctx){const t=ctx.currentTime;[2350,1760,1175].forEach((f,i)=>tone(f,t+.2+i*.045,.13,'triangle',.035,f/2));}},
  launch(){if(!enabled||!ensure())return;tone(180,ctx.currentTime,.16,'triangle',.08,800);},
  splash(){if(!enabled||!ensure())return;[950,1430,620,390].forEach((f,i)=>tone(f,ctx.currentTime+i*.025,.12,'triangle',.045,100));},
  reward(n){cue([262,330,392,523,659].slice(0,Math.max(2,n+1)),.06,'triangle');},
  error(){cue([220,165],.065,'triangle');},finale(){cue([262,330,392,523,659,784],.1,'triangle');},
  get enabled(){return enabled;}
 };

 function getAssetUrl(relPath) {
  try {
   const base = (typeof document !== 'undefined' && (document.querySelector('base')?.href || document.baseURI)) || (typeof location !== 'undefined' ? location.href : '');
   if (base) return new URL(relPath, base).href;
  } catch {}
  return relPath;
 }

 const hasAudio = typeof Audio !== 'undefined';
 const menuTrack = hasAudio ? new Audio(getAssetUrl('assets/audio/musica-menu.mp3')) : null;
 if (menuTrack) {
  menuTrack.loop = true;
  menuTrack.preload = 'auto';
  menuTrack.setAttribute?.('playsinline', '');
  menuTrack.playsInline = true;
 }
 let menuVol = 0.65;
 if (menuTrack) menuTrack.volume = menuVol;

 let unlockActive = false;
 function setupInteractionUnlock() {
  if (unlockActive || typeof window === 'undefined') return;
  unlockActive = true;
  const events = ['click', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'keydown'];
  const handler = () => {
   ensure();
   if (!document.body?.dataset?.screen || document.body.dataset.screen === 'home') {
    if (menuTrack && menuTrack.paused) {
     menuTrack.volume = menuVol;
     menuTrack.play().then(() => { teardown(); }).catch(() => {});
     return;
    }
   }
   if (menuTrack && !menuTrack.paused) {
    teardown();
   }
  };
  function teardown() {
   unlockActive = false;
   events.forEach(ev => {
    window.removeEventListener(ev, handler, true);
    document.removeEventListener(ev, handler, true);
   });
  }
  events.forEach(ev => {
   window.addEventListener(ev, handler, { capture: true, passive: true });
   document.addEventListener(ev, handler, { capture: true, passive: true });
  });
 }

 window.CrystalMenuAudio = {
  get track() { return menuTrack; },
  get playing() { return Boolean(menuTrack && !menuTrack.paused); },
  play() {
   if (!menuTrack) return Promise.resolve();
   if (typeof document !== 'undefined' && document.body?.dataset?.screen && document.body.dataset.screen !== 'home') {
    return Promise.resolve();
   }
   menuTrack.volume = menuVol;
   return menuTrack.play().catch(() => {
    setupInteractionUnlock();
   });
  },
  pause() {
   if (menuTrack) menuTrack.pause();
  },
  stop() {
   if (menuTrack) {
    menuTrack.pause();
    menuTrack.currentTime = 0;
   }
  },
  setVolume(v) {
   menuVol = Math.max(0, Math.min(1, Number(v) || 0));
   if (menuTrack) menuTrack.volume = menuVol;
  },
  autoStart() {
   if (!menuTrack) return;
   menuTrack.volume = menuVol;
   const p = menuTrack.play();
   if (p && typeof p.catch === 'function') {
    p.catch(() => {
     setupInteractionUnlock();
    });
   }
  }
 };

 if (typeof window !== 'undefined') {
  setupInteractionUnlock();
  if (document.readyState === 'loading') {
   window.addEventListener('DOMContentLoaded', () => window.CrystalMenuAudio?.autoStart?.());
  } else {
   window.CrystalMenuAudio?.autoStart?.();
  }
 }
})();