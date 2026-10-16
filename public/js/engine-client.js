/* Student-safe engine client: queue + resume. No admin fields. */
(function (root) {
  const KEY = "mae-engine-queue";
  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  }
  function save(rows) {
    localStorage.setItem(KEY, JSON.stringify(rows));
  }
  const engine = {
    start: function (opts) {
      return fetch("/api/engine/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts || {}),
      }).then(function (r) { return r.json(); });
    },
    next: function (body) {
      return fetch("/api/engine/next-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      }).then(function (r) { return r.json(); });
    },
    emit: function (type, payload) {
      const rows = load();
      rows.push({ id: crypto.randomUUID(), type: type, payload: payload, seq: rows.length + 1 });
      save(rows);
      if (rows.length >= 5) return engine.flush();
      return Promise.resolve();
    },
    flush: function () {
      const rows = load();
      if (!rows.length) return Promise.resolve();
      save([]);
      return fetch("/api/engine/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: rows }),
      });
    },
    submit: function (response) {
      return fetch("/api/engine/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submit: response }),
      }).then(function (r) { return r.json(); });
    },
    resume: function () {
      return fetch("/api/engine/resume").then(function (r) { return r.json(); });
    },
  };
  root.MaeEngine = engine;
})(typeof window !== "undefined" ? window : globalThis);
