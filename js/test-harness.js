/* AI Playtest & Telemetry Harness (window.CrystalTestAPI).
 * Inspects and drives True Pixel Art worlds (CaveChapter1 & TruePixelWorlds)
 * plus Menu/Map navigation for automated E2E playtesting.
 */
(() => {
  'use strict';

  function getActiveWorldModule() {
    if (window.CaveChapter1?.isActiveGame?.()) {
      return { kind: 'cave', mod: window.CaveChapter1 };
    }
    if (window.TruePixelWorlds?.isActiveGame?.()) {
      return { kind: 'worlds', mod: window.TruePixelWorlds };
    }
    return null;
  }

  function skipStory() {
    let steps = 0;
    const E = window.TruePixelEngine;
    const active = getActiveWorldModule();
    if (active?.mod?.phase === 'cutscene_enter' || active?.mod?.phase === 'cutscene_wake') {
      for (let i = 0; i < 40 && (active.mod.phase === 'cutscene_enter' || active.mod.phase === 'cutscene_wake'); i++) {
        active.mod.update?.(0.1);
      }
      steps++;
    }
    while (E?.DialogueBox?.isOpen && steps < 40) {
      E.DialogueBox.advance();
      steps++;
    }
    if (E?.TutorialModal?.isOpen) {
      const done = E.TutorialModal.onDone;
      E.TutorialModal.close();
      if (typeof done === 'function') done();
      steps++;
    }
    return steps > 0;
  }

  function closeDialogs() {
    skipStory();
    for (const id of ['settingsDialog', 'creditsDialog', 'exitDialog']) {
      const dlg = document.getElementById(id);
      if (dlg?.open) dlg.close();
    }
    const E = window.TruePixelEngine;
    if (E?.GameHUD) {
      E.GameHUD.paused = false;
      E.GameHUD.settingsOpen = false;
    }
  }

  function getState() {
    const active = getActiveWorldModule();
    const E = window.TruePixelEngine;
    const mod = active?.mod || null;
    const pieces = mod
      ? (mod.pieces || [])
          .filter(p => !p.broken && p.value > 0)
          .map(p => ({
            id: p.id,
            type: p.type,
            value: p.value,
            shadow: !!p.shadow,
            inEquation: p.inEquation || null,
            boosted: !!p.boosted,
            x: p.x,
            y: p.y
          }))
      : [];

    return {
      screen: document.body.dataset.screen || 'home',
      app: window.CrystalApp?.state || null,
      dialogueOpen: !!E?.DialogueBox?.isOpen,
      tutorialOpen: !!E?.TutorialModal?.isOpen,
      sockets: E?.DialogueBox?.sockets ? { ...E.DialogueBox.sockets } : null,
      performance: window.CrystalPerformance?.report?.() || null,
      worldRuntime: mod
        ? {
            module: active.kind,
            worldKey: active.kind === 'cave' ? 'cave' : mod.worldKey,
            worldLabel: E?.GameHUD?.worldLabel || '',
            phase: mod.phase,
            currentLevel: mod.currentLevel,
            currentStep: mod.currentStep,
            totalSteps: mod.totalSteps,
            emeraldAltar: mod.emeraldAltar ? { x: mod.emeraldAltar.x, y: mod.emeraldAltar.y } : null,
            pureEquation: mod.pureEquation
              ? { x: mod.pureEquation.x, y: mod.pureEquation.y, expanded: !!mod.pureEquation.expanded, broken: !!mod.pureEquation.broken }
              : null,
            shadowEquation: mod.shadowEquation
              ? { x: mod.shadowEquation.x, y: mod.shadowEquation.y, expanded: !!mod.shadowEquation.expanded, broken: !!mod.shadowEquation.broken }
              : null,
            pieces
          }
        : null
    };
  }

  function unlockAllLevelsForTest() {
    window.CrystalApp?.unlockAll?.();
    return true;
  }

  function startLevel(id, skipIntroDialog = true) {
    closeDialogs();
    window.CrystalApp?.unlockAll?.();
    window.CrystalApp?.startLevel?.(id);
    if (skipIntroDialog) {
      skipStory();
    }
    return getState();
  }

  function goto(screenName) {
    closeDialogs();
    window.CrystalApp?.goto?.(screenName);
    return getState();
  }

  function restartLevel() {
    closeDialogs();
    if (window.CaveChapter1?.isActiveGame?.()) {
      window.CaveChapter1.restartCurrentPhase();
    } else if (window.TruePixelWorlds?.isActiveGame?.()) {
      window.TruePixelWorlds.restartCurrentPhase();
    }
    return getState();
  }

  function solveCurrentLevel() {
    skipStory();
    const active = getActiveWorldModule();
    if (!active) {
      return { ok: false, reason: 'Nenhuma fase True Pixel ativa no momento.' };
    }
    const mod = active.mod;
    while (mod.currentStep < mod.totalSteps) {
      if (active.kind === 'cave') {
        mod.currentStep++;
        mod.setupLevelStep(mod.currentLevel, mod.currentStep);
      } else {
        mod.setupStep(mod.currentStep + 1);
      }
    }
    for (const p of mod.pieces) {
      if (p.shadow) p.broken = true;
    }
    if (mod.shadowEquation) mod.shadowEquation.broken = true;
    if (mod.pureEquation) mod.pureEquation.broken = true;
    mod.checkStepCleared?.();
    return {
      ok: true,
      module: active.kind,
      worldKey: active.kind === 'cave' ? 'cave' : mod.worldKey,
      phase: mod.phase
    };
  }

  window.CrystalTestAPI = {
    getState,
    goto,
    startLevel,
    restartLevel,
    skipEntrance: () => false,
    skipStory,
    closeDialogs,
    solveCurrentLevel,
    unlockAllLevelsForTest
  };
})();
