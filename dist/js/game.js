const fallbackPhase = {
  id: 1,
  title: "O eco da mata",
  steps: [
    { title: "Primeiro silêncio", instruction: "Leve o cristal azul até sua sombra para anular o par.", pairs: [{ color: "blue", size: 1 }] },
    { title: "Cores em equilíbrio", instruction: "Cada cristal procura apenas a sombra da mesma cor.", pairs: [{ color: "gold", size: 1 }, { color: "blue", size: 1 }] },
    { title: "Ritmo escondido", instruction: "Anule os três pares. A ordem é você quem escolhe.", pairs: [{ color: "coral", size: 1 }, { color: "green", size: 1 }, { color: "blue", size: 1 }] },
    { title: "Metades da luz", instruction: "Observe também o tamanho: cada parte deve encontrar sua sombra exata.", pairs: [{ color: "gold", size: .72 }, { color: "gold", size: .72 }, { color: "green", size: 1 }, { color: "blue", size: 1 }] },
    { title: "Círculo completo", instruction: "Anule toda a formação para abrir o show final.", pairs: [{ color: "blue", size: 1 }, { color: "gold", size: .82 }, { color: "coral", size: .82 }, { color: "green", size: 1 }, { color: "violet", size: .72 }] }
  ]
};

let phase = fallbackPhase;
let state = { step: 0, solved: 0, voice: false, contrast: false, reducedMotion: false, sound: true };
let remaining = 0;
let drag = null;
let frame = 0;
let advanceTimer = 0;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

async function boot() {
  try {
    const response = await fetch("data/phases.json");
    if (response.ok) phase = (await response.json()).phases[0];
  } catch { /* O fallback permite abrir o jogo diretamente. */ }
  const saved = CrystalStorage.load();
  if (saved) state = { ...state, ...saved, step: Math.min(saved.step || 0, phase.steps.length - 1), solved: Math.min(saved.solved || 0, phase.steps.length) };
  CrystalMusic.init();
  bindEvents();
  applySettings();
  render();
  registerWebMCP();
}

function render() {
  clearTimeout(advanceTimer);
  cancelAnimationFrame(frame);
  frame = 0;
  drag = null;
  bodies = [];
  particles = [];
  const step = phase.steps[state.step];
  remaining = step.pairs.length;
  $("#stepNumber").textContent = state.step + 1;
  $("#stepTitle").textContent = step.title;
  $("#challengeTitle").textContent = step.title;
  $("#hintText").textContent = step.instruction;
  $("#crystalCount").textContent = state.solved;
  CrystalMusic.setLayers(state.solved);
  $("#railProgress").textContent = `${state.solved}/5`;
  $("#stage").style.setProperty("--restoration", `${38 + state.solved * 12}%`);
  $("#crystalCore").classList.toggle("is-awake", state.solved > 0);
  $$(".performer").forEach((el, index) => el.classList.toggle("unlocked", index < state.solved));
  $$(".composition-rail li").forEach((el, index) => {
    el.classList.toggle("done", index < state.solved);
    el.classList.toggle("current", index === state.step);
  });
  $("#feedback").textContent = "";
  $("#feedback").className = "feedback";
  $("#nextButton").disabled = true;
  $("#nextButton").hidden = true;
  $("#phaseNumber").textContent = String(state.step + 1).padStart(2, "0");
  buildDragField(step);
  updateRemaining();
  CrystalStorage.save(state);
  if (state.voice) speak(`${step.title}. ${step.instruction}`);
}

function buildDragField(step) {
  const field = $("#dragField");
  field.innerHTML = "";
  const total = step.pairs.length;
  step.pairs.forEach((pair, index) => {
    const y = total === 1 ? 50 : 23 + (index % 3) * 27;
    const leftX = total > 3 && index >= 3 ? 34 : 12 + (index % 2) * 17;
    const rightX = total > 3 && index >= 3 ? 60 : 68 + (index % 2) * 15;
    field.append(makeCrystal(pair, index, true, rightX, y), makeCrystal(pair, index, false, leftX, y));
  });
}

function makeCrystal(pair, index, isShadow, x, y) {
  const el = document.createElement("button");
  el.className = `drag-crystal ${isShadow ? "shadow-crystal" : "active-crystal"} color-${pair.color}`;
  el.dataset.pair = index;
  el.dataset.color = pair.color;
  el.dataset.size = String(pair.size);
  el.style.setProperty("--x", `${x}%`);
  el.style.setProperty("--y", `${y}%`);
  el.dataset.originX = `${x}%`;
  el.dataset.originY = `${y}%`;
  el.style.setProperty("--scale", pair.size);
  el.type = "button";
  el.setAttribute("aria-label", `${isShadow ? "Cristal sombrio" : "Cristal luminoso"} ${colorName(pair.color)}. Arraste livremente.`);
  el.addEventListener("pointerdown", startDrag);
  el.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); keyboardNullify(el); }
  });
  const field = $("#dragField");
  const body = { el, x: field.clientWidth*x/100, y: field.clientHeight*y/100,
    vx:0, vy:0, size:pair.size, color:pair.color, dark:isShadow, dead:false, hitAt:0 };
  bodies.push(body);
  paint(body);
  wake();
  return el;
}

let bodies = [];
let particles = [];
let lastTick = 0;
function paint(b) {
  b.el.style.left = b.x+"px";
  b.el.style.top = b.y+"px";
  b.el.style.transform = "translate(-50%,-50%) scale(var(--scale))";
}
function radius(b) { return Math.max(18, b.el.offsetWidth*b.size*.48); }
function clampBody(b) {
  const field = $("#dragField"), r=radius(b);
  b.x=Math.max(r,Math.min(field.clientWidth-r,b.x));
  b.y=Math.max(r+12,Math.min(field.clientHeight-r,b.y));
}
function wake() {
  if (!frame) { lastTick=performance.now(); frame=requestAnimationFrame(tick); }
}
function startDrag(event) {
  const b=bodies.find(b=>b.el===event.currentTarget);
  if (!b || b.dead || drag || (event.button!==undefined && event.button!==0)) return;
  event.preventDefault();
  try { CrystalAudio.unlock(); } catch {}
  b.el.setPointerCapture(event.pointerId);
  const rect=$("#dragField").getBoundingClientRect();
  drag={body:b,pointerId:event.pointerId,offsetX:event.clientX-rect.left-b.x,
    offsetY:event.clientY-rect.top-b.y,targetX:b.x,targetY:b.y};
  b.vx=b.vy=0;
  b.el.classList.add("dragging");
  wake();
}
function moveDrag(event) {
  if (!drag || event.pointerId!==drag.pointerId) return;
  const rect=$("#dragField").getBoundingClientRect();
  drag.targetX=event.clientX-rect.left-drag.offsetX;
  drag.targetY=event.clientY-rect.top-drag.offsetY;
}
function endDrag(event) {
  if (!drag || event.pointerId!==drag.pointerId) return;
  moveDrag(event);
  const b=drag.body;
  b.x=drag.targetX; b.y=drag.targetY;
  b.vx=b.vy=0;
  b.el.classList.remove("dragging");
  clampBody(b); paint(b);
  drag=null;
  // The released piece stays here; nearby bodies receive the contact impulse.
  resolveContacts(b);
  wake();
}
function resolveContacts(anchor=null) {
  for(let i=0;i<bodies.length;i++) for(let j=i+1;j<bodies.length;j++) {
    const a=bodies[i], b=bodies[j];
    if(a.dead||b.dead) continue;
    let dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy);
    const reach=radius(a)+radius(b)+9;
    if(d>=reach) continue;
    if(a.dark!==b.dark && a.color===b.color && a.size===b.size) {
      nullify(a.el,b.el); continue;
    }
    if(d<.01) {dx=1;dy=0;d=1;}
    const nx=dx/d,ny=dy/d,overlap=reach-d;
    const fixed=anchor || drag?.body;
    const aShare=fixed===a?0:fixed===b?1:.5;
    const bShare=1-aShare;
    a.x-=nx*overlap*aShare; a.y-=ny*overlap*aShare;
    b.x+=nx*overlap*bShare; b.y+=ny*overlap*bShare;
    const now=performance.now();
    if(now-Math.max(a.hitAt,b.hitAt)>150) {
      const impulse=Math.min(5,1.5+overlap*.14);
      a.vx-=nx*impulse*aShare; a.vy-=ny*impulse*aShare;
      b.vx+=nx*impulse*bShare; b.vy+=ny*impulse*bShare;
      a.hitAt=b.hitAt=now;
      try { CrystalAudio.clink(); } catch {}
    }
    clampBody(a); clampBody(b); paint(a);paint(b);
  }
}
function tick(now) {
  frame=0;
  const dt=Math.min(2,Math.max(.25,(now-lastTick)/16.667)); lastTick=now;
  let moving=false;
  for(const b of bodies) {
    if(b.dead) continue;
    if(drag?.body===b) {
      const blend=state.reducedMotion?1:1-Math.exp(-.24*dt);
      b.x+=(drag.targetX-b.x)*blend; b.y+=(drag.targetY-b.y)*blend;
      moving=true;
    } else {
      b.x+=b.vx*dt;b.y+=b.vy*dt;
      b.vx*=Math.pow(.86,dt);b.vy*=Math.pow(.86,dt);
      if(Math.abs(b.vx)+Math.abs(b.vy)>.03) moving=true;
      else b.vx=b.vy=0;
    }
    clampBody(b);paint(b);
  }
  resolveContacts();
  for(const p of particles) {
    p.age+=dt; p.vy+=.22*dt; p.x+=p.vx*dt;p.y+=p.vy*dt;p.angle+=p.spin*dt;
    p.el.style.transform=`translate(${p.x}px,${p.y}px) rotate(${p.angle}deg)`;
    p.el.style.opacity=Math.max(0,1-p.age/85);
    if(p.age>=85) p.el.remove(); else moving=true;
  }
  particles=particles.filter(p=>p.age<85);
  if(moving) frame=requestAnimationFrame(tick);
}
function keyboardNullify(el) {
  const a=bodies.find(b=>b.el===el && !b.dead);
  if(!a)return;
  const b=bodies.find(b=>!b.dead && b.dark!==a.dark && b.color===a.color && b.size===a.size);
  if(b) nullify(a.el,b.el);
}
function fracture(a,b) {
  const x=(a.x+b.x)/2,y=(a.y+b.y)/2;
  const field=$("#dragField");
  const colors={blue:"#57dfff",gold:"#ffce5a",coral:"#ff887d",green:"#71eaa9",violet:"#c89bff"};
  for(let i=0;i<(state.reducedMotion?4:28);i++) {
    const el=document.createElement("i");el.className="crystal-fragment";
    el.style.background=i%2?colors[a.color]:"#271337";
    el.style.width=(5+Math.random()*11)+"px";el.style.height=(9+Math.random()*15)+"px";
    field.append(el);
    particles.push({el,x,y,vx:(Math.random()-.5)*8,vy:-2-Math.random()*5,
      angle:Math.random()*360,spin:(Math.random()-.5)*12,age:state.reducedMotion?60:0});
  }
  wake();
}
function nullify(el,other) {
  const a=bodies.find(b=>b.el===el),b=bodies.find(b=>b.el===other);
  if(!a||!b||a.dead||b.dead)return;
  a.dead=b.dead=true;
  if(drag && (drag.body===a||drag.body===b)) drag=null;
  a.el.classList.remove("dragging");b.el.classList.remove("dragging");
  a.el.hidden=b.el.hidden=true;
  fracture(a,b);
  remaining--;
  updateRemaining();
  try { CrystalAudio.shatter(); } catch {}
  if(state.voice)speak("Par anulado.");
  if(remaining===0)completeStep();
}

function completeStep() {
  state.solved = Math.max(state.solved, state.step + 1);
  CrystalMusic.setLayers(state.solved);
  $("#feedback").textContent = "Equilíbrio restaurado! Todos os cristais desta etapa foram anulados.";
  $("#feedback").className = "feedback success";
  $("#nextButton").disabled = false;
  $("#nextButton").hidden = false;
  $("#crystalCount").textContent = state.solved;
  $("#railProgress").textContent = `${state.solved}/5`;
  advanceTimer = setTimeout(next, 2300);
  $("#crystalCore").classList.add("burst");
  setTimeout(() => $("#crystalCore").classList.remove("burst"), 800);
  const performer = $(`.performer[data-character="${state.step}"]`);
  performer?.classList.add("unlocked", "entrance");
  setTimeout(() => performer?.classList.remove("entrance"), 1000);
  CrystalStorage.save(state);
  if (state.voice) speak("Equilíbrio restaurado. Todos os cristais foram anulados.");
}

function updateRemaining() {
  $("#remainingCount").textContent = remaining;
  $("#remainingLabel").textContent = remaining === 1 ? "par de cristais" : "pares de cristais";
}

function next() {
  if (remaining !== 0) return;
  clearTimeout(advanceTimer);
  if (state.step < phase.steps.length - 1) { state.step++; render(); }
  else showFinale();
}

function colorName(color) {
  return ({ blue: "azul", gold: "dourado", coral: "coral", green: "verde", violet: "violeta" })[color] || color;
}

function showFinale() {
  clearTimeout(advanceTimer);
  if(document.body.classList.contains("musical-show"))return;
  $("#finale").classList.remove("show");
  $("#finale").setAttribute("aria-hidden","true");
  document.body.classList.add("musical-show");
  $("#dragField").inert=true;
  $("#desafio").inert=true;
  $("#startShowAudio").hidden=CrystalMusic.startShow();
  $("#leaveShow").focus();
}

function finishMusical() {
  if(!document.body.classList.contains("musical-show"))return;
  CrystalMusic.stopShow();
  document.body.classList.remove("musical-show");
  $("#dragField").inert=false;
  $("#desafio").inert=false;
  $("#finale").classList.add("show");
  $("#finale").setAttribute("aria-hidden", "false");
  document.body.classList.add("final-show");
  if (state.voice) speak("Parabéns! A mata encontrou sua canção. Você reuniu toda a banda.");
  setTimeout(() => $("#replayButton").focus(), 250);
}

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const speech = new SpeechSynthesisUtterance(text);
  speech.lang = "pt-BR";
  speech.rate = .92;
  speechSynthesis.speak(speech);
}

function applySettings() {
  document.body.classList.toggle("high-contrast", state.contrast);
  document.body.classList.toggle("reduce-motion", state.reducedMotion);
  $("#voiceToggle").checked = state.voice;
  $("#contrastToggle").checked = state.contrast;
  $("#motionToggle").checked = state.reducedMotion;
  $("#soundButton").setAttribute("aria-pressed", String(state.sound));
  $("#soundButton").textContent = state.sound ? "♪" : "♩";
  CrystalAudio.setEnabled(state.sound);
  CrystalMusic.setEnabled(state.sound);
  CrystalStorage.save(state);
}

function bindEvents() {
  const unlockMusic=()=>CrystalMusic.unlock().catch(()=>{
    $("#feedback").textContent="O navegador não liberou o áudio. Use o botão de som para tentar novamente.";
  });
  window.addEventListener("pointerdown",unlockMusic);
  window.addEventListener("keydown",unlockMusic);
  window.addEventListener("crystal-show-ended",finishMusical);
  $("#leaveShow").addEventListener("click",finishMusical);
  $("#watchShow").addEventListener("click",showFinale);
  $("#startShowAudio").addEventListener("click",()=>{
    CrystalMusic.unlock().then(()=>{$("#startShowAudio").hidden=true;});
  });
  window.addEventListener("pointermove", moveDrag, { passive: true });
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", () => { if(drag) { drag.body.el.classList.remove("dragging"); drag=null; wake(); } });
  $("#nextButton").addEventListener("click", next);
  $("#hintButton").addEventListener("click", () => speak(phase.steps[state.step].instruction));
  $("#settingsButton").addEventListener("click", () => $("#settingsDialog").showModal());
  $("#soundButton").addEventListener("click", () => { state.sound = !state.sound; applySettings(); });
  $("#voiceToggle").addEventListener("change", (e) => { state.voice = e.target.checked; applySettings(); if (state.voice) speak("Narração ativada."); });
  $("#contrastToggle").addEventListener("change", (e) => { state.contrast = e.target.checked; applySettings(); });
  $("#motionToggle").addEventListener("change", (e) => { state.reducedMotion = e.target.checked; applySettings(); });
  $("#exportButton").addEventListener("click", () => CrystalStorage.export(state, phase));
  $("#importInput").addEventListener("change", async (e) => {
    try { const data = await CrystalStorage.import(e.target.files[0]); phase = data.phase; state = { ...state, ...data.state }; applySettings(); render(); $("#settingsDialog").close(); }
    catch (error) { alert(error.message); }
  });
  $("#replayButton").addEventListener("click", () => {
    CrystalMusic.reset();
    $("#finale").classList.remove("show");
    $("#finale").setAttribute("aria-hidden", "true");
    document.body.classList.remove("final-show");
    state.step = 0; state.solved = 0; render();
  });
}

function registerWebMCP() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  try {
    context.registerTool({
      name: "read_crystal_mission",
      title: "Ler missão dos cristais",
      description: "Lê a missão visual atual e quantos pares ainda precisam ser anulados.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => ({ step: state.step + 1, title: phase.steps[state.step].title, instruction: phase.steps[state.step].instruction, remaining })
    });
  } catch { /* Suporte opcional. */ }
}

boot();
