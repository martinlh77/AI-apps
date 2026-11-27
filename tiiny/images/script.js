// --------------- Utility functions -------------------
const log = (msg) => {
  const debug = document.getElementById('debugLog');
  const time = new Date().toLocaleTimeString();
  debug.value += `[${time}] ${msg}\n`;
  debug.scrollTop = debug.scrollHeight;
};

const getAuthHeader = () => {
  const key = document.getElementById('apiKey').value.trim();
  return key ? { 'Authorization': `Bearer ${key}` } : null;
};

// Builds an endpoint URL and makes sure it ends in /v1 once
const apiUrl = (path) => {
  let base = document.getElementById('baseURL').value.replace(/\/+$/, '');
  if (!/\/v1$/.test(base)) base += '/v1';
  return `${base}${path}`;
};

const readFileBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject('File read error');
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
};

const clampDim = (value, fallback = 256) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 64 ? n : fallback;
};

const setBusy = (busy) => {
  document.getElementById('spinner').hidden = !busy;
  ['generateBtn', 'enhanceBtn', 'randomBtn'].forEach(id => {
    document.getElementById(id).disabled = busy;
  });
};

const fillSelect = (select, models) => {
  select.innerHTML = '';
  models.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.id;
    select.appendChild(opt);
  });
};

// --------------- Model classification -------------------
// Name-based fallback, used only when the server gives no type information
const IMAGE_NAME_HINT = /image|flux|z-image|krea|sdxl|stable-diffusion|diffusion|dall|imagen/i;
const TEXT_NAME_HINT = /gpt-oss|gemma|llama|mistral|claude|instruct|chat/i;

const declaredType = (m) =>
  String(m.type || m.task || m.modality || '').toLowerCase();

const isImageModel = (m) => {
  const declared = declaredType(m);
  if (declared) return declared.includes('image');
  return IMAGE_NAME_HINT.test(m.id);
};

const isTextModel = (m) => {
  const declared = declaredType(m);
  if (declared) return declared.includes('text') || declared.includes('chat') || declared.includes('llm');
  // A non-image name is treated as text. Image names are text only if they also match a text hint.
  return !IMAGE_NAME_HINT.test(m.id) || TEXT_NAME_HINT.test(m.id);
};

// --------------- Model info display -------------------
let modelCache = [];

const showModelInfo = async (modelId, preId) => {
  const pre = document.getElementById(preId);
  if (!modelId) { pre.textContent = 'No model selected.'; return; }

  // Show the entry from the list first, so something appears immediately
  const listEntry = modelCache.find(m => m.id === modelId);
  pre.textContent = listEntry ? JSON.stringify(listEntry, null, 2) : `Loading ${modelId}…`;

  const auth = getAuthHeader();
  if (!auth) return;

  // Ask the server for full details. Model IDs contain slashes, so encode each part separately.
  const encodedId = modelId.split('/').map(encodeURIComponent).join('/');
  const url = apiUrl(`/models/${encodedId}`);
  try {
    const res = await fetch(url, { headers: auth });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // Only replace the view if the user has not switched to another model meanwhile
    const current = document.getElementById(preId === 'imageModelInfo' ? 'imageModel' : 'textModel').value;
    if (current === modelId) {
      pre.textContent = JSON.stringify(json, null, 2);
    }
    log(`ℹ️ Loaded details for ${modelId}`);
  } catch (e) {
    log(`ℹ️ Detail endpoint unavailable for ${modelId} (${e}). Showing list entry instead.`);
  }
};

// --------------- Model Loading -------------------
const loadModels = async () => {
  const auth = getAuthHeader();
  if (!auth) { log('⚠️ API Key missing – cannot load models'); return; }

  const url = apiUrl('/models');
  log(`Fetching models from ${url}`);
  try {
    const res = await fetch(url, { headers: auth });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const models = json.data || [];
    modelCache = models;

    // Log the raw metadata so you can see what the server reports for each model
    log(`🔍 Raw model metadata: ${JSON.stringify(models.map(m => ({ id: m.id, type: m.type, task: m.task, modality: m.modality, object: m.object })))}`);

    let imageModels = models.filter(isImageModel);
    let textModels = models.filter(isTextModel);

    if (textModels.length === 0) {
      log('ℹ️ No text models detected by name or type – showing all models in the text list');
      textModels = models;
    }
    if (imageModels.length === 0) {
      log('ℹ️ No image models detected by name or type – showing all models in the image list');
      imageModels = models;
    }

    fillSelect(document.getElementById('imageModel'), imageModels);
    fillSelect(document.getElementById('textModel'), textModels);

    log(`✅ Loaded ${imageModels.length} image model(s) and ${textModels.length} text model(s)`);

    showModelInfo(document.getElementById('imageModel').value, 'imageModelInfo');
    showModelInfo(document.getElementById('textModel').value, 'textModelInfo');
  } catch (e) {
    log(`❌ Error loading models: ${e}`);
  }
};

// --------------- Reference image -------------------
const removeReferenceImage = () => {
  const input = document.getElementById('reference');
  if (!input.files.length) { log('ℹ️ No reference image to remove'); return; }
  input.value = '';
  log('🗑️ Reference image removed');
};

// --------------- Image Generation -------------------
const showDownloadLink = (src, format) => {
  const preview = document.getElementById('preview');
  const old = document.getElementById('downloadLink');
  if (old) old.remove();
  const a = document.createElement('a');
  a.id = 'downloadLink';
  a.href = src;
  a.download = `image-${Date.now()}.${format}`;
  a.textContent = `Download .${format}`;
  preview.appendChild(a);
};

const generateImage = async () => {
  const auth = getAuthHeader();
  if (!auth) { log('⚠️ API Key missing – cannot generate image'); return; }

  const model = document.getElementById('imageModel').value;
  if (!model) { log('⚠️ No image model selected – click Load Models first'); return; }

  const prompt = document.getElementById('prompt').value.trim();
  if (!prompt) { log('⚠️ Prompt is empty'); return; }

  const width = clampDim(document.getElementById('width').value);
  const height = clampDim(document.getElementById('height').value);
  const format = document.getElementById('format').value || 'webp';

  const body = {
    model,
    prompt,
    width,
    height,
    size: `${width}x${height}`,
    n: 1,
    response_format: 'b64_json',
    output_format: format
  };

  const refFile = document.getElementById('reference').files[0];
  if (refFile) {
    log(`🔍 Reading reference image ${refFile.name}`);
    try {
      body.image = await readFileBase64(refFile);
      log('✅ Reference image read');
    } catch (e) {
      log(`❌ Reference image error: ${e}. Continuing without it.`);
    }
  }

  const url = apiUrl('/images/generations');
  log(`📤 Sending image request to ${url} (model: ${model}, ${width}x${height}, ${format})`);
  setBusy(true);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${errText}`);
    }
    const json = await res.json();
    const data = json.data && json.data[0];
    if (!data) throw new Error('No image data returned');

    const mime = format === 'jpg' ? 'image/jpeg' : 'image/webp';
    const img = document.getElementById('generatedImg');

    const b64 = data.b64_json || data.image || data.b64;
    if (b64) {
      img.src = `data:${mime};base64,${b64}`;
      log('✅ Image generated (base64)');
      showDownloadLink(img.src, format);
    } else if (data.url) {
      img.src = data.url;
      log('✅ Image generated (URL)');
      showDownloadLink(data.url, format);
    } else {
      throw new Error('Unrecognised image data format');
    }
  } catch (e) {
    log(`❌ Generation error: ${e}`);
  } finally {
    setBusy(false);
  }
};

// --------------- Shared text-model call -------------------
const chatComplete = async (messages, temperature = 0.7) => {
  const auth = getAuthHeader();
  if (!auth) throw new Error('API Key missing');
  const model = document.getElementById('textModel').value;
  if (!model) throw new Error('No text model selected – click Load Models first');

  const url = apiUrl('/chat/completions');
  log(`📤 Text request to ${url} (model: ${model})`);
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, temperature })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const choice = json.choices && json.choices[0];
  if (!choice || !choice.message) throw new Error('No response choice');
  return choice.message.content.trim();
};

// --------------- Prompt Enhancer -------------------
const enhancePrompt = async () => {
  const original = document.getElementById('prompt').value.trim();
  if (!original) { log('⚠️ Prompt is empty – cannot enhance'); return; }

  setBusy(true);
  try {
    const enhanced = await chatComplete([
      {
        role: 'system',
        content: 'You rewrite text-to-image prompts. Add concrete detail about subject, setting, lighting, composition, style, and colour. Keep the original intent. Reply with only the improved prompt, no commentary.'
      },
      { role: 'user', content: `Enhance this prompt:\n${original}` }
    ], 0.7);
    document.getElementById('prompt').value = enhanced;
    log(`✅ Prompt enhanced: ${enhanced}`);
  } catch (e) {
    log(`❌ Enhancement error: ${e}`);
  } finally {
    setBusy(false);
  }
};

// --------------- Random Prompt Generator -------------------
const generateRandomPrompt = async () => {
  setBusy(true);
  try {
    const rnd = await chatComplete([
      {
        role: 'system',
        content: 'You invent original, vivid text-to-image prompts. Vary subject, style and setting every time. Reply with only one prompt, no commentary.'
      },
      { role: 'user', content: `Generate a random image prompt. Seed: ${Math.random().toString(36).slice(2, 8)}` }
    ], 1.0);
    document.getElementById('prompt').value = rnd;
    log(`✅ Random prompt generated: ${rnd}`);
  } catch (e) {
    log(`❌ Random prompt error: ${e}`);
  } finally {
    setBusy(false);
  }
};

// --------------- Event Listeners -------------------
document.getElementById('loadModels').addEventListener('click', loadModels);
document.getElementById('generateBtn').addEventListener('click', generateImage);
document.getElementById('enhanceBtn').addEventListener('click', enhancePrompt);
document.getElementById('randomBtn').addEventListener('click', generateRandomPrompt);
document.getElementById('removeRef').addEventListener('click', removeReferenceImage);
document.getElementById('clearLog').addEventListener('click', () => {
  document.getElementById('debugLog').value = '';
});

document.getElementById('imageModel').addEventListener('change', (e) => {
  showModelInfo(e.target.value, 'imageModelInfo');
});
document.getElementById('textModel').addEventListener('change', (e) => {
  showModelInfo(e.target.value, 'textModelInfo');
});

log('App ready. Enter your API key and click Load Models.');
