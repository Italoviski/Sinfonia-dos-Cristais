/* Playable adapter: semantic rules own quantities; Matter owns motion only.
 * Upgraded with True Pixel Art 12 FPS stepped equation wave lines, concentric pixel shatter rings,
 * 4-pointed pixel stars, and radial Bayer 4x4 restoration wave triggers.
 */
(() => {
  'use strict';
  const Base = window.KineticGame, { Body } = Matter;
  const session = { diamonds: 0, introduced: false };
  const R = Math.round;
  const WAVE = [0, 0, 3, 3, 0, 0, -3, -3];

  class EquationGame extends Base {
    load(level, options = {}, snapshot = null) {
      this.model = new CrystalRules.Board();
      this.model.diamonds = session.diamonds;
      this.model.diamondsIntroduced = session.introduced;
      this.bounds = new Map();
      this.handles = new Map();
      this.groupDrag = null;
      this.groupMotion = null;
      this.pendingBreaks = [];
      this.shatterFx = [];
      this.operationCount = 0;
      this.rewarded = false;
      this.trails = [];
      this.nextTrail = 0;
      super.load(level, options, null);
      this.vortex.el.remove();
      const groups = new Map();
      for (const p of this.gems) {
        if (p.seedGroup) {
          if (!groups.has(p.seedGroup)) groups.set(p.seedGroup, []);
          groups.get(p.seedGroup).push(p.ruleId);
        }
      }
      for (const ids of groups.values()) this.model.group(ids);
      if (level.id >= 2 && !session.introduced) {
        this.model.introduceDiamonds();
        session.introduced = true;
        session.diamonds = this.model.diamonds;
      }
      this.syncGroups();
      this.updateDiamond();
      window.CrystalBoard = this;
    }

    addGem(spec) {
      const p = spec.ruleId ? this.model.get(spec.ruleId) : this.model.add(spec);
      const gem = super.addGem({ ...spec, ruleId: p.id, value: p.value.value });
      gem.boosted = p.boosted;
      return gem;
    }

    resize() {
      super.resize();
      if (this.ctx) this.ctx.imageSmoothingEnabled = false;
      if (this.bounds && this.gems?.length) {
        this.bounds.clear();
        this.groupDrag = null;
        this.groupMotion = null;
        this.syncGroups();
      }
    }

    updateDiamond() {
      let b = document.getElementById('diamondTool');
      if (!b) {
        b = document.createElement('button');
        b.id = 'diamondTool';
        b.type = 'button';
        b.className = 'square-button';
        document.querySelector('.game-bar').append(b);
        b.onclick = () => {
          if (this.model.selected) this.dissolve(this.model.selected);
          else this.callbacks.message('Selecione uma peça da equação para desfazer, ou arraste o Diamante até ela.');
        };
        b.addEventListener('pointerdown', e => {
          if (!this.active || this.paused || !session.introduced) return;
          this.diamondDrag = e.pointerId;
          b.setPointerCapture(e.pointerId);
        });
        b.addEventListener('pointerup', e => {
          if (this.diamondDrag !== e.pointerId) return;
          this.diamondDrag = null;
          const r = this.host.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
          const g = this.gems.find(g => !g.dead && Math.hypot(g.body.position.x - x, g.body.position.y - y) < g.r + 20);
          if (g) this.dissolve(g.ruleId);
        });
      }
      b.hidden = !session.introduced;
      b.textContent = '✦ ' + session.diamonds;
      b.setAttribute('aria-label', session.diamonds + ' Diamantes. Desfazer equação selecionada.');
    }

    syncPositions() {
      for (const g of this.gems) {
        if (!g.dead && this.model.pieces.has(g.ruleId)) {
          const p = this.model.get(g.ruleId);
          p.x = g.body.position.x / this.w;
          p.y = g.body.position.y / this.h;
        }
      }
      this.model.orderSpatially();
    }

    transact(result) {
      if (result.type === 'connected') this.syncPositions();
      if (result.type === 'invalid') {
        this.reject(result.ids?.[0] || result.id || this.model.selected);
        return;
      }
      if (['none', 'collision'].includes(result.type)) return;
      if (result.type === 'annulled') {
        result.pairs.forEach((pair, i) => {
          for (const p of pair) {
            const g = this.gems.find(g => !g.dead && g.ruleId === p.id);
            if (g) {
              g.breaking = true;
              g.el.classList.add('breaking-flash');
              g.body.isSensor = true;
              this.pendingBreaks.push({ at: this.time + i * 0.14, g, combo: i });
              if (i === 0) {
                window.CrystalScenery?.triggerWave?.({
                  x: R((g.body.position.x / Math.max(1, this.w)) * 320),
                  y: R((g.body.position.y / Math.max(1, this.h)) * 180)
                });
              }
            }
          }
        });
        this.annulled += result.pairs.length;
      } else {
        for (const g of this.gems) if (!g.dead && !this.model.pieces.has(g.ruleId)) super.remove(g);
        for (const p of result.pieces || []) {
          const siblings = result.pieces.length, i = result.pieces.indexOf(p);
          p.x += siblings > 1 ? (i - (siblings - 1) / 2) * 0.07 : 0;
          const g = this.addGem({ ...p, ruleId: p.id });
          g.cooldown = this.time + 0.65;
          this.shatterFx.push({ x: g.body.position.x, y: g.body.position.y, at: this.time, dark: !!g.dark });
        }
        if (result.type === 'fusion') this.flags.fusion = true;
        if (result.type === 'subtraction') this.flags.burn = true;
        if (result.type === 'split') this.flags.cut = true;
        if (result.type === 'dissolved') {
          for (const id of result.ids) {
            const g = this.gems.find(g => !g.dead && g.ruleId === id);
            if (g) {
              Body.setVelocity(g.body, { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 });
              this.shatterFx.push({ x: g.body.position.x, y: g.body.position.y, at: this.time, dark: false, prism: true });
            }
          }
        }
        if (!['select', 'deselect'].includes(result.type)) {
          this.operationCount++;
          CrystalAudio.click();
        }
      }
      this.syncGroups();
      this.progress();
      this.checkWin();
    }

    syncGroups() {
      for (const [id, h] of this.handles) {
        if (!this.model.groups.has(id)) {
          h.remove();
          this.handles.delete(id);
          this.bounds.delete(id);
        }
      }
      for (const [id, ids] of this.model.groups) {
        const members = ids.map(k => this.gems.find(g => !g.dead && g.ruleId === k)).filter(Boolean);
        if (!members.length) continue;
        if (!this.bounds.has(id)) {
          const xs = members.map(g => g.body.position.x), ys = members.map(g => g.body.position.y), r = this.unit;
          this.bounds.set(id, {
            left: Math.max(0, Math.min(...xs) - r),
            right: Math.min(this.w, Math.max(...xs) + r),
            top: Math.max(0, Math.min(...ys) - r),
            bottom: Math.min(this.h, Math.max(...ys) + r),
            showUntil: this.time + 3
          });
        }
        if (!this.handles.has(id)) {
          const h = document.createElement('button');
          h.className = 'equation-handle';
          h.dataset.equation = id;
          h.textContent = '⠿';
          h.setAttribute('aria-label', 'Mover equação inteira');
          h.addEventListener('keydown', e => {
            const dirs = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] };
            if (dirs[e.key]) {
              e.preventDefault();
              this.translateGroup(id, ...dirs[e.key]);
              this.scanGroups();
            }
          });
          this.host.querySelector('#devices').append(h);
          this.handles.set(id, h);
        }
      }
      for (const g of this.gems) {
        if (!g.dead) {
          g.el.classList.toggle('selected', this.model.selected === g.ruleId);
          g.el.classList.toggle('boosted', g.boosted);
        }
      }
    }

    reject(id) {
      const g = this.gems.find(g => !g.dead && g.ruleId === id);
      if (g && !this.options.motion) {
        g.el.querySelector('.gem-visual').animate(
          [{ translate: '-3px 0' }, { translate: '3px 0' }, { translate: '0 0' }],
          { duration: 220, iterations: 2, easing: 'steps(2, end)' }
        );
      }
      CrystalAudio.error();
      this.callbacks.mistake?.();
      this.callbacks.message('Essa ligação não corresponde. Selecione outra peça ou toque na selecionada para cancelar.');
    }

    down(e) {
      if (!this.active || this.paused || this.finished) return;
      const handle = e.target.closest('[data-equation]');
      if (handle) {
        e.preventDefault();
        this.host.setPointerCapture(e.pointerId);
        const id = handle.dataset.equation, b = this.bounds.get(id);
        this.groupDrag = { id, pointer: e.pointerId, last: this.point(e) };
        this.groupMotion = { id, x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2, released: false };
        return;
      }
      if (!e.target.closest('.gem') && this.tool === 'drag') {
        this.transact(this.model.emptyTap());
        return;
      }
      super.down(e);
    }

    move(e) {
      if (this.groupDrag?.pointer === e.pointerId) {
        if (!this.groupMotion) {
          this.groupDrag = null;
          return;
        }
        const p = this.point(e), d = this.groupDrag;
        this.groupMotion.x += p.x - d.last.x;
        this.groupMotion.y += p.y - d.last.y;
        d.last = p;
        return;
      }
      super.move(e);
      const d = this.drags.get(e.pointerId);
      if (d && d.travel > 8) d.g.dragIntent = this.time + 0.2;
    }

    up(e, cancelled = false) {
      if (this.groupDrag?.pointer === e.pointerId) {
        if (cancelled) this.groupMotion = null;
        else if (this.groupMotion) this.groupMotion.released = true;
        this.groupDrag = null;
        return;
      }
      const d = this.drags.get(e.pointerId);
      if (d && d.travel <= 8) {
        this.drags.delete(e.pointerId);
        if (!cancelled && !d.g.dead) {
          this.syncPositions();
          this.transact(this.model.tap(d.g.ruleId));
        }
        return;
      }
      if (d) d.g.dragIntent = cancelled ? 0 : this.time + 0.2;
      super.up(e, cancelled);
      this.syncPositions();
    }

    translateGroup(id, dx, dy) {
      const b = this.bounds.get(id);
      if (!b) return;
      dx = Math.max(-b.left, Math.min(this.w - b.right, dx));
      dy = Math.max(-b.top, Math.min(this.h - b.bottom, dy));
      b.left += dx; b.right += dx; b.top += dy; b.bottom += dy;
      for (const key of this.model.groups.get(id) || []) {
        const g = this.gems.find(g => !g.dead && g.ruleId === key);
        if (g) {
          Body.setPosition(g.body, { x: g.body.position.x + dx, y: g.body.position.y + dy });
          Body.setVelocity(g.body, { x: 0, y: 0 });
          g.groupIntent = this.time + 0.2;
        }
      }
    }

    scanGroups() {
      for (const a of this.gems) {
        if (!a.dead && !a.breaking) {
          for (const b of this.gems) {
            if (a !== b && !b.dead && !b.breaking && Math.hypot(a.body.position.x - b.body.position.x, a.body.position.y - b.body.position.y) < a.r + b.r + 15) {
              this.contact(a, b);
            }
          }
        }
      }
    }

    contact(a, b) {
      if (!this.model || a.dead || b.dead || a.breaking || b.breaking || this.time < a.cooldown || this.time < b.cooldown) return;
      const moved = a.dragIntent > this.time || b.dragIntent > this.time;
      const groupMoved = a.groupIntent > this.time || b.groupIntent > this.time;
      if (moved || groupMoved) {
        this.syncPositions();
        const result = groupMoved && !moved ? this.model.annul(a.ruleId, b.ruleId) : this.model.dragOnto(a.ruleId, b.ruleId);
        if (result.type !== 'collision' && result.type !== 'invalid') {
          this.transact(result);
          return;
        }
      }
      if (this.time - (this.clinkAt || -1) > 0.09) {
        CrystalAudio.clink();
        this.clinkAt = this.time;
      }
    }

    key(e, g) {
      if (this.paused || !this.active || g.dead || g.breaking) return;
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'enter') {
        e.preventDefault();
        this.syncPositions();
        this.transact(this.model.tap(g.ruleId));
        return;
      }
      if (k === 'c' || k === 'q') {
        e.preventDefault();
        k === 'c' ? this.cut(g) : this.split(g);
        return;
      }
      g.dragIntent = this.time + 0.2;
      super.key(e, g);
    }

    launch() { /* Superseded: Space selects, it never launches. */ }

    cut(g) {
      if (!g.dead && g.kind === 'aqua') {
        this.syncPositions();
        this.transact(this.model.split(g.ruleId, 2));
      }
    }

    split(g) {
      if (!g.dead && g.kind === 'citrine') {
        this.syncPositions();
        this.transact(this.model.split(g.ruleId, this.level.split || 3));
      }
    }

    dissolve(id) {
      this.model.diamonds = session.diamonds;
      const result = this.model.dissolve(id);
      session.diamonds = this.model.diamonds;
      this.transact(result);
      this.updateDiamond();
    }

    updateDevices(dt) {
      this.trails = this.trails.filter(p => this.time - p.at < 0.45);
      this.shatterFx = this.shatterFx.filter(fx => this.time - fx.at < 0.55);
      if (!this.options.motion && this.time >= this.nextTrail) {
        this.nextTrail = this.time + 0.035;
        for (const g of this.gems) {
          if (g.boosted && !g.dead && g.body.speed > 0.3 && this.trails.length < 90) {
            this.trails.push({ x: R(g.body.position.x), y: R(g.body.position.y), at: this.time, r: R(g.r * 0.25) });
          }
        }
      }
      const motion = this.groupMotion;
      if (motion) {
        const b = this.bounds.get(motion.id);
        if (!b) this.groupMotion = null;
        else {
          const halfW = (b.right - b.left) / 2, halfH = (b.bottom - b.top) / 2;
          motion.x = Math.max(halfW, Math.min(this.w - halfW, motion.x));
          motion.y = Math.max(halfH, Math.min(this.h - halfH, motion.y));
          const dx = motion.x - (b.left + b.right) / 2, dy = motion.y - (b.top + b.bottom) / 2, f = 1 - Math.exp(-18 * dt);
          this.translateGroup(motion.id, dx * f, dy * f);
          this.scanGroups();
          if (motion.released && Math.hypot(dx, dy) < 0.3) this.groupMotion = null;
        }
      }
      for (const portal of this.devices.filter(d => d.type === 'portal')) {
        for (const g of this.gems) {
          if (g.dead || g.breaking || g.dark || g.boosted) continue;
          if (Math.hypot(g.body.position.x - portal.x * this.w, g.body.position.y - portal.y * this.h) < this.unit * 0.7 && this.model.boost(g.ruleId)) {
            g.boosted = true;
            this.setValue(g, this.model.get(g.ruleId).value.value);
            Body.setVelocity(g.body, { x: g.body.velocity.x * 1.6 + 2, y: g.body.velocity.y * 1.6 });
            this.flags.portal = true;
            this.operationCount++;
            this.syncGroups();
            this.progress();
            CrystalAudio.reward(1);
          }
        }
      }
      for (const g of this.gems) {
        if (!g.dead && !g.breaking) {
          const p = this.model.pieces.get(g.ruleId), b = p?.group && this.bounds.get(p.group);
          if (b) {
            const pos = g.body.position;
            const x = Math.max(b.left + g.r, Math.min(b.right - g.r, pos.x));
            const y = Math.max(b.top + g.r, Math.min(b.bottom - g.r, pos.y));
            if (x !== pos.x || y !== pos.y) {
              b.showUntil = this.time + 3;
              Body.setPosition(g.body, { x, y });
              if (g.body.speed > 1) CrystalAudio.clink();
            }
          }
        }
      }
      while (this.pendingBreaks.length && this.pendingBreaks[0].at <= this.time) {
        const { g } = this.pendingBreaks.shift();
        const pos = { x: R(g.body.position.x), y: R(g.body.position.y) };
        this.shatterFx.push({ x: pos.x, y: pos.y, at: this.time, dark: !!g.dark });
        this.burst(pos, g.dark ? '#c77dff' : '#9ef0ff', 28);
        super.remove(g);
        CrystalAudio.shatter();
      }
      this.checkWin();
    }

    progress() {
      if (!this.level || !this.model || !this.earned) return;
      const conditions = [this.operationCount > 0 || this.annulled > 0, this.annulled > 0, this.model.solved];
      conditions.forEach((ok, i) => {
        if (ok && i < this.level.goals.length && !this.earned.has(i)) {
          this.earned.add(i);
          this.callbacks.progress(this.earned.size, this.level.goals.length, i);
        }
      });
    }

    rewardCompletion() {
      if (this.rewarded) return;
      this.rewarded = true;
      session.diamonds++;
      this.model.diamonds = session.diamonds;
      this.updateDiamond();
    }

    drawTrails(c) {
      c.save();
      c.fillStyle = '#83ffd0';
      for (const p of this.trails) {
        c.globalAlpha = Math.max(0, 1 - (this.time - p.at) / 0.45) * 0.55;
        const s = Math.max(4, R(p.r / 4) * 4);
        c.fillRect(R(p.x - s / 2), R(p.y - s / 2), s, s);
      }
      c.restore();
    }

    checkWin() {
      if (!this.model || this.finished || !this.model.solved || this.pendingBreaks.length) return;
      this.finished = true;
      this.progress();
      this.callbacks.complete();
    }

    drawPixelEquationWave(c, x0, y0, x1, y1, f12, dark) {
      const dist = Math.hypot(x1 - x0, y1 - y0);
      const steps = Math.max(4, Math.floor(dist / 4));
      const nx = -(y1 - y0) / (dist || 1), ny = (x1 - x0) / (dist || 1);
      for (let i = 0; i <= steps; i++) {
        const p = i / steps;
        const wOff = WAVE[((i + f12) % 8 + 8) % 8];
        const px = R(x0 + (x1 - x0) * p + nx * wOff);
        const py = R(y0 + (y1 - y0) * p + ny * wOff);
        const on = ((i - f12 * 2) % 6 + 6) % 6 < 3;
        if (dark) {
          c.fillStyle = on ? '#b070ff' : '#5a2ca0';
          c.fillRect(px - 2, py - 2, 4, 4);
        } else {
          c.fillStyle = on ? '#ffffff' : '#c77dff';
          c.fillRect(px - 2, py - 2, 4, 4);
          if ((i + f12) & 1) {
            c.fillStyle = '#3fc6f0';
            c.fillRect(px - 2, py - 5, 3, 2);
            c.fillRect(px - 2, py + 3, 3, 2);
          }
        }
      }
    }

    drawShatterRingsAndStars(c, f12) {
      for (const fx of this.shatterFx) {
        const f = Math.floor((this.time - fx.at) * 12);
        if (f < 0 || f > 6) continue;
        const r = 10 + f * 9;
        const col = fx.prism ? (f % 2 === 0 ? '#ffffff' : '#ffd35a') : fx.dark ? '#c77dff' : '#9ef0ff';
        c.fillStyle = col;
        // Stepped pixel octagon/circle ring (4px pixel blocks)
        for (let a = 0; a < 16; a++) {
          const ang = (a / 16) * Math.PI * 2;
          const rx = R((fx.x + Math.cos(ang) * r) / 4) * 4;
          const ry = R((fx.y + Math.sin(ang) * r) / 4) * 4;
          c.fillRect(rx, ry, 4, 4);
        }
        // 4-pointed pixel star at center
        if (f < 4) {
          const arm = (4 - f) * 6;
          c.fillStyle = col;
          c.fillRect(R(fx.x - arm), R(fx.y - 2), arm * 2, 4);
          c.fillRect(R(fx.x - 2), R(fx.y - arm), 4, arm * 2);
          c.fillStyle = '#ffffff';
          c.fillRect(R(fx.x - 4), R(fx.y - 4), 8, 8);
        }
      }
    }

    drawEffects(dt) {
      super.drawEffects(dt);
      if (!this.model) return;
      const c = this.ctx;
      c.imageSmoothingEnabled = false;
      const f12 = this.options.motion ? 0 : Math.floor(this.time * 12);

      this.drawTrails(c);
      this.drawShatterRingsAndStars(c, f12);

      c.save();
      for (const [id, ids] of this.model.groups) {
        const members = ids.map(k => this.gems.find(g => !g.dead && g.ruleId === k)).filter(Boolean);
        if (!members.length) continue;
        const dark = !!members[0].dark;
        for (let i = 0; i < members.length - 1; i++) {
          const p0 = members[i].body.position, p1 = members[i + 1].body.position;
          this.drawPixelEquationWave(c, p0.x, p0.y, p1.x, p1.y, f12, dark);
        }
        const b = this.bounds.get(id);
        if (b) {
          const h = this.handles.get(id);
          if (h) h.style.transform = `translate(${R((b.left + b.right) / 2)}px,${R(Math.max(0, b.top - 10))}px)`;
          if (b.showUntil > this.time) {
            c.globalAlpha = Math.min(1, b.showUntil - this.time);
            c.fillStyle = dark ? '#b070ff' : '#9ef0ff';
            const top = R(b.top + 6), bot = R(b.bottom - 6), left = R(b.left + 4), right = R(b.right - 8);
            // Crisp Pixel-Art Parentheses Brackets ( )
            c.fillRect(left, top + 6, 4, bot - top - 12);
            c.fillRect(left + 4, top, 8, 4);
            c.fillRect(left + 4, bot - 4, 8, 4);
            c.fillRect(right, top + 6, 4, bot - top - 12);
            c.fillRect(right - 8, top, 8, 4);
            c.fillRect(right - 8, bot - 4, 8, 4);
            c.globalAlpha = 1;
          }
        }
      }
      c.restore();
    }

    snapshot() { return null; }
  }

  window.KineticGame = EquationGame;
})();
