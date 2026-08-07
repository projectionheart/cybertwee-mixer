// ---------- state ----------
const state = {
  imgA: null,
  imgB: null,
  acceleration: 30,
  blendMode: "random",
  hasMixed: false,
};

const BLEND_MODES = [
  "screen", "multiply", "difference", "overlay",
  "color-dodge", "exclusion", "soft-light", "hard-light",
];

// ---------- dom refs ----------
const tubeA = document.getElementById("tubeA");
const tubeB = document.getElementById("tubeB");
const fileA = document.getElementById("fileA");
const fileB = document.getElementById("fileB");
const canvasA = document.getElementById("canvasA");
const canvasB = document.getElementById("canvasB");

const blendSelect = document.getElementById("blendMode");
const accelSlider = document.getElementById("accel");
const accelVal = document.getElementById("accelVal");

const mixBtn = document.getElementById("mixBtn");
const accelerateBtn = document.getElementById("accelerateBtn");
const remixBtn = document.getElementById("remixBtn");
const downloadBtn = document.getElementById("downloadBtn");

const resultTube = document.getElementById("resultTube");
const resultCanvas = document.getElementById("resultCanvas");
const sparkleLayer = document.getElementById("sparkleLayer");
const toast = document.getElementById("toast");

// ---------- helpers ----------
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 2200);
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// draw `img` into canvas with object-fit: cover behavior
function drawCover(ctx, img, w, h) {
  const canvasRatio = w / h;
  const imgRatio = img.width / img.height;
  let sx, sy, sw, sh;
  if (imgRatio > canvasRatio) {
    sh = img.height;
    sw = sh * canvasRatio;
    sy = 0;
    sx = (img.width - sw) / 2;
  } else {
    sw = img.width;
    sh = sw / canvasRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

function sizeCanvasToTube(canvas, tubeEl) {
  const rect = tubeEl.getBoundingClientRect();
  canvas.width = Math.round(rect.width);
  canvas.height = Math.round(rect.height);
}

function previewInTube(canvas, tubeEl, img) {
  sizeCanvasToTube(canvas, tubeEl);
  const ctx = canvas.getContext("2d");
  drawCover(ctx, img, canvas.width, canvas.height);
  tubeEl.classList.add("has-image");
}

// ---------- upload handling ----------
function wireSlot(tubeEl, fileInput, canvas, which) {
  tubeEl.addEventListener("click", () => fileInput.click());
  tubeEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });
  tubeEl.addEventListener("dragover", (e) => { e.preventDefault(); tubeEl.style.outline = "2px dashed #8b5e34"; });
  tubeEl.addEventListener("dragleave", () => { tubeEl.style.outline = "none"; });
  tubeEl.addEventListener("drop", async (e) => {
    e.preventDefault();
    tubeEl.style.outline = "none";
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) await handleFile(file, canvas, tubeEl, which);
  });
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (file) await handleFile(file, canvas, tubeEl, which);
  });
}

async function handleFile(file, canvas, tubeEl, which) {
  if (!file.type.startsWith("image/")) {
    showToast("alas, that is not an image, dear correspondent");
    return;
  }
  try {
    const img = await loadImageFile(file);
    if (which === "A") state.imgA = img; else state.imgB = img;
    previewInTube(canvas, tubeEl, img);
    updateButtonStates();
  } catch {
    showToast("the plate could not be read; pray, try again");
  }
}

function updateButtonStates() {
  const ready = !!(state.imgA && state.imgB);
  mixBtn.disabled = false; // mixBtn click validates + toasts if not ready
}

// ---------- mixing engine ----------
function chromaShift(ctx, w, h, amount) {
  if (amount <= 0) return;
  const shift = Math.round(amount);
  const imgData = ctx.getImageData(0, 0, w, h);
  const src = imgData.data;
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < h; y++) {
    const rowStart = y * w;
    for (let x = 0; x < w; x++) {
      const i = (rowStart + x) * 4;
      const rx = Math.min(w - 1, Math.max(0, x - shift));
      const bx = Math.min(w - 1, Math.max(0, x + shift));
      const ri = (rowStart + rx) * 4;
      const bi = (rowStart + bx) * 4;
      out[i] = src[ri];
      out[i + 1] = src[i + 1];
      out[i + 2] = src[bi + 2];
      out[i + 3] = src[i + 3];
    }
  }
  ctx.putImageData(new ImageData(out, w, h), 0, 0);
}

function glitchSlices(ctx, w, h, intensity) {
  const bands = Math.round(intensity / 7);
  for (let i = 0; i < bands; i++) {
    const y = Math.floor(Math.random() * h);
    const bandH = Math.min(h - y, 3 + Math.random() * 18);
    const offset = Math.round((Math.random() - 0.5) * intensity * 1.8);
    try {
      const slice = ctx.getImageData(0, y, w, bandH);
      ctx.putImageData(slice, offset, y);
    } catch { /* ignore edge cases */ }
  }
}

function pixelate(ctx, canvas, w, h, factor) {
  if (factor <= 1) return;
  const small = document.createElement("canvas");
  small.width = Math.max(1, Math.floor(w / factor));
  small.height = Math.max(1, Math.floor(h / factor));
  const sctx = small.getContext("2d");
  sctx.drawImage(canvas, 0, 0, small.width, small.height);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(small, 0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
}

function applyColorFilter(ctx, canvas, w, h, amount) {
  const temp = document.createElement("canvas");
  temp.width = w;
  temp.height = h;
  temp.getContext("2d").drawImage(canvas, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.filter = `sepia(${30 + amount / 2}%) saturate(${100 - amount / 4}%) contrast(${100 + amount / 3}%) brightness(${100 - amount / 8}%)`;
  ctx.drawImage(temp, 0, 0);
  ctx.filter = "none";
}

function drawScanlines(ctx, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#000";
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1);
  }
  ctx.restore();
}

function pickBlendMode() {
  if (state.blendMode === "random") {
    return BLEND_MODES[Math.floor(Math.random() * BLEND_MODES.length)];
  }
  return state.blendMode;
}

function runMix() {
  if (!state.imgA || !state.imgB) {
    showToast("two specimens are required before combination");
    return;
  }

  const w = resultCanvas.width;
  const h = resultCanvas.height;
  const ctx = resultCanvas.getContext("2d");
  const accel = state.acceleration;

  ctx.clearRect(0, 0, w, h);

  // base layer
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  drawCover(ctx, state.imgA, w, h);

  // blend second source
  const mode = pickBlendMode();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = 0.55 + Math.random() * 0.35;
  drawCover(ctx, state.imgB, w, h);

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;

  // glitch/chaos passes scale with acceleration
  if (accel > 5) chromaShift(ctx, w, h, accel / 7);
  if (accel > 20) glitchSlices(ctx, w, h, accel);
  if (accel > 45) pixelate(ctx, resultCanvas, w, h, 1 + accel / 28);
  applyColorFilter(ctx, resultCanvas, w, h, accel);
  drawScanlines(ctx, w, h);

  resultTube.classList.add("has-image");
  state.hasMixed = true;
  remixBtn.disabled = false;
  downloadBtn.disabled = false;
  accelerateBtn.disabled = false;

  spawnSparkles(4 + Math.round(accel / 12));
}

function spawnSparkles(count) {
  const rect = sparkleLayer.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const s = document.createElement("div");
    s.className = "sparkle";
    const x = Math.random() * rect.width;
    const y = Math.random() * rect.height;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    const hue = ["#8b5e34", "#9c4a4a", "#b8860b", "#4f6b47", "#5c4530"][Math.floor(Math.random() * 5)];
    s.style.background = hue;
    s.style.animationDelay = `${Math.random() * 0.3}s`;
    sparkleLayer.appendChild(s);
    setTimeout(() => s.remove(), 1300);
  }
}

// ---------- controls ----------
blendSelect.addEventListener("change", (e) => {
  state.blendMode = e.target.value;
});

accelSlider.addEventListener("input", (e) => {
  state.acceleration = Number(e.target.value);
  accelVal.textContent = state.acceleration;
});

mixBtn.addEventListener("click", runMix);
remixBtn.addEventListener("click", runMix);

accelerateBtn.addEventListener("click", () => {
  state.acceleration = Math.min(100, state.acceleration + 15);
  accelSlider.value = state.acceleration;
  accelVal.textContent = state.acceleration;
  runMix();
  if (state.acceleration >= 100) {
    showToast("the reaction has reached its utmost intensity");
  }
});

downloadBtn.addEventListener("click", () => {
  resultCanvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "laboratory-specimen.png";
    a.click();
    URL.revokeObjectURL(url);
  });
});

// ---------- init ----------
wireSlot(tubeA, fileA, canvasA, "A");
wireSlot(tubeB, fileB, canvasB, "B");
updateButtonStates();
