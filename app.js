const imageInput = document.getElementById('imageInput');
const dropzone = document.getElementById('dropzone');
const previewWrap = document.getElementById('previewWrap');
const preview = document.getElementById('preview');
const analyseBtn = document.getElementById('analyseBtn');
const emptyState = document.getElementById('emptyState');
const analysisResult = document.getElementById('analysisResult');
let currentImageUrl = null;

function loadImage(file) {
  if (!file || !file.type.startsWith('image/')) {
    alert('Please choose a valid image file.');
    return;
  }
  if (currentImageUrl) URL.revokeObjectURL(currentImageUrl);
  currentImageUrl = URL.createObjectURL(file);
  preview.src = currentImageUrl;
  previewWrap.classList.remove('hidden');
  dropzone.classList.add('hidden');
  analyseBtn.disabled = false;
  emptyState.classList.remove('hidden');
  analysisResult.classList.add('hidden');
}

imageInput.addEventListener('change', event => loadImage(event.target.files[0]));
['dragenter','dragover'].forEach(name => dropzone.addEventListener(name, event => {
  event.preventDefault(); dropzone.classList.add('dragover');
}));
['dragleave','drop'].forEach(name => dropzone.addEventListener(name, event => {
  event.preventDefault(); dropzone.classList.remove('dragover');
}));
dropzone.addEventListener('drop', event => loadImage(event.dataTransfer.files[0]));

function runDemoHeuristic() {
  if (!preview.src) return;
  analyseBtn.disabled = true;
  analyseBtn.textContent = 'Screening image…';
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = new Image();
  img.onload = () => {
    const maxSide = 180;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let warm = 0, brightLowSat = 0, samples = 0;
    for (let i = 0; i < pixels.length; i += 16) {
      const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
      const max = Math.max(r,g,b), min = Math.min(r,g,b);
      const saturation = max === 0 ? 0 : (max-min)/max;
      if (r > 150 && r > g*1.12 && g > b*1.05) warm++;
      if (r > 165 && g > 155 && b > 135 && saturation < 0.25) brightLowSat++;
      samples++;
    }
    const warmRatio = warm / Math.max(samples,1);
    const hazeRatio = brightLowSat / Math.max(samples,1);
    // This is intentionally a simple educational visual cue, not a trained classifier.
    const score = Math.min(96, Math.round((warmRatio * 160 + hazeRatio * 38) * 10) / 10);
    const review = score >= 12;
    document.getElementById('resultTitle').textContent = review ? 'Human review recommended' : 'No strong visual cue found';
    document.getElementById('statusSymbol').textContent = review ? '!' : '✓';
    document.getElementById('confidenceText').textContent = score.toFixed(1) + '% colour cue';
    document.getElementById('confidenceMeter').style.width = Math.max(3, score) + '%';
    document.getElementById('resultExplanation').textContent = review
      ? 'The image contains warm-colour or bright low-saturation pixels that crossed this demo threshold. These pixels can also occur in sunlight, soil, buildings or autumn foliage. Verify the scene and location with a trained model and a human reviewer.'
      : 'The demo did not find many warm-colour or bright low-saturation pixels. Smoke and flames may still be present but not visible to this simple method. A low score does not mean the area is safe.';
    emptyState.classList.add('hidden');
    analysisResult.classList.remove('hidden');
    analyseBtn.disabled = false;
    analyseBtn.innerHTML = 'Analyse image <span>→</span>';
  };
  img.onerror = () => {
    alert('The selected image could not be read. Try another image.');
    analyseBtn.disabled = false;
    analyseBtn.innerHTML = 'Analyse image <span>→</span>';
  };
  img.src = currentImageUrl;
}
analyseBtn.addEventListener('click', runDemoHeuristic);

function clearImage() {
  if (currentImageUrl) URL.revokeObjectURL(currentImageUrl);
  currentImageUrl = null;
  preview.removeAttribute('src');
  imageInput.value = '';
  previewWrap.classList.add('hidden');
  dropzone.classList.remove('hidden');
  analyseBtn.disabled = true;
  emptyState.classList.remove('hidden');
  analysisResult.classList.add('hidden');
}
document.getElementById('removeImage').addEventListener('click', clearImage);
document.getElementById('resetAnalysis').addEventListener('click', clearImage);

const observedAt = document.getElementById('observedAt');
if (observedAt) {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  observedAt.value = now.toISOString().slice(0,16);
}
document.getElementById('reportForm').addEventListener('submit', event => {
  event.preventDefault();
  const type = document.getElementById('incidentType').value;
  if (!type) return;
  const lat = document.getElementById('latitude').value;
  const lon = document.getElementById('longitude').value;
  if ((lat && !lon) || (!lat && lon)) {
    alert('Enter both latitude and longitude, or leave both blank.');
    return;
  }
  if (lat && (Number(lat) < -90 || Number(lat) > 90)) {
    alert('Latitude must be between -90 and 90.');
    return;
  }
  if (lon && (Number(lon) < -180 || Number(lon) > 180)) {
    alert('Longitude must be between -180 and 180.');
    return;
  }
  const report = {
    type,
    latitude: lat ? Number(lat) : null,
    longitude: lon ? Number(lon) : null,
    notes: document.getElementById('notes').value.trim(),
    observer: document.getElementById('observer').value.trim(),
    observedAt: document.getElementById('observedAt').value || new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  try {
    const key = 'forestguard-demo-reports';
    const reports = JSON.parse(sessionStorage.getItem(key) || '[]');
    reports.push(report);
    sessionStorage.setItem(key, JSON.stringify(reports));
    document.getElementById('reportSuccess').classList.remove('hidden');
    event.target.reset();
  } catch (error) {
    alert('Could not save the report in this browser session.');
  }
});
