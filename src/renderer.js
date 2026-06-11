const { ipcRenderer } = require('electron');
const path = require('path');

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
let confirmResolve = null; // Promise resolver for custom confirm modal
let isEditorTextColorCustomized = false;

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

// ─── Translations Dictionary ─────────────────────────────────────────────────
const TRANSLATIONS = {
  fr: {
    settings: "Paramètres",
    open_folder: "Ouvrir Dossier",
    open_file: "Ouvrir Fichier",
    save: "Sauvegarder",
    new_file: "Nouveau",
    new_folder: "Dossier",
    terminal: "Terminal",
    git_pull: "Git Pull",
    git_push: "Git Push",
    no_project: "Aucun projet",
    open_folder_hint: "Ouvrez un dossier pour commencer",
    status_hint: "Ctrl+S • Sauvegarder &nbsp;|&nbsp; Ctrl+` • Terminal",
    terminal_title: "Terminal",
    ai_agent: "Agent CobraBub",
    config: "Config",
    cap_tree: "Arborescence",
    cap_write: "Écrire",
    cap_cmd: "Commandes",
    welcome_msg: "👋 <strong>CobraBub IDE</strong> — Ouvrez un dossier, configurez votre clé API, puis demandez à l'agent d'analyser votre projet ou d'écrire du code.",
    attach_image: "Joindre une image",
    capture_screen: "Capturer l'écran",
    autonomous: "Autonome",
    agent: "Agent",
    active_tasks: "Tâches actives",
    config_title: "Configuration",
    tab_ai: "Modèles AI",
    tab_appearance: "Apparence & Langues",
    tab_github: "GitHub",
    provider: "🔌 Fournisseur :",
    api_url: "🌐 URL API :",
    model: "🧠 Modèle :",
    model_hint: "Choisissez dans la liste ↑ ou tapez un nom de modèle",
    api_key: "🔑 Clé API :",
    theme: "🎨 Thème Visuel :",
    lang: "🌐 Langue :",
    github_token: "🔑 Token d'Accès Personnel (PAT) :",
    github_token_hint: "Token requis pour le push/pull automatique sans invite de commande.",
    github_user: "👤 Nom d'utilisateur GitHub :",
    github_email: "📧 Adresse e-mail GitHub :",
    github_config_hint: "Sert à configurer localement Git pour vos commits.",
    confirm_title: "Confirmation d'Action",
    confirm_btn: "Confirmer",
    cancel_btn: "Annuler",
    error_open: "Impossible d'ouvrir: ",
    error_no_project: "Ouvrez un dossier d'abord",
    prompt_file_name: "Nom du fichier :",
    prompt_folder_name: "Nom du dossier :",
    confirm_unsaved: "Modifications non sauvegardées. Fermer quand même ?",
    save_success: "Sauvegardé",
    save_failed: "Sauvegarde échouée : ",
    saving: "Sauvegarde…",
    modified: "Non sauvegardé",
    api_key_missing: "⚠️ Clé API manquante. Cliquez sur \"Configure\".",
    git_success: "Succès",
    git_failed: "Échec Git",
    agent_stopped: "🛑 Tâche arrêtée par l'utilisateur.",
    agent_success: "Agent terminé avec succès ✓",
    agent_failed: "Agent arrêté",
    agent_run_msg: "L'agent souhaite exécuter des actions :",
    project_opened: "Projet ouvert",
    config_saved: "Configuration enregistrée",
    chat_input_placeholder: "Posez une question… (Entrée pour envoyer, Maj+Entrée pour nouvelle ligne)",
    search_placeholder: "Rechercher (Ctrl+P)…",
    term_input_placeholder: "Entrez une commande…",
    prompt_commit_msg: "Message de commit :",
    delete_confirm_msg: "Supprimer",
    loading: "⏳ Chargement...",
    empty_folder: "Dossier vide",
    tour: "Tour",
    android_detect: "Détecter/Rafraîchir",
    android_no_avd: "Aucun détecté",
    android_starting: "Démarrage de l'émulateur...",
    android_success: "Émulateur lancé avec succès.",
    tab_android: "Android",
    android_autodetect: "Détecter automatiquement les projets Android",
    android_always_show: "Toujours afficher le menu Android",
    android_help: "Cette option permet d'analyser le dossier ouvert pour détecter des fichiers spécifiques (comme build.gradle ou AndroidManifest.xml). Si détecté, le menu Android s'active pour vous permettre de lancer un émulateur en un clic.",
    editor_text_color: "✍️ Couleur du texte de l'éditeur :",
    reset: "Réinitialiser"
  },
  en: {
    settings: "Settings",
    open_folder: "Open Folder",
    open_file: "Open File",
    save: "Save",
    new_file: "New File",
    new_folder: "New Folder",
    terminal: "Terminal",
    git_pull: "Git Pull",
    git_push: "Git Push",
    no_project: "No project",
    open_folder_hint: "Open a folder to get started",
    status_hint: "Ctrl+S • Save &nbsp;|&nbsp; Ctrl+` • Terminal",
    terminal_title: "Terminal",
    ai_agent: "CobraBub Agent",
    config: "Config",
    cap_tree: "File Tree",
    cap_write: "Write Files",
    cap_cmd: "Commands",
    welcome_msg: "👋 <strong>CobraBub IDE</strong> — Open a folder, configure your API key, then ask the agent to analyze your project or write code.",
    attach_image: "Attach an image",
    capture_screen: "Capture screen",
    autonomous: "Autonomous",
    agent: "Agent",
    active_tasks: "Active tasks",
    config_title: "Configuration",
    tab_ai: "AI Models",
    tab_appearance: "Appearance & Lang",
    tab_github: "GitHub",
    provider: "🔌 Provider:",
    api_url: "🌐 API URL:",
    model: "🧠 Model:",
    model_hint: "Choose from list ↑ or type a model name",
    api_key: "🔑 API Key:",
    theme: "🎨 Visual Theme:",
    lang: "🌐 Language:",
    github_token: "🔑 Personal Access Token (PAT):",
    github_token_hint: "Token required for automatic pushes/pulls without password prompts.",
    github_user: "👤 GitHub Username:",
    github_email: "📧 GitHub E-mail:",
    github_config_hint: "Used to locally configure Git for your commits.",
    confirm_title: "Action Confirmation",
    confirm_btn: "Confirm",
    cancel_btn: "Cancel",
    error_open: "Unable to open: ",
    error_no_project: "Open a folder first",
    prompt_file_name: "File name:",
    prompt_folder_name: "Folder name:",
    confirm_unsaved: "Unsaved changes. Close anyway?",
    save_success: "Saved",
    save_failed: "Save failed: ",
    saving: "Saving…",
    modified: "Unsaved",
    api_key_missing: "⚠️ Missing API Key. Click \"Configure\".",
    git_success: "Success",
    git_failed: "Git Failed",
    agent_stopped: "🛑 Task stopped by user.",
    agent_success: "Agent completed successfully ✓",
    agent_failed: "Agent stopped",
    agent_run_msg: "The agent wants to execute actions:",
    project_opened: "Project opened",
    config_saved: "Configuration saved",
    chat_input_placeholder: "Ask a question… (Enter to send, Shift+Enter for new line)",
    search_placeholder: "Search files (Ctrl+P)…",
    term_input_placeholder: "Type a command…",
    prompt_commit_msg: "Commit message:",
    delete_confirm_msg: "Delete",
    loading: "⏳ Loading...",
    empty_folder: "Folder is empty",
    tour: "Turn",
    android_detect: "Detect/Refresh",
    android_no_avd: "None detected",
    android_starting: "Starting emulator...",
    android_success: "Emulator launched successfully.",
    tab_android: "Android",
    android_autodetect: "Automatically detect Android projects",
    android_always_show: "Always show Android menu",
    android_help: "This option analyzes the opened directory to detect specific files (like build.gradle or AndroidManifest.xml). If detected, the Android menu activates to let you launch an emulator in one click.",
    editor_text_color: "✍️ Editor Text Color:",
    reset: "Reset"
  },
  es: {
    settings: "Configuración",
    open_folder: "Abrir Carpeta",
    open_file: "Abrir Archivo",
    save: "Guardar",
    new_file: "Nuevo Archivo",
    new_folder: "Nueva Carpeta",
    terminal: "Terminal",
    git_pull: "Git Pull",
    git_push: "Git Push",
    no_project: "Ningún proyecto",
    open_folder_hint: "Abra una carpeta para comenzar",
    status_hint: "Ctrl+S • Guardar &nbsp;|&nbsp; Ctrl+` • Terminal",
    terminal_title: "Terminal",
    ai_agent: "Agente CobraBub",
    config: "Config",
    cap_tree: "Árbol de archivos",
    cap_write: "Escribir",
    cap_cmd: "Comandos",
    welcome_msg: "👋 <strong>CobraBub IDE</strong> — Abra una carpeta, configure su clave API, luego pídale al agente que analice su proyecto o escriba código.",
    attach_image: "Adjuntar imagen",
    capture_screen: "Capturar pantalla",
    autonomous: "Autónomo",
    agent: "Agente",
    active_tasks: "Tareas activas",
    config_title: "Configuración",
    tab_ai: "Modelos AI",
    tab_appearance: "Apariencia e Idioma",
    tab_github: "GitHub",
    provider: "🔌 Proveedor:",
    api_url: "🌐 URL de la API:",
    model: "🧠 Modelo:",
    model_hint: "Seleccione de la lista ↑ o escriba un modelo",
    api_key: "🔑 Clave API:",
    theme: "🎨 Tema Visual:",
    lang: "🌐 Idioma:",
    github_token: "🔑 Token de Acceso Personal (PAT):",
    github_token_hint: "Token requerido para pushes/pulls automáticos sin solicitud de contraseña.",
    github_user: "👤 Usuario de GitHub:",
    github_email: "📧 Correo de GitHub:",
    github_config_hint: "Sirve para configurar Git localmente para sus commits.",
    confirm_title: "Confirmación de Acción",
    confirm_btn: "Confirmar",
    cancel_btn: "Cancelar",
    error_open: "No se pudo abrir: ",
    error_no_project: "Abra una carpeta primero",
    prompt_file_name: "Nombre del archivo:",
    prompt_folder_name: "Nombre de la carpeta:",
    confirm_unsaved: "Cambios no guardados. ¿Cerrar de todos modos?",
    save_success: "Guardado",
    save_failed: "Fallo al guardar: ",
    saving: "Guardando…",
    modified: "No guardado",
    api_key_missing: "⚠️ Falta clave API. Haga clic en \"Configure\".",
    git_success: "Éxito",
    git_failed: "Fallo Git",
    agent_stopped: "🛑 Tarea detenida por el usuario.",
    agent_success: "Agente terminado con éxito ✓",
    agent_failed: "Agente detenido",
    agent_run_msg: "El agente desea ejecutar acciones:",
    project_opened: "Proyecto abierto",
    config_saved: "Configuración guardada",
    chat_input_placeholder: "Hacer una pregunta… (Enter para enviar, Shift+Enter para nueva línea)",
    search_placeholder: "Buscar archivos (Ctrl+P)…",
    term_input_placeholder: "Escriba un comando…",
    prompt_commit_msg: "Mensaje de commit:",
    delete_confirm_msg: "Eliminar",
    loading: "⏳ Cargando...",
    empty_folder: "Carpeta vacía",
    tour: "Turno",
    android_detect: "Detectar/Actualizar",
    android_no_avd: "Ninguno detectado",
    android_starting: "Iniciando emulador...",
    android_success: "Emulador iniciado con éxito.",
    tab_android: "Android",
    android_autodetect: "Detectar automáticamente proyectos Android",
    android_always_show: "Mostrar siempre el menú Android",
    android_help: "Esta opción analiza la carpeta abierta para detectar archivos específicos (como build.gradle o AndroidManifest.xml). Si se detecta, el menú de Android se activa para permitirle iniciar un emulador con un solo clic.",
    editor_text_color: "✍️ Color de texto del editor:",
    reset: "Restablecer"
  }
};

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  await loadModelConfig();
  
  if (modelConfig) {
    applyTheme(modelConfig.theme || 'cyber-purple');
    applyLanguage(modelConfig.language || 'fr');
  }

  setupEventListeners();
  setupKeyboardShortcuts();
  updateStatusBar();
  updateLineNumbers();
  await updateAndroidDropdownVisibility();

  if (window.lucide) {
    window.lucide.createIcons();
  }
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
      const dict = TRANSLATIONS[modelConfig?.language || 'fr'] || TRANSLATIONS.fr;
      addChatMessage('system', `🛑 ${dict.agent_stopped}`);
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

  const colorInput = document.getElementById('editor-text-color-input');
  if (colorInput) {
    colorInput.addEventListener('input', () => {
      isEditorTextColorCustomized = true;
      document.documentElement.style.setProperty('--editor-text-custom', colorInput.value);
    });
  }

  const resetColorBtn = document.getElementById('btn-reset-editor-text-color');
  if (resetColorBtn) {
    resetColorBtn.addEventListener('click', async () => {
      isEditorTextColorCustomized = false;
      if (modelConfig) {
        modelConfig.editorTextColor = '';
        await ipcRenderer.invoke('save-model-config', modelConfig);
      }
      updateEditorTextColorUI();
    });
  }

  // Config modal segmented tab switching
  document.querySelectorAll('.modal-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.modal-tab-content').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
      });
      btn.classList.add('active');
      const targetId = btn.dataset.tab;
      const content = document.getElementById(targetId);
      if (content) {
        content.classList.add('active');
        content.style.display = 'flex';
      }
    });
  });

  // Git Toolbar dropdown toggling
  const gitBtn = document.getElementById('git-btn');
  const gitDropdownMenu = document.getElementById('git-dropdown-menu');
  gitBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    gitDropdownMenu?.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (gitDropdownMenu && !gitDropdownMenu.contains(e.target) && e.target !== gitBtn) {
      gitDropdownMenu.classList.remove('active');
    }
  });

  document.getElementById('git-pull-btn')?.addEventListener('click', async () => {
    gitDropdownMenu?.classList.remove('active');
    await executeGitPull();
  });

  document.getElementById('git-push-btn')?.addEventListener('click', async () => {
    gitDropdownMenu?.classList.remove('active');
    await executeGitPush();
  });

  document.getElementById('settings-btn')?.addEventListener('click', () => {
    showConfigModal();
    const appearanceTabBtn = document.querySelector('.modal-tab-btn[data-tab="tab-appearance"]');
    if (appearanceTabBtn) {
      appearanceTabBtn.click();
    }
  });

  // Custom confirmation modal bindings
  document.getElementById('confirm-ok-btn')?.addEventListener('click', () => handleConfirmResult(true));
  document.getElementById('confirm-cancel-btn')?.addEventListener('click', () => handleConfirmResult(false));
  document.getElementById('confirm-close-btn')?.addEventListener('click', () => handleConfirmResult(false));

  // Custom prompt modal bindings
  document.getElementById('prompt-ok-btn')?.addEventListener('click', () => {
    const val = document.getElementById('prompt-input')?.value || '';
    handlePromptResult(val);
  });
  document.getElementById('prompt-cancel-btn')?.addEventListener('click', () => handlePromptResult(null));
  document.getElementById('prompt-close-btn')?.addEventListener('click', () => handlePromptResult(null));
  document.getElementById('prompt-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      handlePromptResult(e.target.value);
    } else if (e.key === 'Escape') {
      handlePromptResult(null);
    }
  });

  // Chat keyboard
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

  // Terminal
  document.getElementById('toggle-terminal')?.addEventListener('click', toggleTerminal);
  document.getElementById('clear-terminal')?.addEventListener('click', clearTerminal);
  document.getElementById('close-terminal-panel')?.addEventListener('click', toggleTerminal);

  // Android Emulator Dropdown toggling
  const androidBtn = document.getElementById('android-btn');
  const androidDropdownMenu = document.getElementById('android-dropdown-menu');
  androidBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    androidDropdownMenu?.classList.toggle('active');
    if (androidDropdownMenu?.classList.contains('active')) {
      detectAndroidEmulators();
    }
  });

  document.addEventListener('click', (e) => {
    if (androidDropdownMenu && !androidDropdownMenu.contains(e.target) && e.target !== androidBtn) {
      androidDropdownMenu.classList.remove('active');
    }
  });

  document.getElementById('android-detect-btn')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    await detectAndroidEmulators();
  });
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
    const dict = TRANSLATIONS[modelConfig?.language || 'fr'] || TRANSLATIONS.fr;
    appendTerminalLine(`📁 ${dict.file_written || 'Fichier écrit'}: ${filePath}`, 'info');
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

// ─── Theme & Language ────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.body.className = '';
  document.body.classList.add(`theme-${theme}`);
  updateEditorTextColorUI();
}

function rgbToHex(rgbStr) {
  const match = rgbStr.match(/\d+/g);
  if (!match) return '#ffffff';
  const r = parseInt(match[0]);
  const g = parseInt(match[1]);
  const b = parseInt(match[2]);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function updateEditorTextColorUI() {
  const input = document.getElementById('editor-text-color-input');
  if (!input) return;

  if (modelConfig && modelConfig.editorTextColor) {
    document.documentElement.style.setProperty('--editor-text-custom', modelConfig.editorTextColor);
    input.value = modelConfig.editorTextColor;
  } else {
    document.documentElement.style.removeProperty('--editor-text-custom');
    setTimeout(() => {
      const defaultColor = window.getComputedStyle(document.body).color;
      input.value = rgbToHex(defaultColor);
    }, 50);
  }
}

function applyLanguage(lang) {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.fr;
  
  const setHtml = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  const setPlaceholder = (id, txt) => { const el = document.getElementById(id); if (el) el.placeholder = txt; };

  setText('btn-text-settings', dict.settings);
  setText('btn-text-open-folder', dict.open_folder);
  setText('btn-text-open-file', dict.open_file);
  setText('btn-text-save', dict.save);
  setText('btn-text-new-file', dict.new_file);
  setText('btn-text-new-folder', dict.new_folder);
  setText('btn-text-terminal', dict.terminal);
  setText('lbl-git-pull', dict.git_pull);
  setText('lbl-git-push', dict.git_push);
  if (!currentProject) {
    setText('project-name', dict.no_project);
  }
  setText('lbl-empty-state', dict.open_folder_hint);
  setHtml('lbl-status-hint', dict.status_hint);
  setText('lbl-terminal-title', dict.terminal_title);
  setHtml('lbl-ai-agent', `<i data-lucide="bot" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;"></i> ` + dict.ai_agent);
  setText('lbl-btn-config', dict.config);
  setHtml('cap-tree', `<i data-lucide="folder-tree" style="width:10px; height:10px; vertical-align: middle; margin-right: 2px;"></i> ` + dict.cap_tree);
  setHtml('cap-write', `<i data-lucide="file-edit" style="width:10px; height:10px; vertical-align: middle; margin-right: 2px;"></i> ` + dict.cap_write);
  setHtml('cap-cmd', `<i data-lucide="terminal" style="width:10px; height:10px; vertical-align: middle; margin-right: 2px;"></i> ` + dict.cap_cmd);
  
  // Welcome message
  const welcomeMsgEl = document.getElementById('lbl-welcome-msg');
  if (welcomeMsgEl && welcomeMsgEl.classList.contains('system')) {
    welcomeMsgEl.innerHTML = dict.welcome_msg;
  }
  
  setText('lbl-attach-image', dict.attach_image);
  setText('lbl-capture-screen', dict.capture_screen);
  setText('lbl-autonomous', dict.autonomous);
  setText('lbl-btn-agent', dict.agent);
  setText('lbl-active-tasks', dict.active_tasks);
  setText('lbl-config-title', dict.config_title);
  
  setText('tab-title-ai', dict.tab_ai);
  setText('tab-title-appearance', dict.tab_appearance);
  setText('tab-title-github', dict.tab_github);
  
  setText('lbl-provider', dict.provider);
  setText('lbl-api-url', dict.api_url);
  setText('lbl-model', dict.model);
  setText('hint-model-choice', dict.model_hint);
  setText('lbl-api-key', dict.api_key);
  setText('lbl-theme', dict.theme);
  setText('lbl-lang', dict.lang);
  setText('lbl-editor-text-color', dict.editor_text_color);
  setText('btn-reset-editor-text-color', dict.reset);
  
  setText('lbl-github-token', dict.github_token);
  setText('hint-github-token', dict.github_token_hint);
  setText('lbl-github-user', dict.github_user);
  setText('lbl-github-email', dict.github_email);
  setText('hint-github-config', dict.github_config_hint);
  
  setPlaceholder('chat-input', dict.chat_input_placeholder);
  setPlaceholder('file-search', dict.search_placeholder);
  setPlaceholder('terminal-input', dict.term_input_placeholder);
  
  // Update confirm modal text
  setText('confirm-title', dict.confirm_title);
  setText('confirm-cancel-btn', dict.cancel_btn);
  setText('confirm-ok-btn', dict.confirm_btn);
  
  // Update prompt modal text
  setText('prompt-title', dict.confirm_title);
  setText('prompt-cancel-btn', dict.cancel_btn);
  setText('prompt-ok-btn', dict.confirm_btn);
  
  // Update Android dropdown text
  setText('lbl-android-detect', dict.android_detect);
  const noAvdEl = document.getElementById('lbl-android-no-avd');
  if (noAvdEl) noAvdEl.textContent = dict.android_no_avd;

  setText('tab-title-android', dict.tab_android);
  setText('lbl-android-autodetect', dict.android_autodetect);
  setText('lbl-android-always-show', dict.android_always_show);
  setText('lbl-android-help', dict.android_help);

  if (window.lucide) {
    try { window.lucide.createIcons(); } catch (e) {}
  }
}

// ─── Custom Confirmation Modal Logic ──────────────────────────────────────────
function showConfirm(title, message, details = '') {
  return new Promise((resolve) => {
    confirmResolve = resolve;
    
    const modal = document.getElementById('confirm-modal');
    const titleEl = document.getElementById('confirm-title');
    const msgEl = document.getElementById('confirm-message');
    const detailsEl = document.getElementById('confirm-details');
    
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.innerHTML = message.replace(/\n/g, '<br>');
    
    if (detailsEl) {
      if (details) {
        detailsEl.textContent = details;
        detailsEl.style.display = 'block';
      } else {
        detailsEl.style.display = 'none';
      }
    }
    
    modal.classList.add('active');
  });
}

function handleConfirmResult(value) {
  const modal = document.getElementById('confirm-modal');
  modal.classList.remove('active');
  if (confirmResolve) {
    confirmResolve(value);
    confirmResolve = null;
  }
}

// ─── Custom Prompt Modal Logic ────────────────────────────────────────────────
let promptResolve = null;

function showPrompt(title, message, defaultValue = '') {
  return new Promise((resolve) => {
    promptResolve = resolve;
    
    const modal = document.getElementById('prompt-modal');
    const titleEl = document.getElementById('prompt-title');
    const msgEl = document.getElementById('prompt-message');
    const inputEl = document.getElementById('prompt-input');
    
    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (inputEl) {
      inputEl.value = defaultValue;
      modal.classList.add('active');
      setTimeout(() => inputEl.focus(), 150);
    }
  });
}

function handlePromptResult(value) {
  const modal = document.getElementById('prompt-modal');
  modal.classList.remove('active');
  if (promptResolve) {
    promptResolve(value);
    promptResolve = null;
  }
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
  
  // Set up Git credentials automatically on open
  if (modelConfig && (modelConfig.githubToken || modelConfig.githubUser || modelConfig.githubEmail)) {
    await ipcRenderer.invoke('setup-git-credentials', {
      cwd: currentProject,
      githubToken: modelConfig.githubToken,
      githubUser: modelConfig.githubUser,
      githubEmail: modelConfig.githubEmail
    });
  }

  await updateAndroidDropdownVisibility();

  const dict = TRANSLATIONS[modelConfig?.language || 'fr'] || TRANSLATIONS.fr;
  addChatMessage('system', `📂 ${dict.project_opened || 'Projet ouvert'}: ${folderPath}`);
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
  const dict = TRANSLATIONS[modelConfig?.language || 'fr'] || TRANSLATIONS.fr;
  container.innerHTML = `<div class="loading-state">${dict.loading}</div>`;
  const result = await ipcRenderer.invoke('list-directory', dirPath);
  if (result.success) renderFileTree(result.items, container, dirPath);
  else container.innerHTML = `<div class="empty-state">Erreur: ${result.error}</div>`;
}

function renderFileTree(items, container = fileTreeEl, parentPath = '') {
  container.innerHTML = '';
  const dict = TRANSLATIONS[modelConfig?.language || 'fr'] || TRANSLATIONS.fr;
  if (!items.length) { container.innerHTML = `<div class="empty-state">${dict.empty_folder}</div>`; return; }

  items.forEach(item => {
    if (!item.isDirectory) allFiles.push({ name: item.name, path: item.path });

    const el = document.createElement('div');
    el.className = `file-item ${item.isDirectory ? 'folder-item' : ''}`;
    el.dataset.path = item.path;
    el.dataset.name = item.name.toLowerCase();
    
    const iconHtml = item.isDirectory ? getFolderIconHtml(false) : getFileIconHtml(item.name);
    el.innerHTML = `<span class="file-icon">${iconHtml}</span><span class="file-name" style="margin-left: 6px;">${item.name}</span>`;

    // Context menu on right-click
    el.addEventListener('contextmenu', e => { e.preventDefault(); showContextMenu(e, item); });

    el.addEventListener('click', async e => {
      e.stopPropagation();
      document.querySelectorAll('.file-item.active').forEach(x => x.classList.remove('active'));
      el.classList.add('active');

      if (item.isDirectory) {
        const expanded = el.classList.toggle('expanded');
        el.querySelector('.file-icon').innerHTML = getFolderIconHtml(expanded);
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
  
  if (window.lucide) {
    try { window.lucide.createIcons(); } catch (e) {}
  }
}

// ─── File Search ──────────────────────────────────────────────────────────────
function filterFileTree(query) {
  const q = query.toLowerCase().trim();

  if (!q) {
    document.querySelectorAll('.file-item').forEach(el => el.style.display = '');
    document.querySelectorAll('.sub-tree').forEach(el => el.style.display = '');
    return;
  }

  const matches = allFiles.filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));

  document.querySelectorAll('.file-item').forEach(el => {
    const name = el.dataset.name || '';
    const isMatch = name.includes(q);
    el.style.display = isMatch ? '' : 'none';
  });

  document.querySelectorAll('.sub-tree').forEach(el => el.style.display = '');
}

// ─── Vector Icons Mapper (Lucide) ─────────────────────────────────────────────
function getFileIconName(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  const m = {
    js: 'file-json',
    jsx: 'code-2',
    ts: 'file-type-2',
    tsx: 'code-2',
    py: 'terminal',
    html: 'file-code',
    css: 'palette',
    scss: 'palette',
    json: 'braces',
    md: 'file-text',
    txt: 'file-text',
    java: 'coffee',
    cpp: 'settings',
    c: 'settings',
    rs: 'wrench',
    go: 'play',
    rb: 'gem',
    php: 'code',
    sh: 'terminal',
    yml: 'settings-2',
    yaml: 'settings-2',
    xml: 'file-code',
    sql: 'database',
    env: 'key-round',
    dockerfile: 'container',
    png: 'image',
    jpg: 'image',
    svg: 'image',
    pdf: 'file-down',
    zip: 'archive'
  };
  return m[ext] || 'file';
}

function getFileIconHtml(name) {
  const icon = getFileIconName(name);
  return `<i data-lucide="${icon}" style="width: 14px; height: 14px; vertical-align: middle;"></i>`;
}

function getFolderIconHtml(expanded = false) {
  const icon = expanded ? 'folder-open' : 'folder';
  return `<i data-lucide="${icon}" style="width: 14px; height: 14px; vertical-align: middle;"></i>`;
}

// ─── Context Menu ─────────────────────────────────────────────────────────────
function showContextMenu(e, item) {
  document.getElementById('context-menu')?.remove();
  const menu = document.createElement('div');
  menu.id = 'context-menu';
  menu.className = 'context-menu';
  menu.style.cssText = `position:fixed;top:${e.clientY}px;left:${e.clientX}px;z-index:9999;`;

  const dict = TRANSLATIONS[modelConfig?.language || 'fr'] || TRANSLATIONS.fr;

  const actions = item.isDirectory
    ? [[`📄 ${dict.new_file}`, () => createNewFileIn(item.path)], [`📂 ${dict.new_folder}`, () => createNewFolderIn(item.path)], [`🗑️ ${dict.delete_confirm_msg}`, () => deleteItem(item)]]
    : [[`✏️ Ouvrir`, () => openFile(item.path)], [`💬 Demander à l'AI`, () => askAIAboutFile(item)], [`🗑️ ${dict.delete_confirm_msg}`, () => deleteItem(item)]];

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
  const dict = TRANSLATIONS[modelConfig?.language || 'fr'] || TRANSLATIONS.fr;
  const confirmed = await showConfirm(dict.confirm_title, `${dict.delete_confirm_msg} "${item.name}"?`);
  if (!confirmed) return;
  await ipcRenderer.invoke('delete-file', item.path);
  if (currentProject) loadFileTree(currentProject);
}

// ─── File Open / Edit ─────────────────────────────────────────────────────────
async function openFile(filePath) {
  const result = await ipcRenderer.invoke('read-file', filePath);
  if (!result.success) { showError(TRANSLATIONS[modelConfig?.language || 'fr'].error_open + result.error); return; }

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

  document.querySelectorAll('.file-item').forEach(el => {
    el.classList.toggle('active', el.dataset.path === file.path);
  });
}

async function createNewFile() {
  const dict = TRANSLATIONS[modelConfig?.language || 'fr'] || TRANSLATIONS.fr;
  if (!currentProject) { showError(dict.error_no_project); return; }
  const name = await showPrompt(dict.confirm_title, dict.prompt_file_name);
  if (!name) return;
  const filePath = path.join(currentProject, name);
  await ipcRenderer.invoke('write-file', filePath, '');
  await loadFileTree(currentProject);
  openFile(filePath);
}

async function createNewFileIn(dirPath) {
  const dict = TRANSLATIONS[modelConfig?.language || 'fr'] || TRANSLATIONS.fr;
  const name = await showPrompt(dict.confirm_title, dict.prompt_file_name);
  if (!name) return;
  const filePath = path.join(dirPath, name);
  await ipcRenderer.invoke('write-file', filePath, '');
  await loadFileTree(currentProject);
  openFile(filePath);
}

async function createNewFolder() {
  const dict = TRANSLATIONS[modelConfig?.language || 'fr'] || TRANSLATIONS.fr;
  if (!currentProject) { showError(dict.error_no_project); return; }
  const name = await showPrompt(dict.confirm_title, dict.prompt_folder_name);
  if (!name) return;
  const folderPath = path.join(currentProject, name);
  await ipcRenderer.invoke('create-folder', folderPath);
  loadFileTree(currentProject);
}

async function createNewFolderIn(dirPath) {
  const dict = TRANSLATIONS[modelConfig?.language || 'fr'] || TRANSLATIONS.fr;
  const name = await showPrompt(dict.confirm_title, dict.prompt_folder_name);
  if (!name) return;
  const folderPath = path.join(dirPath, name);
  await ipcRenderer.invoke('create-folder', folderPath);
  loadFileTree(currentProject);
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────
function renderTabs() {
  tabsContainer.innerHTML = '';
  openFiles.forEach(file => {
    const tab = document.createElement('div');
    tab.className = `tab ${file === activeFile ? 'active' : ''} ${file.isModified ? 'modified' : ''}`;
    
    const iconHtml = getFileIconHtml(file.name);
    tab.innerHTML = `
      <span class="tab-status-dot ${file.isModified ? 'modified' : 'saved'}"></span>
      <span class="tab-name" style="display:flex; align-items:center; gap:6px;">${iconHtml} ${file.name}</span>
      <span class="tab-close">×</span>
    `;
    tab.addEventListener('click', e => { if (!e.target.classList.contains('tab-close')) setActiveFile(file); });
    tab.querySelector('.tab-close').addEventListener('click', e => { e.stopPropagation(); closeFile(file.path); });
    tabsContainer.appendChild(tab);
  });
  
  if (window.lucide) {
    try { window.lucide.createIcons(); } catch (e) {}
  }
}

async function closeFile(filePath) {
  const idx = openFiles.findIndex(f => f.path === filePath);
  if (idx === -1) return;
  if (openFiles[idx].isModified) {
    const dict = TRANSLATIONS[modelConfig?.language || 'fr'] || TRANSLATIONS.fr;
    const confirmed = await showConfirm(dict.confirm_title, dict.confirm_unsaved);
    if (!confirmed) return;
  }
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
    showError(TRANSLATIONS[modelConfig?.language || 'fr'].save_failed + result.error);
    updateSaveIndicator('');
  }
}

function updateSaveIndicator(state) {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  const dict = TRANSLATIONS[modelConfig?.language || 'fr'] || TRANSLATIONS.fr;
  const states = { saving: dict.saving, saved: `✓ ${dict.save_success}`, modified: `● ${dict.modified}`, '': '' };
  const classes = { saving: 'saving', saved: 'saved', modified: 'modified', '': '' };
  el.textContent = states[state] || '';
  el.className = 'save-badge ' + (classes[state] || '');
}

// ─── Syntax Highlighting ──────────────────────────────────────────────────────
function highlightCode() {
  if (!highlightLayer) return;
  if (typeof hljs === 'undefined') {
    highlightLayer.textContent = codeEditor.value + '\n';
    return;
  }
  const lang = detectLang(activeFile?.path || '');
  try {
    const r = lang
      ? hljs.highlight(codeEditor.value, { language: lang, ignoreIllegals: true })
      : hljs.highlightAuto(codeEditor.value);
    highlightLayer.innerHTML = r.value + '\n';
  } catch (e) { highlightLayer.textContent = codeEditor.value + '\n'; }
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
  s('theme-selector', modelConfig.theme || 'cyber-purple');
  s('language-selector', modelConfig.language || 'fr');
  s('github-token', modelConfig.githubToken || '');
  s('github-user', modelConfig.githubUser || '');
  s('github-email', modelConfig.githubEmail || '');

  const autoDetectCheckbox = document.getElementById('android-autodetect-checkbox');
  if (autoDetectCheckbox) autoDetectCheckbox.checked = modelConfig.androidAutoDetect !== false;
  const alwaysShowCheckbox = document.getElementById('android-always-show-checkbox');
  if (alwaysShowCheckbox) alwaysShowCheckbox.checked = !!modelConfig.androidAlwaysShow;

  isEditorTextColorCustomized = !!modelConfig.editorTextColor;
  updateEditorTextColorUI();
}

function showConfigModal() { 
  populateConfigModal(); 
  onModelTypeChange(); 
  configModal.classList.add('active'); 
  
  // Reset active tab in settings modal
  document.querySelectorAll('.modal-tab-btn').forEach((b, idx) => {
    b.classList.toggle('active', idx === 0);
  });
  document.querySelectorAll('.modal-tab-content').forEach((c, idx) => {
    c.classList.toggle('active', idx === 0);
    c.style.display = idx === 0 ? 'flex' : 'none';
  });
}

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
    theme:     document.getElementById('theme-selector')?.value || 'cyber-purple',
    language:  document.getElementById('language-selector')?.value || 'fr',
    githubToken: document.getElementById('github-token')?.value || '',
    githubUser:  document.getElementById('github-user')?.value || '',
    githubEmail: document.getElementById('github-email')?.value || '',
    androidAutoDetect: document.getElementById('android-autodetect-checkbox')?.checked ?? true,
    androidAlwaysShow: document.getElementById('android-always-show-checkbox')?.checked ?? false,
    editorTextColor: isEditorTextColorCustomized 
      ? (document.getElementById('editor-text-color-input')?.value || '') 
      : (modelConfig?.editorTextColor || '')
  };
  
  await ipcRenderer.invoke('save-model-config', config);
  modelConfig = config;
  
  applyTheme(config.theme);
  applyLanguage(config.language);
  
  if (currentProject) {
    const gitRes = await ipcRenderer.invoke('setup-git-credentials', {
      cwd: currentProject,
      githubToken: config.githubToken,
      githubUser: config.githubUser,
      githubEmail: config.githubEmail
    });
    if (gitRes.success) {
      appendTerminalLine('✓ Git credentials configured locally.', 'stdout');
    } else {
      appendTerminalLine('⚠ Git config skipped or error: ' + gitRes.error, 'info');
    }
  }

  updateStatusBar();
  await updateAndroidDropdownVisibility();
  hideConfigModal();
  
  const dict = TRANSLATIONS[config.language] || TRANSLATIONS.fr;
  addChatMessage('system', `✅ ${dict.config_saved || 'Configuration enregistrée'}: ${config.type} / ${config.modelName}`);
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

// ─── Git Operations (Pull / Push) ─────────────────────────────────────────────
async function executeGitPull() {
  const dict = TRANSLATIONS[modelConfig?.language || 'fr'] || TRANSLATIONS.fr;
  if (!currentProject) {
    showError(dict.error_no_project);
    return;
  }
  
  appendTerminalLine('▶ Git Pull...', 'prompt');
  const result = await ipcRenderer.invoke('git-pull', { cwd: currentProject });
  if (result.success) {
    appendTerminalLine(result.message || 'Pull completed successfully.', 'stdout');
    addChatMessage('system', `⬇️ Git Pull: ${dict.git_success}`);
    
    await loadFileTree(currentProject);
    await refreshFileTreeCache();
  } else {
    appendTerminalLine('✗ ' + result.error, 'error');
    showError(`${dict.git_failed}: ${result.error}`);
  }
}

async function executeGitPush() {
  const dict = TRANSLATIONS[modelConfig?.language || 'fr'] || TRANSLATIONS.fr;
  if (!currentProject) {
    showError(dict.error_no_project);
    return;
  }
  
  const commitMessage = await showPrompt(dict.git_push, dict.prompt_commit_msg || 'Message de commit :');
  if (commitMessage === null) return;
  
  const msg = commitMessage.trim() || 'Update via CobraBub IDE';
  
  appendTerminalLine(`▶ Git Push: Adding, committing ("${msg}") and pushing...`, 'prompt');
  const result = await ipcRenderer.invoke('git-push', { cwd: currentProject, commitMessage: msg });
  if (result.success) {
    appendTerminalLine(result.message || 'Push completed successfully.', 'stdout');
    addChatMessage('system', `⬆️ Git Push: ${dict.git_success}`);
  } else {
    appendTerminalLine('✗ ' + result.error, 'error');
    showError(`${dict.git_failed}: ${result.error}`);
  }
}

// ─── Parse Agent Response for File Writes & Commands ────────────────────────
async function parseAndExecuteAgentActions(response) {
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

  if (actions.length === 0) return;

  const dict = TRANSLATIONS[modelConfig?.language || 'fr'] || TRANSLATIONS.fr;
  const summary = actions.map(a => a.type === 'write' ? `📝 ${a.relPath}` : `▶ ${a.cmd}`).join('\n');
  const confirmed = await showConfirm(dict.confirm_title, `${dict.agent_run_msg} (${actions.length})`, summary);
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
      const dataUrl = src.thumbnail;
      const commaIdx = dataUrl.indexOf(',');
      const base64Data = dataUrl.substring(commaIdx + 1);
      
      activeAttachments.push({
        mimeType: 'image/png',
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
  
  const originalText = agentBtn.textContent;
  agentBtn.textContent = '🛑 Stop';
  agentBtn.classList.add('agent-active-badge');
  if (sendBtn) sendBtn.disabled = false;
  
  activeAttachments = [];
  renderAttachmentPreviews();

  let nextPrompt = initialInstruction;
  let turnAttachments = attachments;
  
  const dict = TRANSLATIONS[modelConfig?.language || 'fr'] || TRANSLATIONS.fr;

  while (agentLoopActive && currentAgentTurn < MAX_AGENT_TURNS) {
    currentAgentTurn++;
    const turnLabel = `${dict.tour} ${currentAgentTurn}/${MAX_AGENT_TURNS}`;
    addTask(`🤖 Agent - ${turnLabel} : Analyse…`, 'running');
    setLoading(true);

    await refreshFileTreeCache();

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
      userIntervention = null;
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

    const autoMode = document.getElementById('autonomous-mode').checked;
    if (!autoMode) {
      const summary = actions.map(a => a.type === 'write' ? `📝 ${a.relPath}` : `▶ ${a.cmd}`).join('\n');
      const confirmed = await showConfirm(
        `${dict.confirm_title} - Tour ${currentAgentTurn}`,
        `${dict.agent_run_msg} (${actions.length})`,
        summary
      );
      if (!confirmed) {
        addChatMessage('system', dict.agent_stopped);
        addTask(`${dict.agent_failed} (tour ${currentAgentTurn})`, 'failed');
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

    nextPrompt = `[OBSERVATION DU TOUR ${currentAgentTurn}]
${observations.join('\n\n')}

Continuez la tâche en fonction de ces observations. S'il n'y a plus rien à faire, répondez simplement en expliquant que tout est bon.`;
    turnAttachments = [];

    await new Promise(resolve => setTimeout(resolve, 800));
  }

  agentBtn.textContent = originalText;
  agentBtn.classList.remove('agent-active-badge');
  agentLoopActive = false;
}

// ─── Chat & Agent ─────────────────────────────────────────────────────────────
async function sendMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  if (agentLoopActive) {
    const attachmentsToSend = [...activeAttachments];
    activeAttachments = [];
    renderAttachmentPreviews();

    addChatMessage('user', `💬 [Intervention] ${message}`, attachmentsToSend);
    chatInput.value = '';
    
    userIntervention = { message, attachments: attachmentsToSend };
    return;
  }

  if (isLoading) return;
  if (!modelConfig?.apiKey && !['ollama','lmstudio','vllm','local'].includes(modelConfig?.type)) {
    addChatMessage('system', TRANSLATIONS[modelConfig?.language || 'fr'].api_key_missing); return;
  }

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
    addChatMessage('system', TRANSLATIONS[modelConfig?.language || 'fr'].api_key_missing); return;
  }
  
  const attachmentsToSend = [...activeAttachments];
  addChatMessage('user', `🤖 [Agent] ${instruction}`, attachmentsToSend);
  chatInput.value = '';

  runAgentTaskLoop(instruction, attachmentsToSend);
}

function setLoading(loading) {
  isLoading = loading;
  const sendBtn = document.getElementById('send-message');
  if (sendBtn) sendBtn.textContent = loading ? '⏳' : 'Envoyer';
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

  if (window.lucide) {
    try { window.lucide.createIcons(); } catch (e) {}
  }
}

function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderMarkdown(text) {
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
  document.getElementById('terminal-panel')?.classList.add('open');
}

function addTerminalLine(text, type) { appendTerminalLine(text, type); }

// ─── UI helpers ───────────────────────────────────────────────────────────────
function toggleAgentPanel() {
  const panel = document.getElementById('agent-panel');
  const btn   = document.getElementById('toggle-agent-panel');
  const col   = panel.style.width === '0px';
  panel.style.width    = col ? '' : '0px';
  panel.style.overflow = col ? '' : 'hidden';
  btn.innerHTML = col ? '<i data-lucide="chevron-right"></i>' : '<i data-lucide="chevron-left"></i>';
  if (window.lucide) {
    try { window.lucide.createIcons(); } catch (e) {}
  }
}

function showError(msg) { addChatMessage('system', '❌ ' + msg); console.error(msg); }

// ─── Android Emulator Operations ──────────────────────────────────────────────
async function detectAndroidEmulators() {
  const listContainer = document.getElementById('android-emulators-list');
  if (!listContainer) return;
  
  const dict = TRANSLATIONS[modelConfig?.language || 'fr'] || TRANSLATIONS.fr;
  listContainer.innerHTML = `<div style="padding: 8px 12px; font-size: 11px; color: var(--text-dark);">${dict.loading || '⏳...'}</div>`;
  
  const result = await ipcRenderer.invoke('list-android-emulators');
  listContainer.innerHTML = '';
  
  if (result.success && result.emulators && result.emulators.length > 0) {
    result.emulators.forEach(name => {
      const btn = document.createElement('button');
      btn.className = 'dropdown-item';
      btn.innerHTML = `<i data-lucide="play" style="width: 12px; height: 12px; vertical-align: middle; margin-right: 6px; color: var(--green);"></i> ${name}`;
      btn.addEventListener('click', async () => {
        document.getElementById('android-dropdown-menu')?.classList.remove('active');
        await startAndroidEmulator(name);
      });
      listContainer.appendChild(btn);
    });
  } else {
    const emptyDiv = document.createElement('div');
    emptyDiv.id = 'lbl-android-no-avd';
    emptyDiv.style.cssText = 'padding: 8px 12px; font-size: 11px; color: var(--text-dark); font-style: italic;';
    emptyDiv.textContent = dict.android_no_avd;
    listContainer.appendChild(emptyDiv);
  }
  
  if (window.lucide) {
    try { window.lucide.createIcons(); } catch (e) {}
  }
}

async function startAndroidEmulator(name) {
  const dict = TRANSLATIONS[modelConfig?.language || 'fr'] || TRANSLATIONS.fr;
  appendTerminalLine(`▶ [Android] ${dict.android_starting} "${name}"`, 'prompt');
  
  const result = await ipcRenderer.invoke('start-android-emulator', name);
  if (result.success) {
    appendTerminalLine(`✓ [Android] ${dict.android_success} ("${name}")`, 'stdout');
    addChatMessage('system', `📱 Android: ${dict.android_success} (${name})`);
  } else {
    appendTerminalLine(`✗ [Android] Erreur: ${result.error}`, 'error');
    showError(`Android Emulator error: ${result.error}`);
  }
}

async function updateAndroidDropdownVisibility() {
  const container = document.querySelector('.android-dropdown-container');
  if (!container) return;
  
  const alwaysShow = modelConfig?.androidAlwaysShow ?? false;
  const autoDetect = modelConfig?.androidAutoDetect ?? true;
  
  if (alwaysShow) {
    container.style.display = 'inline-block';
    const isAndroid = currentProject ? await ipcRenderer.invoke('detect-android-project', currentProject) : false;
    highlightAndroidButton(isAndroid);
  } else if (autoDetect && currentProject) {
    const isAndroid = await ipcRenderer.invoke('detect-android-project', currentProject);
    if (isAndroid) {
      container.style.display = 'inline-block';
      highlightAndroidButton(true);
    } else {
      container.style.display = 'none';
    }
  } else {
    container.style.display = 'none';
  }
}

function highlightAndroidButton(isAndroid) {
  const btn = document.getElementById('android-btn');
  if (!btn) return;
  if (isAndroid) {
    btn.style.border = '1px solid rgba(16, 185, 129, 0.4)';
    btn.style.background = 'rgba(16, 185, 129, 0.05)';
    btn.title = 'Projet Android détecté !';
    detectAndroidEmulators();
  } else {
    btn.style.border = '';
    btn.style.background = '';
    btn.title = 'Android Virtual Devices';
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────
init();
