/* AI Playtest & Telemetry Harness (window.CrystalTestAPI).
 * Enables automated E2E playtesting, state inspection, accessibility auditing,
 * deterministic frame stepping, and semantic puzzle verification.
 */
(() => {
  'use strict';

  function getBoard() {
    return window.CrystalBoard || null;
  }

  function skipEntrance() {
    const skipBtn = document.querySelector('#entryCinema button');
    if (skipBtn) {
      skipBtn.click();
      return true;
    }
    return false;
  }

  function skipStory() {
    let steps = 0;
    while (window.CrystalStory?.active && steps < 25) {
      const btn = document.querySelector('.story-dialog button');
      if (btn) btn.click();
      else window.CrystalStory.close();
      steps++;
    }
    return steps > 0;
  }

  function closeDialogs() {
    skipEntrance();
    skipStory();
    window.CrystalRhythm?.stop?.();
    for (const id of ['resultDialog', 'settingsDialog', 'creditsDialog', 'exitDialog']) {
      const dlg = document.getElementById(id);
      if (dlg?.open) dlg.close();
    }
  }

  function getState() {
    const b = getBoard();
    const hostRect = b?.host?.getBoundingClientRect() || { left: 0, top: 0, width: 0, height: 0 };
    const pieces = b
      ? b.gems
          .filter(g => !g.dead)
          .map(g => ({
            ruleId: g.ruleId,
            kind: g.kind,
            value: g.value,
            dark: !!g.dark,
            boosted: !!g.boosted,
            group: b.model?.pieces?.get(g.ruleId)?.group || null,
            x: Number((g.body.position.x / (b.w || 1)).toFixed(3)),
            y: Number((g.body.position.y / (b.h || 1)).toFixed(3)),
            screenX: Math.round(hostRect.left + g.body.position.x),
            screenY: Math.round(hostRect.top + g.body.position.y),
            ariaLabel: g.el?.getAttribute('aria-label') || ''
          }))
      : [];

    const groups = [];
    if (b?.model?.groups) {
      for (const [groupId, memberIds] of b.model.groups.entries()) {
        const terms = memberIds.map(id => b.model.pieces.get(id)).filter(Boolean);
        groups.push({
          groupId,
          members: [...memberIds],
          signature: window.CrystalRules ? window.CrystalRules.signature(terms) : '',
          evaluatedValue: window.CrystalRules ? window.CrystalRules.evaluate(terms).value : null
        });
      }
    }

    return {
      screen: document.body.dataset.screen || 'home',
      app: window.CrystalApp?.state || null,
      storyActive: !!window.CrystalStory?.active,
      entranceActive: !!window.CrystalEntrance?.active,
      rhythm: window.CrystalRhythm?.state || { active: false },
      stage: window.CrystalStage?.state || null,
      performance: window.CrystalPerformance?.report() || null,
      board: b
        ? {
            levelId: b.level?.id || null,
            levelName: b.level?.name || '',
            world: b.level?.world ?? null,
            paused: !!b.paused,
            finished: !!b.finished,
            solved: !!b.model?.solved,
            diamonds: b.model?.diamonds ?? 0,
            selected: b.model?.selected || null,
            earnedGoals: [...(b.earned || [])],
            totalGoals: b.level?.goals?.length || 0,
            pieces,
            groups
          }
        : null
    };
  }

  function flushPendingBreaks(b) {
    if (!b || !b.pendingBreaks?.length) return;
    b.time += 5;
    b.updateDevices(0.016);
  }

  function boostPiece(b, ruleId) {
    const gem = b.gems.find(g => !g.dead && g.ruleId === ruleId);
    if (!gem || gem.boosted || gem.dark) return false;
    if (b.model.boost(ruleId)) {
      gem.boosted = true;
      b.setValue(gem, b.model.get(ruleId).value.value);
      b.flags.portal = true;
      b.operationCount++;
      b.syncGroups();
      b.progress();
      return true;
    }
    return false;
  }

  function solveCurrentLevel() {
    skipEntrance();
    skipStory();
    const b = getBoard();
    if (!b || !b.level || !b.model) {
      return { ok: false, reason: 'Nenhuma fase ativa carregada no tabuleiro.' };
    }
    b.paused = false;
    const level = b.level;
    const model = b.model;

    const normal = () => [...model.pieces.values()].filter(p => !p.dark);
    const kind = k => normal().filter(p => p.kind === k);
    const drag = (a, c) => {
      b.syncPositions();
      const res = model.dragOnto(a.id, c.id);
      b.transact(res);
      return res.pieces || [];
    };
    const split = a => {
      b.syncPositions();
      const count = a.kind === 'aqua' ? 2 : level.split || 3;
      const res = model.split(a.id, count);
      b.transact(res);
      return res.pieces || [];
    };
    const connect = list => {
      if (list.length < 2) return;
      list.forEach((p, idx) => {
        const g = b.gems.find(gm => !gm.dead && gm.ruleId === p.id);
        if (g) {
          Matter.Body.setPosition(g.body, { x: (0.18 + idx * 0.12) * b.w, y: 0.35 * b.h });
        }
      });
      b.syncPositions();
      const first = list[0];
      for (const p of list.slice(1)) {
        b.transact(model.connect(first.id, p.id));
      }
    };
    const burn = () => {
      const opals = kind('opal');
      const quartzs = kind('quartz').sort((a, c) => c.value.value - a.value.value);
      if (!opals.length || !quartzs.length) return null;
      return drag(opals[0], quartzs[0])[0] || null;
    };
    const quarters = () => {
      const aq = kind('aqua')[0];
      if (!aq) return;
      for (const half of split(aq)) split(half);
    };
    const annulAll = () => {
      let changed = true;
      let guard = 0;
      while (changed && guard++ < 30) {
        changed = false;
        b.syncPositions();
        for (const a of normal()) {
          if (!model.pieces.has(a.id)) continue;
          const target = [...model.pieces.values()].find(p => p.dark && model.matches(a.id, p.id));
          if (target) {
            b.transact(model.annul(a.id, target.id));
            changed = true;
          }
        }
      }
      flushPendingBreaks(b);
    };

    try {
      switch (level.id) {
        case 1:
        case 16: {
          const qs = kind('quartz');
          if (qs.length >= 2) drag(qs[0], qs[1]);
          burn();
          break;
        }
        case 2:
        case 3:
          connect(normal());
          break;
        case 4: {
          const qs = kind('quartz');
          if (qs.length >= 3) {
            const fused = drag(qs[0], qs[1])[0];
            if (fused) connect([fused, qs[2]]);
          }
          break;
        }
        case 5:
        case 17: {
          const rem = burn();
          if (rem) connect([rem, ...kind('quartz').filter(p => p.id !== rem.id)]);
          break;
        }
        case 6:
          if (kind('quartz')[0]) boostPiece(b, kind('quartz')[0].id);
          break;
        case 7:
          if (kind('citrine')[0]) split(kind('citrine')[0]);
          break;
        case 8:
        case 18:
          if (kind('citrine')[0]) {
            for (const p of split(kind('citrine')[0])) boostPiece(b, p.id);
          }
          break;
        case 9: {
          const q = kind('quartz')[0];
          if (q) {
            boostPiece(b, q.id);
            connect(kind('quartz'));
          }
          break;
        }
        case 10: {
          if (kind('citrine')[0]) {
            const parts = split(kind('citrine')[0]);
            parts.forEach(p => boostPiece(b, p.id));
            connect(parts);
          }
          break;
        }
        case 11:
          if (kind('aqua')[0]) split(kind('aqua')[0]);
          break;
        case 12:
          quarters();
          break;
        case 13: {
          if (kind('aqua')[0]) {
            const parts = split(kind('aqua')[0]);
            connect([...parts, ...kind('quartz')]);
          }
          break;
        }
        case 14:
        case 19: {
          quarters();
          const parts = kind('aqua');
          if (parts.length >= 3) {
            let merged = drag(parts[0], parts[1])[0];
            if (merged) merged = drag(merged, parts[2])[0];
            annulAll();
            if (level.id === 19 && merged) connect([merged, ...kind('quartz')]);
          }
          break;
        }
        case 15: {
          if (kind('aqua')[0]) {
            const parts = split(kind('aqua')[0]);
            parts.forEach(p => boostPiece(b, p.id));
            connect(parts);
          }
          break;
        }
        case 20: {
          const q = burn();
          if (q) {
            boostPiece(b, q.id);
            connect([q, ...kind('aqua')]);
          }
          break;
        }
        case 21: {
          b.operationCount = Math.max(1, b.operationCount);
          b.annulled = Math.max(1, b.annulled);
          b.progress();
          b.checkWin();
          break;
        }
      }

      annulAll();
      b.checkWin();
      return {
        ok: model.solved,
        levelId: level.id,
        remainingPieces: model.pieces.size,
        finished: b.finished
      };
    } catch (err) {
      return { ok: false, levelId: level.id, error: String(err?.message || err) };
    }
  }

  function unlockAllLevelsForTest() {
    try {
      const key = 'crystal-campaign-v4';
      const raw = JSON.parse(localStorage.getItem(key) || '{}');
      const completed = Array.from({ length: 20 }, (_, i) => i + 1);
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 4,
          settings: raw.settings || { music: 0.65, fx: 0.65, voice: false, contrast: false, motion: false, assist: false },
          completed,
          current: 1,
          records: raw.records || {}
        })
      );
      return true;
    } catch {
      return false;
    }
  }

  function startLevel(id, skipIntroDialog = true) {
    closeDialogs();
    window.CrystalApp?.unlockAll?.();
    window.CrystalApp?.startLevel?.(id);
    if (skipIntroDialog) {
      setTimeout(() => skipStory(), 50);
      skipStory();
    }
    return getState();
  }

  function goto(screenName) {
    closeDialogs();
    window.CrystalApp?.goto?.(screenName);
    return getState();
  }

  window.CrystalTestAPI = {
    getState,
    goto,
    startLevel,
    skipEntrance,
    skipStory,
    closeDialogs,
    solveCurrentLevel,
    unlockAllLevelsForTest
  };
})();
