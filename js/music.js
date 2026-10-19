/* Original composition: Órbita de Luz. All cues use the AudioContext clock. */
(() => {
  const beat = 60 / 96;
  const tracks = [
    { name:"Círculo • dó", frequency:130.8128, every:8, color:"#64e5ff", type:"triangle", duration:1.5 },
    { name:"Triângulo • mi", frequency:329.6276, every:4, color:"#ffd36b", type:"triangle", duration:.55 },
    { name:"Quadrado • sol", frequency:391.9954, every:3, color:"#ff85b0", type:"square", duration:.3 },
    { name:"Losango • lá", frequency:440, every:2, color:"#7cf4b7", type:"triangle", duration:.3 },
    { name:"Hexágono • ré", frequency:587.3295, every:6, color:"#c6a0ff", type:"triangle", duration:.65 }
  ];
  const paths = [
    '<circle cx="50" cy="50" r="34"/>',
    '<polygon points="50,12 89,82 11,82"/>',
    '<rect x="20" y="20" width="60" height="60" rx="3"/>',
    '<polygon points="50,8 87,50 50,92 13,50"/>',
    '<polygon points="30,15 70,15 91,50 70,85 30,85 9,50"/>',
    '<circle cx="50" cy="50" r="32"/><ellipse cx="50" cy="50" rx="15" ry="40"/><path d="M8 50 Q29 18 50 50 T92 50"/>'
  ];
  let ctx, master, bus, timer, raf, count=0, nextStep=0, epoch=0;
  let enabled=true, volume=.65, rhythm=false, started=false, mode="play", showStart=0, finished=false;
  let cues=[], lastPulse=Array(6).fill(-100), pendingShow=false, pausedAt=null;
  const nodes=new Set();
  const reduced=()=>document.body.classList.contains("reduce-motion") || matchMedia("(prefers-reduced-motion: reduce)").matches;
  function setup() {
    if(ctx)return;
    const Constructor=window.AudioContext || window.webkitAudioContext;
    if(!Constructor)throw Error("Áudio não disponível neste navegador.");
    ctx=new Constructor();
    master=ctx.createGain(); master.gain.value=enabled?volume:0;
    const compressor=ctx.createDynamicsCompressor();
    compressor.threshold.value=-16; compressor.ratio.value=5;
    master.connect(compressor).connect(ctx.destination);
    newBus();
  }
  function newBus() { bus=ctx.createGain();bus.connect(master); }
  function clearSound() {
    for(const osc of nodes) {try{osc.stop();}catch{}}
    nodes.clear();
    if(bus)bus.disconnect();
    if(ctx)newBus();
    cues=[];lastPulse.fill(-100);
  }
  function oscillator(f,t,d,type,volume) {
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=type;osc.frequency.value=f;
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(volume,t+.018);
    gain.gain.exponentialRampToValueAtTime(.0001,t+d);
    osc.connect(gain).connect(bus);nodes.add(osc);
    osc.onended=()=>{nodes.delete(osc);osc.disconnect();gain.disconnect();};
    osc.start(t);osc.stop(t+d+.03);
  }
  // Formant synthesis: a pitched glottal source filtered into sung ah/oh vowels.
  function vocal(f,t,d,vowel) {
    const osc=ctx.createOscillator(), envelope=ctx.createGain();
    osc.type="sawtooth";osc.frequency.setValueAtTime(f*.985,t);
    osc.frequency.exponentialRampToValueAtTime(f,t+.08);
    envelope.gain.setValueAtTime(.0001,t);
    envelope.gain.exponentialRampToValueAtTime(.16,t+.1);
    envelope.gain.setValueAtTime(.13,t+d*.7);
    envelope.gain.exponentialRampToValueAtTime(.0001,t+d);
    const filters=(vowel==="oh"?[450,800,2600]:[800,1150,2900]).map((hz,i)=>{
      const filter=ctx.createBiquadFilter(),gain=ctx.createGain();
      filter.type="bandpass";filter.frequency.value=hz;filter.Q.value=5+i;
      gain.gain.value=[1,.55,.16][i];
      osc.connect(filter).connect(gain).connect(envelope);
      return [filter,gain];
    });
    const vibrato=ctx.createOscillator(),depth=ctx.createGain();
    vibrato.frequency.value=5;depth.gain.value=3;
    vibrato.connect(depth).connect(osc.frequency);
    envelope.connect(bus);nodes.add(osc);nodes.add(vibrato);
    osc.onended=()=>{nodes.delete(osc);nodes.delete(vibrato);osc.disconnect();vibrato.disconnect();depth.disconnect();envelope.disconnect();filters.flat().forEach(n=>n.disconnect());};
    osc.start(t);vibrato.start(t);osc.stop(t+d+.05);vibrato.stop(t+d+.05);
  }
  function schedule() {
    if(!started || pausedAt!==null)return;
    const now=ctx.currentTime;
    if(epoch+nextStep*beat/2<now-.2) nextStep=Math.ceil((now-epoch)/(beat/2));
    while(epoch+nextStep*beat/2<now+.12) {
      const t=epoch+nextStep*beat/2;
      if(mode==="show" && nextStep>=64)break;
      if(rhythm&&mode==='play'&&nextStep%2===0)oscillator(nextStep%8===6?784:392,t,.08,'triangle',.045);
      tracks.slice(0,count).forEach((track,i)=>{
        if(nextStep%track.every!==0)return;
        oscillator(track.frequency,t,track.duration,track.type,.07);
        cues.push({time:t,id:i});
      });
      if(mode==="show" && nextStep%4===0) {
        const melody=[392,440,523.251,587.33,523.251,440,392,329.628,
          392,523.251,587.33,659.255,587.33,523.251,392,523.251];
        const k=nextStep/4;
        vocal(melody[k],t,beat*1.85,k%2?"oh":"ah");
        cues.push({time:t,id:5});
      }
      nextStep++;
    }
  }
  function buildShapes() {
    const host=document.getElementById("neonEnsemble");
    if(!host)return;
    host.innerHTML="";
    for(let i=0;i<6;i++) {
      const shape=document.createElement("div");
      shape.className="neon-musician";shape.dataset.voice=i;
      shape.style.setProperty("--neon",tracks[i]?.color || "#fff1cd");
      shape.innerHTML='<svg viewBox="0 0 100 100" aria-hidden="true">'+paths[i]+'</svg><span></span>';
      shape.querySelector("span").textContent=tracks[i]?.name || "Vocal • ah / oh";
      shape.setAttribute("role","img");shape.setAttribute("aria-label",tracks[i]?.name || "Vocal sintético melódico");
      host.append(shape);
    }
    updateShapes();
  }
  function updateShapes() {
    document.querySelectorAll(".neon-musician").forEach((el,i)=>el.hidden=i>=count && !(i===5 && mode==="show"));
  }
  function draw() {
    if(!ctx)return;
    const now=ctx.currentTime;
    while(cues.length && cues[0].time<=now) {
      const cue=cues.shift();lastPulse[cue.id]=cue.time;
    }
    const elapsed=mode==="show"?Math.max(0,now-showStart):0;
    document.querySelectorAll(".neon-musician").forEach((el,i)=>{
      const pulse=Math.exp(-Math.max(0,now-lastPulse[i])*5);
      el.style.setProperty("--pulse",pulse.toFixed(3));
      if(mode==="show" && !reduced()) {
        const angle=elapsed*.36+i*Math.PI/3;
        const radius=i===5?0:(elapsed<6?20:elapsed<14?27:18);
        el.style.left=(50+Math.cos(angle)*radius)+"%";
        el.style.top=(50+Math.sin(angle)*radius*.72)+"%";
        el.style.setProperty("--turn",(Math.sin(elapsed*.8+i)*18)+"deg");
      } else {el.style.left="";el.style.top="";el.style.setProperty("--turn","0deg");}
    });
    if(mode==="show") {
      const label=document.getElementById("showAct");
      label.textContent=elapsed<6?"I · As luzes se encontram":elapsed<14?"II · Uma só voz":"III · Órbita de luz";
      document.getElementById("showProgress").style.width=Math.min(100,elapsed/(beat*32+1.2)*100)+"%";
      if(!finished && elapsed>=beat*32+1.2) {
        finished=true;
        window.dispatchEvent(new CustomEvent("crystal-show-ended"));
      }
    }
    raf=requestAnimationFrame(draw);
  }
  async function unlock() {
    setup();
    await ctx.resume();
    if(!started) {
      started=true;epoch=ctx.currentTime+.08;nextStep=0;
      timer=setInterval(schedule,25);schedule();raf=requestAnimationFrame(draw);
    }
    if(pendingShow){pendingShow=false;startShow();}
  }
  function startShow() {
    mode="show";finished=false;updateShapes();
    if(!ctx || ctx.state!=="running"){pendingShow=true;return false;}
    clearSound();epoch=ctx.currentTime+.15;showStart=epoch;nextStep=0;
    schedule();return true;
  }
  window.CrystalMusic={
    init:buildShapes, unlock,
    setLayers(value){count=Math.max(0,Math.min(5,value));updateShapes();},
    setEnabled(value){enabled=value;if(master)master.gain.setTargetAtTime(value?volume:0,ctx.currentTime,.04);},
    setVolume(value){volume=Math.max(0,Math.min(1,value));if(master)master.gain.setTargetAtTime(enabled?volume:0,ctx.currentTime,.04);},
    pause(){if(ctx){pausedAt=ctx.currentTime;ctx.suspend();}},
    resume(){pausedAt=null;if(ctx)ctx.resume().catch(()=>{});},
    startShow,
    stopShow(){mode="play";pendingShow=false;finished=false;if(ctx){clearSound();epoch=ctx.currentTime+.1;nextStep=0;}updateShapes();},
    reset(){this.stopShow();count=0;rhythm=false;updateShapes();},
    setRhythm(value){rhythm=value;},
    get clock(){return ctx?Math.max(0,ctx.currentTime-epoch):null;},
    get score(){return tracks.map(t=>({...t}));}
  };
  document.addEventListener("visibilitychange",()=>{
    if(!ctx || !started)return;
    if(document.hidden){pausedAt=ctx.currentTime;ctx.suspend();}
    else {pausedAt=null;ctx.resume().catch(()=>{});}
  });
  window.addEventListener("pagehide",()=>{clearInterval(timer);cancelAnimationFrame(raf);if(ctx)ctx.suspend();});
})();
