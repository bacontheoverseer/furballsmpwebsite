const IP = "play.furballsmp.online";

document.querySelectorAll("[data-copy]").forEach(btn => {
  btn.addEventListener("click", () => {
    navigator.clipboard.writeText(IP).catch(() => {});
    const original = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = original), 1500);
  });
});

// Optional live player count. Hides itself if the lookup fails.
const status = document.getElementById("status");
fetch(`https://api.mcsrvstat.us/3/${IP}`)
  .then(r => r.json())
  .then(d => {
    status.hidden = false;
    if (d.online) {
      status.className = "status on";
      status.textContent = `${d.players?.online ?? 0} / 50 online now`;
    } else {
      status.className = "status off";
      status.textContent = "Server offline";
    }
  })
  .catch(() => {});
