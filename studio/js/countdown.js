const target = new Date("2026-11-19T18:40:00+08:00").getTime();
const display = document.getElementById("update-countdown");

function updateCountdown() {
  if (!display) return;

  const remaining = target - Date.now();

  if (remaining <= 0) {
    display.textContent = "00:00";
    display.closest(".announcement-countdown")
      ?.classList.add("countdown-finished");
    return;
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  display.textContent = hours > 0
    ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

updateCountdown();
const countdownInterval = setInterval(() => {
  updateCountdown();

  if (Date.now() >= target) {
    clearInterval(countdownInterval);
  }
}, 1000);
