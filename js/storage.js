(function () {
  const KEY = "sinfonia-cristais-save-v1";
  window.CrystalStorage = {
    load() {
      try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
    },
    save(state) { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* Playing remains available with storage disabled. */ } },
    export(state, phase) {
      const blob = new Blob([JSON.stringify({ version: 1, savedAt: new Date().toISOString(), state, phase }, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "sinfonia-dos-cristais-fase-1.json";
      link.click();
      URL.revokeObjectURL(link.href);
    },
    async import(file) {
      const data = JSON.parse(await file.text());
      if (!data.state || !data.phase?.steps) throw new Error("Arquivo de fase inválido");
      return data;
    }
  };
})();
