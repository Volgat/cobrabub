const { ipcRenderer } = require('electron');

// ─── State ────────────────────────────────────────────────────────────────────
let currentProject = null;
let openFiles      = [];   // { path, name, content, isModified }
let activeFile     = null;
let modelConfig    = null;
let chatHistory    = [];
let isLoading      = false;
let fileTreeCache  = '';   // text tree for agent context
let allFiles       = [];   // flat list of all project files for search
let activeAttachments = []; // list of { mimeType, data }
let agentLoopActive = false;
let currentAgentTurn = 0;
const MAX_AGENT_TURNS = 10;
let userIntervention = null;

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const fileTreeEl     = document.getElementById('file-tree');
const codeEditor     = document.getElementById('code-editor');
const highlightLayer = document.getElementById('highlight-layer');
const tabsContainer  = document.getElementById('tabs');
const chatMessages   = document.getElementById('chat-messages');
const chatInput      = document.getElementById('chat-input');
const configModal    = document.getElementById('config-modal');
const taskList       = document.getElementById('task-list');
const terminalOutput = document.getElementById('terminal-output');
const terminalInput  = document.getElementById('terminal-input');

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  await loadModelConfig();
  setupEventListeners();
  setupKeyboardShortcuts();
  updateStatusBar();
  updateLineNumbers();
}

// ─── Event Listeners ──────────────────────────────────────────────────────────
function setupEventListeners() {
  // File ops
  document.getElementById('open-folder-btn').addEventListener('click', openFolder);
  document.getElementById('open-file-btn')?.addEventListener('click', openFileClick);
  document.getElementById('refresh-files').addEventListener('click', () => currentProject && loadFileTree(currentProject));
  document.getElementById('new-file-btn').addEventListener('click', createNewFile);
  document.getElementById('new-folder-btn')?.addEventListener('click', createNewFolder);
  document.getElementById('save-file-btn')?.addEventListener('click', saveCurrentFile);

  // File search
  const searchInput = document.getElementById('file-search');
  searchInput?.addEventListener('input', e => filterFileTree(e.target.value));
  searchInput?.addEventListener('keydown', e => { if (e.key === 'Escape') { e.target.value = ''; filterFileTree(''); } });

  // Editor
  codeEditor.addEventListener('input', onEditorInput);
  codeEditor.addEventListener('keydown', onEditorKeydown);
  codeEditor.addEventListener('keyup', updateCursorPosition);
  codeEditor.addEventListener('click', updateCursorPosition);
  codeEditor.addEventListener('scroll', syncHighlightScroll);

  // Agent
  document.getElementById('send-message').addEventListener('click', sendMessage);
  
  // Custom click handler for run-agent to handle Stop capability during autonomous loops
  document.getElementById('run-agent').addEventListener('click', () => {
    if (agentLoopActive) {
      agentLoopActive = false;
      addChatMessage('system', '🛑 Arrêt de l\'agent demandé...');
    } else {
      runAgentTask();
    }
  });

  document.getElementById('configure-model').addEventListener('click', showConfigModal);
  document.getElementById('agent-settings').addEventListener('click', showConfigModal);
  document.getElementById('toggle-agent-panel').addEventListener('click', toggleAgentPanel);

  // Config modal
  document.getElementById('close-modal').addEventListener('click', hideConfigModal);
  document.getElementById('cancel-config').addEventListener('click', hideConfigModal);
  document.getElementById('save-config').addEventListener('click', saveModelConfig);
  document.getElementById('model-type-config')?.addEventListener('change', onModelTypeChange);
  document.getElementById('model-type')?.addEventListener('change', e => {
    document.getElementById('model-type-config').value = e.target.value;
    onModelTypeChange();
  });

  // Chat keyboard
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // Terminal
  document.getElementById('toggle-terminal')?.addEventListener('click', toggleTerminal);
  document.getElementById('clear-terminal')?.addEventListener('click', clearTerminal);
  terminalInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const cmd = terminalInput.value.trim();
      if (cmd) { runTerminalCommand(cmd); terminalInput.value = ''; }
    }
  });

  // ─── New Media Attachments Listeners ───
  const addMediaBtn = document.getElementById('add-media-btn');
  const mediaDropdown = document.getElementById('media-dropdown');
  const mediaFileInput = document.getElementById('media-file-input');

  addMediaBtn?.addEventListener('click', e => {
    e.stopPropagation();
    mediaDropdown?.classList.toggle('active');
  });

  document.addEventListener('click', e => {
    if (mediaDropdown && !mediaDropdown.contains(e.target) && e.target !== addMediaBtn) {
      mediaDropdown.classList.remove('active');
    }
  });

  document.getElementById('btn-attach-file')?.addEventListener('click', () => {
    mediaDropdown?.classList.remove('active');
    mediaFileInput?.click();
  });

  mediaFileInput?.addEventListener('change', handleMediaFileSelect);

  document.getElementById('btn-capture-screen')?.addEventListener('click', () => {
    mediaDropdown?.classList.remove('active');
    openScreenCaptureModal();
  });

  document.getElementById('close-capture-modal')?.addEventListener('click', closeScreenCaptureModal);
  document.getElementById('cancel-capture')?.addEventListener('click', closeScreenCaptureModal);

  // IPC: file written by agent → auto-open
  ipcRenderer.on('file-written', (event, filePath) => {
    appendTerminalLine(`📁 Fichier écrit: ${filePath}`, 'info');
    autoOpenFile(filePath);
  });

  // IPC: streaming terminal output
  ipcRenderer.on('terminal-output', (event, { type, data, code }) => {
    if (type === 'stdout') appendTerminalLine(data, 'stdout');
    else if (type === 'stderr') appendTerminalLine(data, 'stderr');
    else if (type === 'exit') appendTerminalLine(`\n[Processus terminé avec code ${code}]`, code === 0 ? 'info' : 'error');
    else if (type === 'error') appendTerminalLine(`Erreur: ${data}`, 'error');
  });
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveCurrentFile(); }
    if ((e.ctrlKey || e.metaKey) && e.key === '`') { e.preventDefault(); toggleTerminal(); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); document.getElementById('file-search')?.focus(); }
  });
}

// ─── Folder / File Tree ───────────────────────────────────────────────────────
async function openFolder() {
  const folderPath = await ipcRenderer.invoke('open-directory-dialog');
  if (!folderPath) return;
  currentProject = folderPath;
  document.getElementById('project-name').textContent = folderPath.split(/[\\/]/).pop();
  allFiles = [];
  await loadFileTree(folderPath);
  await refreshFileTreeCache();
  addChatMessage('system', `📂 Projet ouvert: ${folderPath}`);
}

async function openFileClick() {
  const filePath = await ipcRenderer.invoke('open-file-dialog');
  if (!filePath) return;
  if (!currentProject) {
    const parentDir = filePath.substring(0, Math.max(filePath.lastIndexOf('\\'), filePath.lastIndexOf('/')));
    currentProject = parentDir;
    document.getElementById('project-name').textContent = parentDir.split(/[\\/]/).pop();
    allFiles = [];
    await loadFileTree(parentDir);
    await refreshFileTreeCache();
  }
  openFile(filePath);
}

async function refreshFileTreeCache() {
  if (!currentProject) return;
  const result = await ipcRenderer.invoke('get-file-tree', currentProject);
  if (result.success) fileTreeCache = result.tree;
}

async function loadFileTree(dirPath, container = fileTreeEl) {
  container.innerHTML = '<div class="loading-state">⏳ Chargement...</div>';
  const result = await ipcRenderer.invoke('list-directory', dirPath);
  if (result.success) renderFileTree(result.items, container, dirPath);
  else container.innerHTML = `<div class="empty-state">Erreur: ${result.error}</div>`;
}

function renderFileTree(items, container = fileTreeEl, parentPath = '') {
  container.innerHTML = '';
  if (!items.length) { container.innerHTML = '<div class="empty-state">Dossier vide</div>'; return; }

  items.forEach(item => {
    // Track all files for search
    if (!item.isDirectory) allFiles.push({ name: item.name, path: item.path });

    const el = document.createElement('div');
    el.className = `file-item ${item.isDirectory ? 'folder-item' : ''}`;
    el.dataset.path = item.path;
    el.dataset.name = item.name.toLowerCase();
    el.innerHTML = `<span class="file-icon">${item.isDirectory ? '📁' : getFileIcon(item.name)}</span><span class="file-name">${item.name}</span>`;

    // Context menu on right-click
    el.addEventListener('contextmenu', e => { e.preventDefault(); showContextMenu(e, item); });

    el.addEventListener('click', async e => {
      e.stopPropagation();
      // Remove previous active
      document.querySelectorAll('.file-item.active').forEach(x => x.classList.remove('active'));
      el.classList.add('active');

      if (item.isDirectory) {
        const expanded = el.classList.toggle('expanded');
        el.querySelector('.file-icon').textContent = expanded ? '📂' : '📁';
        let child = el.querySelector('.sub-tree');
        if (expanded && !child) {
          child = document.createElement('div');
          child.className = 'sub-tree file-tree';
          el.appendChild(child);
          await loadFileTree(item.path, child);
          await refreshFileTreeCache();
        } else if (child) {
          child.style.display = expanded ? '' : 'none';
        }
      } else {
        openFile(item.path);
      }
    });

    container.appendChild(el);
  });
}

// ─── File Search ──────────────────────────────────────────────────────────────
function filterFileTree(query) {
  const q = query.toLowerCase().trim();

  if (!q) {
    // Show all
    document.querySelectorAll('.file-item').forEach(el => el.style.display = '');
    document.querySelectorAll('.sub-tree').forEach(el => el.style.display = '');
    return;
  }

  // Search in flat file list and highlight matches
  const matches = allFiles.filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));

  // Hide all items first
  document.querySelectorAll('.file-item').forEach(el => {
    const name = el.dataset.name || '';
    const isMatch = name.includes(q);
    el.style.display = isMatch ? '' : 'none';
  });

  // Show parent containers
  document.querySelectorAll('.sub-tree').forEach(el => el.style.display = '');
}

function getFileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  const m = { js:'🟨',jsx:'⚛️',ts:'🔷',tsx:'⚛️',py:'🐍',html:'🌐',css:'🎨',scss:'🎨',json:'📋',md:'📝',txt:'📄',java:'☕',cpp:'⚙️',c:'⚙️',rs:'🦀',go:'🔹',rb:'💎',php:'🐘',sh:'📟',yml:'⚙️',yaml:'⚙️',xml:'📰',sql:'🗃️',env:'🔑',dockerfile:'🐳',png:'🖼️',jpg:'🖼️',svg:'🎨',pdf:'📄',zip:'📦' };
  return m[ext] || '📄';
}

// ─── Context Menu ─────────────────────────────────────────────────────────────
function showContextMenu(e, item) {
  document.getElementById('context-menu')?.remove();
  const menu = document.createElement('div');
  menu.id = 'context-menu';
  menu.className = 'context-menu';
  menu.style.cssText = `position:fixed;top:${e.clientY}px;left:${e.clientX}px;z-index:9999;`;

  const actions = item.isDirectory
    ? [['📄 Nouveau fichier', () => createNewFileIn(item.path)], ['📂 Nouveau dossier', () => createNewFolderIn(item.path)], ['🗑️ Supprimer', () => deleteItem(item)]]
    : [['✏️ Ouvrir', () => openFile(item.path)], ['💬 Demander à l\'AI', () => askAIAboutFile(item)], ['🗑️ Supprimer', () => deleteItem(item)]];

  actions.forEach(([label, fn]) => {
    const btn = document.createElement('button');
    btn.className = 'ctx-item';
    btn.textContent = label;
    btn.onclick = () => { fn(); menu.remove(); };
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);
  document.addEventListener('click', () => menu.remove(), { once: true });
}

function askAIAboutFile(item) {
  chatInput.value = `Analyse ce fichier: ${item.name}`;
  openFile(item.path).then(() => sendMessage());
}

async function deleteItem(item) {
  if (!confirm(`Supprimer "${item.name}"?`)) return;
  await ipcRenderer.invoke('delete-file', item.path);
  if (currentProject) loadFileTree(currentProject);
}

// ─── File Open / Edit ─────────────────────────────────────────────────────────
async function openFile(filePath) {
  const result = await ipcRenderer.invoke('read-file', filePath);
  if (!result.success) { showError('Impossible d\'ouvrir: ' + result.error); return; }

  let file = openFiles.find(f => f.path === filePath);
  if (!file) {
    file = { path: filePath, name: filePath.split(/[\\/]/).pop(), content: result.content, isModified: false };
    openFiles.push(file);
  } else {
    file.content = result.content;
    file.isModified = false;
  }
  setActiveFile(file);
}

async function autoOpenFile(filePath) {
  // Re-open / refresh file if already open, else open it
  const existing = openFiles.find(f => f.path === filePath);
  if (existing) {
    const result = await ipcRenderer.invoke('read-file', filePath);
    if (result.success) {
      existing.content = result.content;
      existing.isModified = false;
      if (activeFile?.path === filePath) {
        codeEditor.value = result.content;
        highlightCode();
        updateLineNumbers();
      }
      renderTabs();
    }
  } else {
    await openFile(filePath);
  }
}

function setActiveFile(file) {
  activeFile = file;
  codeEditor.value = file.content;
  highlightCode();
  renderTabs();
  updateFileLanguage(file.path);
  updateCursorPosition();
  updateLineNumbers();

  // Highlight active in tree
  document.querySelectorAll('.file-item').forEach(el => {
    el.classList.toggle('active', el.dataset.path === file.path);
  });
}

async function createNewFile() {
  if (!currentProject) { showError('Ouvrez un dossier d\'abord'); return; }
  const name = prompt('Nom du fichier:');
  if (!name) return;
  const filePath = currentProject + '\\' + name;
  await ipcRenderer.invoke('write-file', filePath, '');
  await loadFileTree(currentProject);
  openFile(filePath);
}

async function createNewFileIn(dirPath) {
  const name = prompt('Nom du fichier:');
  if (!name) return;
  const filePath = dirPath + '\\' + name;
  await ipcRenderer.invoke('write-file', filePath, '');
  await loadFileTree(currentProject);
  openFile(filePath);
}

async function createNewFolder() {
  if (!currentProject) { showError('Ouvrez un dossier d\'abord'); return; }
  const name = prompt('Nom du dossier:');
  if (!name) return;
  await ipcRenderer.invoke('create-folder', currentProject + '\\' + name);
  loadFileTree(currentProject);
}

async function createNewFolderIn(dirPath) {
  const name = prompt('Nom du dossier:');
  if (!name) return;
  await ipcRenderer.invoke('create-folder', dirPath + '\\' + name);
  loadFileTree(currentProject);
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function renderTabs() {
  tabsContainer.innerHTML = '';
  openFiles.forEach(file => {
    const tab = document.createElement('div');
    tab.className = `tab ${file === activeFile ? 'active' : ''} ${file.isModified ? 'modified' : ''}`;
    tab.innerHTML = `
      <span class="tab-status-dot ${file.isModified ? 'modified' : 'saved'}"></span>
      <span class="tab-name">${getFileIcon(file.name)} ${file.name}</span>
      <span class="tab-close">×</span>
    `;
    tab.addEventListener('click', e => { if (!e.target.classList.contains('tab-close')) setActiveFile(file); });
    tab.querySelector('.tab-close').addEventListener('click', e => { e.stopPropagation(); closeFile(file.path); });
    tabsContainer.appendChild(tab);
  });
}

function closeFile(filePath) {
  const idx = openFiles.findIndex(f => f.path === filePath);
  if (idx === -1) return;
  if (openFiles[idx].isModified && !confirm('Modifications non sauvegardées. Fermer quand même?')) return;
  openFiles.splice(idx, 1);
  if (activeFile?.path === filePath) {
    if (openFiles.length > 0) setActiveFile(openFiles[Math.max(0, idx - 1)]);
    else { activeFile = null; codeEditor.value = ''; clearHighlight(); updateLineNumbers(); }
  }
  renderTabs();
}

// ─── Editor ───────────────────────────────────────────────────────────────────
function onEditorInput() {
  if (!activeFile) return;
  activeFile.content = codeEditor.value;
  activeFile.isModified = true;
  renderTabs();
  updateLineNumbers();
  highlightCode();
  updateSaveIndicator('modified');
}

function onEditorKeydown(e) {
  if (e.key === 'Tab') {
    e.preventDefault();
    const s = codeEditor.selectionStart, end = codeEditor.selectionEnd;
    codeEditor.value = codeEditor.value.substring(0, s) + '  ' + codeEditor.value.substring(end);
    codeEditor.selectionStart = codeEditor.selectionEnd = s + 2;
    if (activeFile) { activeFile.content = codeEditor.value; highlightCode(); }
  }
  // Auto-close pairs
  const pairs = { '(':')', '[':']', '{':'}', '"':'"', "'":"'", '`':'`' };
  if (pairs[e.key] && e.key !== '"' && e.key !== "'" && e.key !== '`') {
    e.preventDefault();
    const s = codeEditor.selectionStart;
    const sel = codeEditor.value.substring(s, codeEditor.selectionEnd);
    codeEditor.value = codeEditor.value.substring(0, s) + e.key + sel + pairs[e.key] + codeEditor.value.substring(codeEditor.selectionEnd);
    codeEditor.selectionStart = codeEditor.selectionEnd = s + 1;
    if (activeFile) { activeFile.content = codeEditor.value; highlightCode(); }
  }
}

async function saveCurrentFile() {
  if (!activeFile) return;
  updateSaveIndicator('saving');
  const result = await ipcRenderer.invoke('write-file', activeFile.path, activeFile.content);
  if (result.success) {
    activeFile.isModified = false;
    renderTabs();
    updateSaveIndicator('saved');
    setTimeout(() => updateSaveIndicator(''), 2500);
  } else {
    showError('Sauvegarde échouée: ' + result.error);
    updateSaveIndicator('');
  }
}

function updateSaveIndicator(state) {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  const states = { saving: '⏳ Sauvegarde…', saved: '✓ Sauvegardé', modified: '● Non sauvegardé', '': '' };
  const classes = { saving: 'saving', saved: 'saved', modified: 'modified', '': '' };
  el.textContent = states[state] || '';
  el.className = 'save-badge ' + (classes[state] || '');
}

// ─── Syntax Highlighting ──────────────────────────────────────────────────────
function highlightCode() {
  if (!highlightLayer || typeof hljs === 'undefined') return;
  const lang = detectLang(activeFile?.path || '');
  try {
    const r = lang
      ? hljs.highlight(codeEditor.value, { language: lang, ignoreIllegals: true })
      : hljs.highlightAuto(codeEditor.value);
    highlightLayer.innerHTML = r.value + '\n';
  } catch (e) { highlightLayer.textContent = codeEditor.value; }
}

function clearHighlight() { if (highlightLayer) highlightLayer.innerHTML = ''; }

function syncHighlightScroll() {
  if (highlightLayer) { highlightLayer.scrollTop = codeEditor.scrollTop; highlightLayer.scrollLeft = codeEditor.scrollLeft; }
  const ln = document.getElementById('line-numbers');
  if (ln) ln.scrollTop = codeEditor.scrollTop;
}

function detectLang(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const m = { js:'javascript',jsx:'javascript',ts:'typescript',tsx:'typescript',py:'python',html:'html',css:'css',scss:'scss',json:'json',md:'markdown',java:'java',cpp:'cpp',c:'c',rs:'rust',go:'go',rb:'ruby',php:'php',sh:'bash',bash:'bash',yml:'yaml',yaml:'yaml',xml:'xml',sql:'sql' };
  return m[ext] || null;
}

function updateLineNumbers() {
  const ln = document.getElementById('line-numbers');
  if (!ln) return;
  const lines = (codeEditor.value.match(/\n/g) || []).length + 1;
  let html = '';
  for (let i = 1; i <= lines; i++) html += `<div>${i}</div>`;
  ln.innerHTML = html;
}

function updateCursorPosition() {
  const text = codeEditor.value.substring(0, codeEditor.selectionStart).split('\n');
  const activeLine = text.length;
  document.getElementById('cursor-position').textContent = `Ln ${activeLine}, Col ${text[text.length - 1].length + 1}`;
  
  // Highlight current line number in the gutter
  const divs = document.querySelectorAll('#line-numbers div');
  divs.forEach((div, idx) => {
    div.classList.toggle('active', idx + 1 === activeLine);
  });
}

function updateFileLanguage(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const langs = { js:'JavaScript',jsx:'JSX',ts:'TypeScript',tsx:'TSX',py:'Python',html:'HTML',css:'CSS',json:'JSON',md:'Markdown',java:'Java',cpp:'C++',c:'C',rs:'Rust',go:'Go',rb:'Ruby',php:'PHP',sh:'Shell',yml:'YAML' };
  document.getElementById('file-language').textContent = langs[ext] || 'Plain Text';
}

// ─── Config & Model ───────────────────────────────────────────────────────────
async function loadModelConfig() {
  modelConfig = await ipcRenderer.invoke('get-model-config');
  populateConfigModal();
  updateStatusBar();
}

function populateConfigModal() {
  if (!modelConfig) return;
  const s = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined) el.value = v; };
  s('model-type-config', modelConfig.type);
  s('model-type', modelConfig.type);
  s('api-key', modelConfig.apiKey);
  s('model-name', modelConfig.modelName);
  s('base-url', modelConfig.baseUrl);
}

function showConfigModal() { populateConfigModal(); onModelTypeChange(); configModal.classList.add('active'); }
function hideConfigModal() { configModal.classList.remove('active'); }

function onModelTypeChange() {
  const type = document.getElementById('model-type-config')?.value || 'anthropic';
  const PROVIDERS = {
    anthropic: { url:'https://api.anthropic.com', model:'claude-haiku-4-5', lock:true, hint:'console.anthropic.com' },
    openai:    { url:'https://api.openai.com/v1', model:'gpt-4o-mini', lock:true, hint:'platform.openai.com' },
    gemini:    { url:'https://generativelanguage.googleapis.com/v1beta', model:'gemini-1.5-flash', lock:true, hint:'aistudio.google.com' },
    qwen:      { url:'https://dashscope.aliyuncs.com/api/v1', model:'qwen-max', lock:true, hint:'dashscope.aliyun.com' },
    ollama:    { url:'http://localhost:11434', model:'llama3.2', lock:false, hint:'Aucune clé requise — Ollama local' },
    lmstudio:  { url:'http://localhost:1234/v1', model:'local-model', lock:false, hint:'Aucune clé requise — LM Studio local' },
    vllm:      { url:'http://localhost:8000/v1', model:'meta-llama/Llama-3-8b-instruct', lock:false, hint:'Aucune clé requise — vLLM local' },
    custom:    { url:'', model:'custom-model', lock:false, hint:'Entrez l\'URL de votre API' },
  };
  const cfg = PROVIDERS[type] || PROVIDERS.custom;
  const buEl = document.getElementById('base-url');
  const mnEl = document.getElementById('model-name');
  if (buEl) { buEl.value = cfg.url; buEl.readOnly = cfg.lock; buEl.style.opacity = cfg.lock ? '0.6' : '1'; }
  if (mnEl) mnEl.value = cfg.model;
  const hintEl = document.getElementById('api-key-hint');
  if (hintEl) hintEl.innerHTML = `Clé API sur <strong>${cfg.hint}</strong>`;
  const isLocal = ['ollama','lmstudio','vllm'].includes(type);
  const akGroup = document.getElementById('api-key-group');
  if (akGroup) akGroup.style.opacity = isLocal ? '0.5' : '1';
  const sidebarSel = document.getElementById('model-type');
  if (sidebarSel) sidebarSel.value = type;

  const suggestions = {
    anthropic: ['claude-haiku-4-5','claude-sonnet-4-5','claude-opus-4-5','claude-3-5-haiku-20241022','claude-3-5-sonnet-20241022','claude-3-haiku-20240307'],
    openai:    ['gpt-4o-mini','gpt-4o','gpt-4-turbo','gpt-3.5-turbo','o1-mini','o1'],
    gemini:    ['gemini-1.5-flash','gemini-1.5-pro','gemini-2.0-flash'],
    qwen:      ['qwen-max','qwen-plus','qwen-turbo'],
    ollama:    ['llama3.2','llama3.1','mistral','codellama','qwen2.5-coder','deepseek-r1','phi3'],
    lmstudio:  ['local-model'], vllm: ['meta-llama/Llama-3-8b-instruct'], custom: [],
  };
  const datalist = document.getElementById('model-suggestions');
  if (datalist) datalist.innerHTML = (suggestions[type] || []).map(m => `<option value="${m}">`).join('');
}

async function saveModelConfig() {
  const config = {
    type:      document.getElementById('model-type-config')?.value || 'anthropic',
    apiKey:    document.getElementById('api-key')?.value || '',
    modelName: document.getElementById('model-name')?.value || '',
    baseUrl:   document.getElementById('base-url')?.value || '',
  };
  await ipcRenderer.invoke('save-model-config', config);
  modelConfig = config;
  updateStatusBar();
  hideConfigModal();
  addChatMessage('system', `✅ Modèle configuré: ${config.type} / ${config.modelName}`);
}

function updateStatusBar() {
  const ok = modelConfig?.apiKey || ['ollama','lmstudio','vllm'].includes(modelConfig?.type);
  const el = document.getElementById('agent-status');
  if (el) { el.textContent = ok ? '● AI Prêt' : '○ Non configuré'; el.style.color = ok ? '#4ade80' : '#f87171'; }
  const ms = document.getElementById('model-status');
  if (ms) ms.textContent = modelConfig?.modelName || 'Aucun modèle';
  const cs = document.getElementById('connection-status');
  if (cs) cs.className = `status-indicator ${ok ? 'connected' : 'disconnected'}`;
}

// ─── Parse Agent Response for File Writes & Commands ────────────────────────
async function parseAndExecuteAgentActions(response) {
  const actions = [];

  // Parse WRITE_FILE blocks
  const writeRegex = /```WRITE_FILE:([^\n]+)\n([\s\S]*?)```/g;
  let match;
  while ((match = writeRegex.exec(response)) !== null) {
    const relPath = match[1].trim();
    const content = match[2];
    const fullPath = currentProject
      ? currentProject + '\\' + relPath.replace(/\//g, '\\')
      : relPath;
    actions.push({ type: 'write', path: fullPath, relPath, content });
  }

  // Parse RUN_CMD blocks
  const cmdRegex = /```RUN_CMD\n([\s\S]*?)```/g;
  while ((match = cmdRegex.exec(response)) !== null) {
    const cmd = match[1].trim();
    actions.push({ type: 'cmd', cmd });
  }

  if (actions.length === 0) return;

  // Show action panel
  const summary = actions.map(a => a.type === 'write' ? `📝 ${a.relPath}` : `▶ ${a.cmd}`).join('\n');
  const confirmed = confirm(`L'agent veut effectuer ${actions.length} action(s):\n\n${summary}\n\nAutoriser?`);
  if (!confirmed) return;

  for (const action of actions) {
    if (action.type === 'write') {
      addTerminalLine(`📝 Écriture: ${action.relPath}`, 'info');
      const r = await ipcRenderer.invoke('write-file', action.path, action.content);
      if (r.success) {
        addTerminalLine(`  ✓ Fichier créé/modifié`, 'stdout');
        await autoOpenFile(action.path);
        if (currentProject) { await loadFileTree(currentProject); await refreshFileTreeCache(); }
      } else {
        addTerminalLine(`  ✗ Erreur: ${r.error}`, 'error');
      }
    } else if (action.type === 'cmd') {
      await runTerminalCommand(action.cmd);
    }
  }
}

// ─── Media Attachment Handlers ────────────────────────────────────────────────
function handleMediaFileSelect(e) {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      showError('Seuls les fichiers image sont acceptés pour le moment.');
      continue;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
      const dataUrl = evt.target.result;
      const commaIdx = dataUrl.indexOf(',');
      const base64Data = dataUrl.substring(commaIdx + 1);
      
      activeAttachments.push({
        mimeType: file.type,
        data: base64Data
      });
      renderAttachmentPreviews();
    };
    reader.readAsDataURL(file);
  }
  // Reset input
  e.target.value = '';
}

async function openScreenCaptureModal() {
  const modal = document.getElementById('screen-capture-modal');
  const grid = document.getElementById('screen-grid');
  if (!modal || !grid) return;

  grid.innerHTML = '<div style="color:var(--text3); padding:20px;">Chargement des écrans et fenêtres...</div>';
  modal.classList.add('active');

  const result = await ipcRenderer.invoke('capture-screens');
  if (!result.success) {
    grid.innerHTML = `<div style="color:var(--red); padding:20px;">Erreur de capture: ${result.error}</div>`;
    return;
  }

  grid.innerHTML = '';
  if (result.sources.length === 0) {
    grid.innerHTML = '<div style="color:var(--text3); padding:20px;">Aucun écran ni fenêtre détectée.</div>';
    return;
  }

  result.sources.forEach(src => {
    const card = document.createElement('div');
    card.className = 'screen-source-card';
    card.innerHTML = `
      <img src="${src.thumbnail}" class="screen-source-thumb" alt="${src.name}">
      <div class="screen-source-name" title="${src.name}">${src.name}</div>
    `;
    card.addEventListener('click', () => {
      // Parse data URL to base64
      const dataUrl = src.thumbnail;
      const commaIdx = dataUrl.indexOf(',');
      const base64Data = dataUrl.substring(commaIdx + 1);
      
      activeAttachments.push({
        mimeType: 'image/png', // desktopCapturer gives PNG thumbnails
        data: base64Data
      });
      renderAttachmentPreviews();
      closeScreenCaptureModal();
    });
    grid.appendChild(card);
  });
}

function closeScreenCaptureModal() {
  document.getElementById('screen-capture-modal')?.classList.remove('active');
}

function renderAttachmentPreviews() {
  const container = document.getElementById('attachment-list');
  if (!container) return;
  container.innerHTML = '';

  activeAttachments.forEach((att, idx) => {
    const preview = document.createElement('div');
    preview.className = 'attachment-preview';
    preview.innerHTML = `
      <img src="data:${att.mimeType};base64,${att.data}">
      <span class="remove-btn" title="Supprimer">×</span>
    `;
    preview.querySelector('.remove-btn').addEventListener('click', () => {
      activeAttachments.splice(idx, 1);
      renderAttachmentPreviews();
    });
    container.appendChild(preview);
  });
}

// ─── Parse actions helper ────────────────────────────────────────────────────
function parseAgentActions(response) {
  const actions = [];
  const writeRegex = /```WRITE_FILE:([^\n]+)\n([\s\S]*?)```/g;
  let match;
  while ((match = writeRegex.exec(response)) !== null) {
    const relPath = match[1].trim();
    const content = match[2];
    const fullPath = currentProject
      ? currentProject + '\\' + relPath.replace(/\//g, '\\')
      : relPath;
    actions.push({ type: 'write', path: fullPath, relPath, content });
  }

  const cmdRegex = /```RUN_CMD\n([\s\S]*?)```/g;
  while ((match = cmdRegex.exec(response)) !== null) {
    const cmd = match[1].trim();
    actions.push({ type: 'cmd', cmd });
  }
  return actions;
}

// ─── Autonomous Multi-turn Agent Loop ────────────────────────────────────────
async function runAgentTaskLoop(initialInstruction, attachments = []) {
  agentLoopActive = true;
  currentAgentTurn = 0;
  userIntervention = null;
  
  const agentBtn = document.getElementById('run-agent');
  const sendBtn = document.getElementById('send-message');
  
  // Style agent button to active/stop state
  const originalText = agentBtn.textContent;
  agentBtn.textContent = '🛑 Stop';
  agentBtn.classList.add('agent-active-badge');
  if (sendBtn) sendBtn.disabled = false; // Keep Send button active for interventions
  
  // Clear attachments from UI input
  activeAttachments = [];
  renderAttachmentPreviews();

  let nextPrompt = initialInstruction;
  let turnAttachments = attachments;
  
  while (agentLoopActive && currentAgentTurn < MAX_AGENT_TURNS) {
    currentAgentTurn++;
    const turnLabel = `Tour ${currentAgentTurn}/${MAX_AGENT_TURNS}`;
    addTask(`🤖 Agent - ${turnLabel} : Analyse…`, 'running');
    setLoading(true);

    // Refresh file tree cache
    await refreshFileTreeCache();

    // ─── Process user intervention if any ───
    let promptToSend = nextPrompt;
    let attachmentsToSend = turnAttachments;
    if (userIntervention) {
      appendTerminalLine(`📥 [Agent Tour ${currentAgentTurn}] Prise en compte de vos consignes`, 'info');
      promptToSend = `[INTERVENTION DE L'UTILISATEUR]
${userIntervention.message}

Veuillez réajuster vos actions en fonction de cette consigne pour continuer la tâche en cours.

${nextPrompt}`;
      if (userIntervention.attachments && userIntervention.attachments.length > 0) {
        attachmentsToSend = [...attachmentsToSend, ...userIntervention.attachments];
      }
      addChatMessage('system', '📥 Vos consignes ont été transmises à l\'agent pour ce tour.');
      userIntervention = null; // Clear intervention
    }

    const result = await ipcRenderer.invoke('send-chat-message', {
      message: promptToSend,
      files: openFiles.map(f => ({ name: f.name, content: f.content })),
      activeFile: activeFile ? { name: activeFile.name, content: activeFile.content } : null,
      history: chatHistory,
      fileTree: fileTreeCache,
      attachments: attachmentsToSend
    });

    setLoading(false);
    removeTask(`🤖 Agent - ${turnLabel} : Analyse…`);

    if (!result.success) {
      addChatMessage('system', `❌ Erreur de l'agent au tour ${currentAgentTurn}: ${result.error}`);
      addTask(`Agent échoué (tour ${currentAgentTurn})`, 'failed');
      break;
    }

    addChatMessage('assistant', result.content);
    chatHistory.push(
      { role: 'user', content: promptToSend },
      { role: 'assistant', content: result.content }
    );
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

    const actions = parseAgentActions(result.content);
    if (actions.length === 0) {
      addChatMessage('system', `✓ Tâche complétée ! L'agent a terminé.`);
      addTask(`Agent terminé avec succès ✓`, 'completed');
      break;
    }

    // Execute actions
    const autoMode = document.getElementById('autonomous-mode').checked;
    if (!autoMode) {
      const summary = actions.map(a => a.type === 'write' ? `📝 ${a.relPath}` : `▶ ${a.cmd}`).join('\n');
      const confirmed = confirm(`[Tour ${currentAgentTurn}] L'agent souhaite exécuter ${actions.length} action(s) :\n\n${summary}\n\nAutoriser ?`);
      if (!confirmed) {
        addChatMessage('system', `🛑 Tâche arrêtée par l'utilisateur.`);
        addTask(`Agent arrêté par l'utilisateur`, 'failed');
        break;
      }
    }

    addTask(`🤖 Agent - ${turnLabel} : Exécution des outils…`, 'running');
    const observations = [];

    for (const action of actions) {
      if (!agentLoopActive) break;

      if (action.type === 'write') {
        appendTerminalLine(`📝 [Agent Tour ${currentAgentTurn}] Écriture: ${action.relPath}`, 'info');
        const r = await ipcRenderer.invoke('write-file', action.path, action.content);
        if (r.success) {
          appendTerminalLine(`  ✓ Réussi`, 'stdout');
          await autoOpenFile(action.path);
          observations.push(`File written successfully: ${action.relPath}`);
        } else {
          appendTerminalLine(`  ✗ Erreur: ${r.error}`, 'error');
          observations.push(`Failed to write file ${action.relPath}: ${r.error}`);
        }
      } else if (action.type === 'cmd') {
        appendTerminalLine(`▶ [Agent Tour ${currentAgentTurn}] Commande: ${action.cmd}`, 'prompt');
        const r = await ipcRenderer.invoke('execute-command', action.cmd, currentProject);
        if (r.stdout) appendTerminalLine(r.stdout, 'stdout');
        if (r.stderr) appendTerminalLine(r.stderr, 'stderr');
        appendTerminalLine(`[code: ${r.exitCode}]`, r.exitCode === 0 ? 'info' : 'error');
        observations.push(`Executed command: "${action.cmd}"\nExit Code: ${r.exitCode}\nSTDOUT:\n${r.stdout.slice(0, 3000)}\nSTDERR:\n${r.stderr.slice(0, 2000)}`);
      }
    }

    removeTask(`🤖 Agent - ${turnLabel} : Exécution des outils…`);
    if (currentProject) {
      await loadFileTree(currentProject);
      await refreshFileTreeCache();
    }

    if (!agentLoopActive) {
      addTask(`Agent arrêté`, 'failed');
      break;
    }

    // Build observation prompt
    nextPrompt = `[OBSERVATION DU TOUR ${currentAgentTurn}]
${observations.join('\n\n')}

Continuez la tâche en fonction de ces observations. S'il n'y a plus rien à faire, répondez simplement en expliquant que tout est bon.`;
    turnAttachments = []; // Clear attachments after first turn

    // Minor delay between turns
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  // Restore button state
  agentBtn.textContent = originalText;
  agentBtn.classList.remove('agent-active-badge');
  agentLoopActive = false;
}

// ─── Chat & Agent ─────────────────────────────────────────────────────────────
async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  if (agentLoopActive) {
    // User intervention during agent run!
    const attachmentsToSend = [...activeAttachments];
    activeAttachments = [];
    renderAttachmentPreviews();

    addChatMessage('user', `💬 [Intervention] ${message}`, attachmentsToSend);
    chatInput.value = '';
    
    // Save intervention for the next loop turn
    userIntervention = { message, attachments: attachmentsToSend };
    return;
  }

  if (isLoading) return;
  if (!modelConfig?.apiKey && !['ollama','lmstudio','vllm','local'].includes(modelConfig?.type)) {
    addChatMessage('system', '⚠️ Clé API manquante. Cliquez sur "Configure".'); return;
  }

  // Capture attachments
  const attachmentsToSend = [...activeAttachments];
  activeAttachments = [];
  renderAttachmentPreviews();

  addChatMessage('user', message, attachmentsToSend);
  chatInput.value = '';
  setLoading(true);

  const result = await ipcRenderer.invoke('send-chat-message', {
    message,
    files: openFiles.map(f => ({ name: f.name, content: f.content })),
    activeFile: activeFile ? { name: activeFile.name, content: activeFile.content } : null,
    history: chatHistory,
    fileTree: fileTreeCache,
    attachments: attachmentsToSend
  });
  setLoading(false);

  if (result.success) {
    addChatMessage('assistant', result.content);
    chatHistory.push(
      { role: 'user', content: message },
      { role: 'assistant', content: result.content }
    );
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
    await parseAndExecuteAgentActions(result.content);
  } else {
    addChatMessage('system', '❌ Erreur: ' + result.error);
  }
}

async function runAgentTask() {
  const instruction = chatInput.value.trim() || 'Analyse ce projet et donne un rapport complet';
  if (!modelConfig?.apiKey && !['ollama','lmstudio','vllm','local'].includes(modelConfig?.type)) {
    addChatMessage('system', '⚠️ Clé API manquante.'); return;
  }
  
  // Capture attachments
  const attachmentsToSend = [...activeAttachments];
  addChatMessage('user', `🤖 [Agent] ${instruction}`, attachmentsToSend);
  chatInput.value = '';

  // Run the multi-turn loop!
  runAgentTaskLoop(instruction, attachmentsToSend);
}

function setLoading(loading) {
  isLoading = loading;
  const sendBtn = document.getElementById('send-message');
  const agentBtn = document.getElementById('run-agent');
  if (sendBtn) sendBtn.textContent = loading ? '⏳' : 'Envoyer';
  // Note: we don't disable agentBtn during loading anymore so the user can click Stop!
  if (loading) addThinkingIndicator();
  else removeThinkingIndicator();
}

function addThinkingIndicator() {
  removeThinkingIndicator();
  const div = document.createElement('div');
  div.className = 'message assistant thinking';
  div.id = 'thinking-indicator';
  div.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
function removeThinkingIndicator() { document.getElementById('thinking-indicator')?.remove(); }

function addChatMessage(type, content, attachments = []) {
  const div = document.createElement('div');
  div.className = `message ${type}`;
  div.innerHTML = type === 'assistant' ? renderMarkdown(content) : escapeHtml(content);
  
  if (attachments && attachments.length > 0) {
    attachments.forEach(att => {
      const img = document.createElement('img');
      img.src = `data:${att.mimeType};base64,${att.data}`;
      img.className = 'chat-attachment-img';
      img.addEventListener('click', () => {
        const w = window.open();
        w.document.write(`<body style="margin:0;background:#0f0f1a;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${img.src}" style="max-width:100%;max-height:100%;object-fit:contain;box-shadow:0 12px 36px rgba(0,0,0,0.5);border-radius:6px;"></body>`);
      });
      div.appendChild(img);
    });
  }

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderMarkdown(text) {
  // Remove WRITE_FILE and RUN_CMD blocks from display (shown as action cards instead)
  let clean = text
    .replace(/```WRITE_FILE:([^\n]+)\n([\s\S]*?)```/g, (_, file, content) =>
      `<div class="action-card write"><span class="action-badge">📝 FICHIER</span> <code>${file.trim()}</code><pre><code>${escapeHtml(content.trim())}</code></pre></div>`)
    .replace(/```RUN_CMD\n([\s\S]*?)```/g, (_, cmd) =>
      `<div class="action-card cmd"><span class="action-badge">▶ COMMANDE</span><pre><code>${escapeHtml(cmd.trim())}</code></pre></div>`);

  return clean
    .replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) => {
      let hl = escapeHtml(code.trim());
      if (typeof hljs !== 'undefined' && lang) {
        try { hl = hljs.highlight(code.trim(), { language: lang, ignoreIllegals: true }).value; } catch(e) {}
      }
      return `<pre><code class="hljs language-${lang||''}">${hl}</code></pre>`;
    })
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/^[\*\-] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

// ─── Tasks ────────────────────────────────────────────────────────────────────
function addTask(desc, status) {
  const div = document.createElement('div');
  div.className = 'task-item'; div.dataset.description = desc;
  div.innerHTML = `<span class="task-status ${status}"></span><span>${desc}</span>`;
  taskList.appendChild(div);
}
function removeTask(desc) { taskList.querySelector(`[data-description="${desc}"]`)?.remove(); }

// ─── Terminal ─────────────────────────────────────────────────────────────────
function toggleTerminal() {
  const panel = document.getElementById('terminal-panel');
  if (panel) panel.classList.toggle('open');
}

function clearTerminal() {
  if (terminalOutput) terminalOutput.innerHTML = '';
}

async function runTerminalCommand(cmd) {
  if (!cmd.trim()) return;
  appendTerminalLine(`$ ${cmd}`, 'prompt');
  const result = await ipcRenderer.invoke('execute-command', cmd, currentProject);
  if (result.stdout) appendTerminalLine(result.stdout, 'stdout');
  if (result.stderr) appendTerminalLine(result.stderr, 'stderr');
  appendTerminalLine(`[code: ${result.exitCode}]`, result.exitCode === 0 ? 'info' : 'error');
}

function appendTerminalLine(text, type = 'stdout') {
  if (!terminalOutput) return;
  const line = document.createElement('div');
  line.className = `term-line ${type}`;
  line.textContent = text;
  terminalOutput.appendChild(line);
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
  // Open terminal if hidden
  document.getElementById('terminal-panel')?.classList.add('open');
}

// Alias for inline use
function addTerminalLine(text, type) { appendTerminalLine(text, type); }

// ─── UI helpers ───────────────────────────────────────────────────────────────
function toggleAgentPanel() {
  const panel = document.getElementById('agent-panel');
  const btn   = document.getElementById('toggle-agent-panel');
  const col   = panel.style.width === '0px';
  panel.style.width    = col ? '' : '0px';
  panel.style.overflow = col ? '' : 'hidden';
  btn.textContent = col ? '◀' : '▶';
}

function showError(msg) { addChatMessage('system', '❌ ' + msg); console.error(msg); }

// ─── Start ────────────────────────────────────────────────────────────────────
init();
