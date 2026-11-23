(() => {
  const SERVER_IP = "play.furballsmp.online";
  const MAX_PLAYERS = 50;

  // Toast helper
  let toastEl = null;
  let toastTimer = null;
  function showToast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2000);
  }

  // Copy buttons
  document.querySelectorAll("[data-copy]").forEach(btn => {
    btn.addEventListener("click", () => {
      const value = btn.getAttribute("data-copy") || SERVER_IP;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).catch(() => {});
      }
      const labelEl = btn.querySelector(".copy-label") || btn;
      const prev = labelEl.textContent;
      labelEl.textContent = "Copied!";
      showToast(`Copied ${value}`);
      setTimeout(() => {
        labelEl.textContent = prev;
      }, 1600);
    });
  });

  // Mobile nav drawer
  const toggleBtn = document.querySelector("[data-nav-toggle]");
  const drawer = document.getElementById("mobileDrawer");
  if (toggleBtn && drawer) {
    const closeDrawer = () => {
      drawer.classList.remove("open");
      toggleBtn.setAttribute("aria-expanded", "false");
    };
    toggleBtn.addEventListener("click", () => {
      const open = drawer.classList.toggle("open");
      toggleBtn.setAttribute("aria-expanded", String(open));
    });
    drawer.querySelectorAll("a, button").forEach(el => {
      el.addEventListener("click", closeDrawer);
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeDrawer();
    });
  }

  // Build 20-segment capacity meter cells
  const meters = document.querySelectorAll("[data-capacity-meter]");
  meters.forEach(meter => {
    if (meter.children.length === 0) {
      for (let i = 0; i < 20; i++) {
        meter.appendChild(document.createElement("span"));
      }
    }
  });

  function updateMeters(onlineCount, maxCount) {
    const ratio = maxCount > 0 ? Math.min(1, onlineCount / maxCount) : 0;
    const filled = onlineCount > 0 ? Math.max(1, Math.round(ratio * 20)) : 0;
    meters.forEach(meter => {
      Array.from(meter.children).forEach((cell, idx) => {
        cell.className = "";
        if (idx < filled) {
          cell.classList.add(ratio > 0.8 ? "filled-hi" : "filled");
        }
      });
    });
  }

  // Live server status via mcsrvstat.us
  const statusDots = document.querySelectorAll("[data-status-dot]");
  const statusTexts = document.querySelectorAll("[data-status-text]");
  const meterCounts = document.querySelectorAll("[data-meter-count]");
  const versionTexts = document.querySelectorAll("[data-version-text]");

  if (statusDots.length || statusTexts.length || meters.length) {
    fetch(`https://api.mcsrvstat.us/3/${SERVER_IP}`)
      .then(r => r.json())
      .then(d => {
        const online = Boolean(d && d.online);
        const count = online ? (d.players?.online ?? 0) : 0;
        const max = MAX_PLAYERS;

        statusDots.forEach(dot => {
          dot.classList.remove("is-online", "is-offline");
          dot.classList.add(online ? "is-online" : "is-offline");
        });

        statusTexts.forEach(el => {
          el.textContent = online ? `${count} / ${max} online` : "Server offline";
        });

        meterCounts.forEach(el => {
          el.textContent = online ? `${count} / ${max} players` : `0 / ${MAX_PLAYERS} players`;
        });

        if (online && d.version && !/^unknown$/i.test(String(d.version).trim())) {
          versionTexts.forEach(el => {
            el.textContent = d.version;
          });
        }

        updateMeters(count, max);
      })
      .catch(() => {
        statusTexts.forEach(el => {
          el.textContent = `Up to ${MAX_PLAYERS} players`;
        });
        meterCounts.forEach(el => {
          el.textContent = `Cap: ${MAX_PLAYERS} players`;
        });
      });
  }
})();
