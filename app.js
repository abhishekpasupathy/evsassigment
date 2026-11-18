const API_KEY = 'forestguard-api-url';
const DEFAULT_API = 'http://localhost:8000';
const imageInput = document.getElementById('imageInput');
const dropzone = document.getElementById('dropzone');
const previewWrap = document.getElementById('previewWrap');
const preview = document.getElementById('preview');
const analyseBtn = document.getElementById('analyseBtn');
const emptyState = document.getElementById('emptyState');
const analysisResult = document.getElementById('analysisResult');
let currentImageUrl = null;

function apiBase() {
  const params = new URLSearchParams(window.location.search);
  const queryValue = params.get('api');
  const configured = queryValue || localStorage.getItem(API_KEY) || DEFAULT_API;
  return configured.replace(/\\/+$/, '');
}
function showMessage(title, message, warning = true) {
  document.getElementById('resultTitle').textContent = title;
  document.getElementById('statusSymbol').textContent = warning ? '!' : '✓';
  document.getElementById('confidenceText').textContent = 'Model response';
  document.getElementById('confidenceMeter').style.width = '0%';
  document.getElementById('resultExplanation').textContent = message;
  emptyState.classList.add('hidden');
  analysisResult.classList.remove('hidden');
}
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
dropzone.addEventListener('drop', event => {
  event.preventDefault();
  loadImage(event.dataTransfer.files[0]);
});

async function runModelPrediction() {
  const file = imageInput.files && imageInput.files[0];
  if (!file) return;
  analyseBtn.disabled = true;
  analyseBtn.textContent = 'Running trained model…';
  try {
    const form = new FormData();
    form.append('file', file);
    form.append('confidence', '0.25');
    const response = await fetch(apiBase() + '/api/detect', { method: 'POST', body: form });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'Inference request failed (' + response.status + ').');
    const detections = Array.isArray(data.detections) ? data.detections : [];
    const summary = detections.length
      ? detections.map(d => d.label + ' (' + (Number(d.confidence) * 100).toFixed(1) + '%)').join(', ')
      : 'The trained model returned no fire/smoke detections above the selected threshold.';
    const detected = Boolean(data.fire_detected || data.smoke_detected);
    showMessage(data.status || (detected ? 'Potential fire/smoke detected' : 'No target objects detected'),
      summary + '\\n\\n' + (data.warning || 'Research prototype only. Verify with authorised personnel.'), !detected);
    document.getElementById('confidenceText').textContent = detections.length
      ? (Math.max(...detections.map(d => Number(d.confidence))) * 100).toFixed(1) + '% top detection score'
      : 'No detections';
    document.getElementById('confidenceMeter').style.width = detections.length
      ? Math.max(3, Math.round(Math.max(...detections.map(d => Number(d.confidence))) * 100)) + '%'
      : '0%';
  } catch (error) {
    showMessage('Model prediction unavailable', error.message + ' Confirm that the FastAPI service is deployed, MODEL_PATH points to a trained best.pt checkpoint, and CORS allows this website. No heuristic or made-up prediction was substituted.');
  } finally {
    analyseBtn.disabled = false;
    analyseBtn.innerHTML = 'Run trained model <span>→</span>';
  }
}
analyseBtn.addEventListener('click', runModelPrediction);

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
    alert('Latitude must be between -90 and 90.'); return;
  }
  if (lon && (Number(lon) < -180 || Number(lon) > 180)) {
    alert('Longitude must be between -180 and 180.'); return;
  }
  const report = { type, latitude: lat ? Number(lat) : null, longitude: lon ? Number(lon) : null,
    notes: document.getElementById('notes').value.trim(),
    observer: document.getElementById('observer').value.trim(),
    observedAt: document.getElementById('observedAt').value || new Date().toISOString(),
    createdAt: new Date().toISOString() };
  try {
    const key = 'forestguard-demo-reports';
    const reports = JSON.parse(sessionStorage.getItem(key) || '[]');
    reports.push(report);
    sessionStorage.setItem(key, JSON.stringify(reports));
    document.getElementById('reportSuccess').classList.remove('hidden');
    event.target.reset();
  } catch (error) { alert('Could not save the report in this browser session.'); }
});
