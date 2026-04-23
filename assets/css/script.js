/* ══════════════════════════════════════════════
   TDD — PANEL DE PRODUCCIÓN · script.js
   Funciones: cronómetro global, cronómetro de bloque,
   navegación de bloques, panelistas, noticias en vivo,
   log de clips, hook bar, toast.
══════════════════════════════════════════════ */

// ──────────────────────────────────────────────
// SELECTORES
// ──────────────────────────────────────────────
const timerDisplay    = document.getElementById("live-timer");
const blockTimerDisp  = document.getElementById("block-timer");
const blockProgress   = document.getElementById("blockProgress");
const hookBarText     = document.getElementById("hookBarText");
const hookBar         = document.getElementById("hookBar");
const clipLogArea     = document.getElementById("clipLog");
const toast           = document.getElementById("toast");
const blocksContainer = document.getElementById("blocksContainer");
const blockCounter    = document.getElementById("blockCounter");
const newsList        = document.getElementById("newsList");

// Botones globales
const startBtn    = document.getElementById("startBtn");
const pauseBtn    = document.getElementById("pauseBtn");
const resetBtn    = document.getElementById("resetBtn");

// Botones de bloque
const startBlockBtn = document.getElementById("startBlockBtn");
const pauseBlockBtn = document.getElementById("pauseBlockBtn");
const resetBlockBtn = document.getElementById("resetBlockBtn");

// Navegación de bloques
const prevBlockBtn = document.getElementById("prevBlockBtn");
const nextBlockBtn = document.getElementById("nextBlockBtn");

// Clips
const markClipBtn = document.getElementById("markClipBtn");
const copyLogBtn  = document.getElementById("copyLogBtn");
const clearLogBtn = document.getElementById("clearLogBtn");

// Noticias
const addNewsBtn      = document.getElementById("addNewsBtn");
const newsTitleInput  = document.getElementById("newsTitleInput");
const newsHookInput   = document.getElementById("newsHookInput");

// ──────────────────────────────────────────────
// ESTADO GLOBAL
// ──────────────────────────────────────────────
let totalSeconds    = Number(localStorage.getItem("tdd_totalSeconds")) || 0;
let timerRunning    = false;
let timerInterval   = null;

let blockSeconds    = 0;
let blockDuration   = 0;
let blockRunning    = false;
let blockInterval   = null;

let currentBlockIdx = 0;

let activeMic       = null; // id del panelista hablando

const allBlocks     = document.querySelectorAll(".block");
const totalBlocks   = allBlocks.length;

// ──────────────────────────────────────────────
// INICIALIZACIÓN
// ──────────────────────────────────────────────
(function init() {
  // Restaurar timer global
  updateTimerDisplay();

  // Restaurar log de clips
  const savedLog = localStorage.getItem("tdd_clipLog");
  if (savedLog && clipLogArea) clipLogArea.value = savedLog;

  // Restaurar notas de panelistas
  document.querySelectorAll(".panelist-notes").forEach(ta => {
    const key = "tdd_note_" + ta.closest(".panelist-card").dataset.panelist;
    const saved = localStorage.getItem(key);
    if (saved) ta.value = saved;
    ta.addEventListener("input", () => localStorage.setItem(key, ta.value));
  });

  // Activar bloque inicial
  setActiveBlock(0, false);
})();

// ──────────────────────────────────────────────
// UTILIDADES DE FORMATO
// ──────────────────────────────────────────────
function formatHMS(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatMS(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

function pad(n) { return String(n).padStart(2, "0"); }

// ──────────────────────────────────────────────
// CRONÓMETRO GLOBAL
// ──────────────────────────────────────────────
function updateTimerDisplay() {
  if (timerDisplay) timerDisplay.textContent = formatHMS(totalSeconds);
}

function saveTimer() {
  localStorage.setItem("tdd_totalSeconds", totalSeconds);
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  timerInterval = setInterval(() => {
    totalSeconds++;
    updateTimerDisplay();
    saveTimer();
  }, 1000);
  showToast("▶ Transmisión iniciada");
}

function pauseTimer() {
  if (!timerRunning) return;
  timerRunning = false;
  clearInterval(timerInterval);
  showToast("⏸ Transmisión pausada");
}

function resetTimer() {
  pauseTimer();
  totalSeconds = 0;
  updateTimerDisplay();
  saveTimer();
  showToast("↺ Cronómetro reiniciado");
}

if (startBtn) startBtn.addEventListener("click", startTimer);
if (pauseBtn) pauseBtn.addEventListener("click", pauseTimer);
if (resetBtn) resetBtn.addEventListener("click", resetTimer);

// ──────────────────────────────────────────────
// CRONÓMETRO REGRESIVO POR BLOQUE
// ──────────────────────────────────────────────
function updateBlockDisplay() {
  if (!blockTimerDisp) return;

  const remaining  = blockSeconds;
  blockTimerDisp.textContent = formatMS(remaining);

  // Calcular porcentaje restante
  const pct = blockDuration > 0 ? (remaining / blockDuration) * 100 : 100;

  if (blockProgress) {
    blockProgress.style.width = pct + "%";
  }

  // Clases de urgencia
  const isWarning = remaining <= 120 && remaining > 0;
  const isDanger  = remaining <= 30 && remaining > 0;
  const isEmpty   = remaining === 0;

  blockTimerDisp.classList.toggle("warning", isWarning && !isDanger);
  blockTimerDisp.classList.toggle("danger",  isDanger || isEmpty);
  if (blockProgress) {
    blockProgress.classList.toggle("warning", isWarning && !isDanger);
    blockProgress.classList.toggle("danger",  isDanger || isEmpty);
  }

  if (remaining === 120) showToast("⚠️ ¡2 minutos para cerrar el bloque!");
  if (remaining === 0)   {
    pauseBlockTimer();
    showToast("🔴 ¡Tiempo de bloque agotado!");
  }
}

function startBlockTimer() {
  if (blockRunning) return;
  if (blockSeconds === 0) {
    // Leer duración del bloque actual
    const currentBlock = allBlocks[currentBlockIdx];
    blockDuration = parseInt(currentBlock?.dataset.duration || "1200", 10);
    blockSeconds  = blockDuration;
  }
  blockRunning = true;
  blockInterval = setInterval(() => {
    if (blockSeconds > 0) {
      blockSeconds--;
      updateBlockDisplay();
    }
  }, 1000);
  showToast(`▶ Bloque ${currentBlockIdx + 1} en curso`);
}

function pauseBlockTimer() {
  blockRunning = false;
  clearInterval(blockInterval);
}

function resetBlockTimer() {
  pauseBlockTimer();
  const currentBlock = allBlocks[currentBlockIdx];
  blockDuration = parseInt(currentBlock?.dataset.duration || "1200", 10);
  blockSeconds  = blockDuration;
  updateBlockDisplay();
  showToast("↺ Cronómetro de bloque reiniciado");
}

if (startBlockBtn) startBlockBtn.addEventListener("click", startBlockTimer);
if (pauseBlockBtn) pauseBlockBtn.addEventListener("click", pauseBlockTimer);
if (resetBlockBtn) resetBlockBtn.addEventListener("click", resetBlockTimer);

// ──────────────────────────────────────────────
// NAVEGACIÓN DE BLOQUES
// ──────────────────────────────────────────────
function setActiveBlock(idx, resetBlock = true) {
  if (idx < 0 || idx >= totalBlocks) return;

  currentBlockIdx = idx;

  allBlocks.forEach((block, i) => {
    const pill = block.querySelector(".status-pill");
    block.classList.remove("current");

    if (i === idx) {
      block.classList.add("current");
      if (pill) {
        pill.textContent = "Al aire";
        pill.classList.add("current-status");
      }
      // Scroll suave al bloque activo
      block.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else if (i < idx) {
      if (pill) {
        pill.textContent = "Finalizado";
        pill.classList.remove("current-status");
      }
    } else {
      // Restaurar textos originales para bloques futuros
      const origTexts = ["Siguiente", "En espera", "Cierre"];
      if (pill) {
        pill.textContent = origTexts[Math.min(i - idx - 1, origTexts.length - 1)] || "En espera";
        pill.classList.remove("current-status");
      }
    }
  });

  // Actualizar contador
  if (blockCounter) blockCounter.textContent = `Bloque ${idx + 1} / ${totalBlocks}`;

  // Actualizar gancho en la barra
  updateHookBar(idx);

  // Reiniciar cronómetro de bloque
  if (resetBlock) {
    pauseBlockTimer();
    const currentBlock = allBlocks[idx];
    blockDuration = parseInt(currentBlock?.dataset.duration || "1200", 10);
    blockSeconds  = blockDuration;
    updateBlockDisplay();
  }
}

function updateHookBar(idx) {
  const block    = allBlocks[idx];
  if (!block) return;
  const hookEl   = block.querySelector("[data-hook]");
  const hookText = hookEl ? hookEl.dataset.hook : null;

  if (hookBarText) {
    hookBarText.textContent = hookText || "Sin gancho definido para este bloque";
  }
}

if (nextBlockBtn) nextBlockBtn.addEventListener("click", () => {
  if (currentBlockIdx < totalBlocks - 1) {
    setActiveBlock(currentBlockIdx + 1);
    showToast(`➡ Bloque ${currentBlockIdx + 1} activado`);
  } else {
    showToast("✅ Último bloque activo");
  }
});

if (prevBlockBtn) prevBlockBtn.addEventListener("click", () => {
  if (currentBlockIdx > 0) {
    setActiveBlock(currentBlockIdx - 1);
    showToast(`⬅ Bloque ${currentBlockIdx + 1} activado`);
  } else {
    showToast("⬆ Ya estás en el primer bloque");
  }
});

// ──────────────────────────────────────────────
// PANELISTAS — MIC TOGGLE
// ──────────────────────────────────────────────
document.querySelectorAll(".panelist-mic").forEach(btn => {
  btn.addEventListener("click", () => {
    const id   = btn.dataset.id;
    const card = document.getElementById("panel-" + id);

    if (activeMic === id) {
      // Desactivar
      btn.classList.remove("active");
      card.classList.remove("speaking");
      activeMic = null;
    } else {
      // Desactivar anterior
      if (activeMic) {
        const prevBtn  = document.querySelector(`.panelist-mic[data-id="${activeMic}"]`);
        const prevCard = document.getElementById("panel-" + activeMic);
        if (prevBtn)  prevBtn.classList.remove("active");
        if (prevCard) prevCard.classList.remove("speaking");
      }
      // Activar nuevo
      btn.classList.add("active");
      card.classList.add("speaking");
      activeMic = id;
      showToast(`🎙️ ${id.charAt(0).toUpperCase() + id.slice(1)} al micrófono`);
    }
  });
});

// ──────────────────────────────────────────────
// NOTICIAS EN VIVO
// ──────────────────────────────────────────────
function addNews() {
  const title = newsTitleInput?.value.trim();
  const hook  = newsHookInput?.value.trim();
  if (!title) { showToast("❌ Escribe el titular primero"); return; }

  const article = document.createElement("article");
  article.className = "news-item";
  article.innerHTML = `
    <span class="news-dot"></span>
    <div class="news-content">
      <strong>${escapeHTML(title)}</strong>
      ${hook ? `<p class="hook">"${escapeHTML(hook)}"</p>` : ""}
    </div>
    <button class="news-remove" type="button">✕</button>
  `;

  // Botón de eliminar
  article.querySelector(".news-remove").addEventListener("click", () => {
    article.remove();
    showToast("🗑 Noticia eliminada");
  });

  newsList.prepend(article);

  newsTitleInput.value = "";
  newsHookInput.value  = "";
  newsTitleInput.focus();
  showToast("📰 Noticia agregada");
}

// Botón de eliminar para noticias estáticas (ya en el DOM)
document.querySelectorAll(".news-remove").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.closest(".news-item").remove();
    showToast("🗑 Noticia eliminada");
  });
});

if (addNewsBtn) addNewsBtn.addEventListener("click", addNews);
if (newsHookInput) newsHookInput.addEventListener("keydown", e => {
  if (e.key === "Enter") addNews();
});

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ──────────────────────────────────────────────
// LOG DE CLIPS
// ──────────────────────────────────────────────
function saveLog() {
  if (clipLogArea) localStorage.setItem("tdd_clipLog", clipLogArea.value);
}

function logClip() {
  if (!clipLogArea) return;
  const time     = formatHMS(totalSeconds);
  const current  = clipLogArea.value.trim();
  const entry    = `[${time}] 🎬 Clip: `;
  clipLogArea.value = current ? `${clipLogArea.value}\n${entry}` : entry;
  clipLogArea.focus();
  clipLogArea.setSelectionRange(clipLogArea.value.length, clipLogArea.value.length);
  clipLogArea.scrollTop = clipLogArea.scrollHeight;
  saveLog();
  showToast("🎬 Momento marcado");
}

async function copyLog() {
  if (!clipLogArea) return;
  try {
    await navigator.clipboard.writeText(clipLogArea.value);
  } catch {
    clipLogArea.select();
    document.execCommand("copy");
  }
  showToast("📋 Log copiado");
}

function clearLog() {
  if (!clipLogArea) return;
  if (!confirm("¿Limpiar el log de clips?")) return;
  clipLogArea.value = "";
  saveLog();
  showToast("🗑 Log limpiado");
}

if (markClipBtn) markClipBtn.addEventListener("click", logClip);
if (copyLogBtn)  copyLogBtn.addEventListener("click", copyLog);
if (clearLogBtn) clearLogBtn.addEventListener("click", clearLog);
if (clipLogArea) clipLogArea.addEventListener("input", saveLog);

// ──────────────────────────────────────────────
// TOAST
// ──────────────────────────────────────────────
let toastTimeout = null;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2000);
}

// ──────────────────────────────────────────────
// PERSISTENCIA AL CERRAR
// ──────────────────────────────────────────────
window.addEventListener("beforeunload", () => {
  saveTimer();
  saveLog();
});