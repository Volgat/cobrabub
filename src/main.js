const { app, BrowserWindow, ipcMain, dialog, desktopCapturer, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { exec, spawn } = require('child_process');

let mainWindow;

// ─── Native Menu Translations ──────────────────────────────────────────────────
const MENU_TRANSLATIONS = {
  fr: {
    file: 'Fichier',
    quit: 'Quitter',
    edit: 'Édition',
    undo: 'Annuler',
    redo: 'Rétablir',
    cut: 'Couper',
    copy: 'Copier',
    paste: 'Coller',
    selectAll: 'Tout sélectionner',
    view: 'Affichage',
    reload: 'Recharger',
    forceReload: 'Forcer le rechargement',
    devTools: 'Outils de développement',
    resetZoom: 'Taille réelle',
    zoomIn: 'Zoom avant',
    zoomOut: 'Zoom arrière',
    fullScreen: 'Plein écran',
    help: 'Aide',
    about: 'Documentation & À propos de AmeForge'
  },
  en: {
    file: 'File',
    quit: 'Quit',
    edit: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    view: 'View',
    reload: 'Reload',
    forceReload: 'Force Reload',
    devTools: 'Toggle Developer Tools',
    resetZoom: 'Actual Size',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    fullScreen: 'Toggle Full Screen',
    help: 'Help',
    about: 'Documentation & About AmeForge'
  },
  es: {
    file: 'Archivo',
    quit: 'Salir',
    edit: 'Edición',
    undo: 'Deshacer',
    redo: 'Rehacer',
    cut: 'Cortar',
    copy: 'Copiar',
    paste: 'Pegar',
    selectAll: 'Seleccionar todo',
    view: 'Ver',
    reload: 'Recargar',
    forceReload: 'Forzar recarga',
    devTools: 'Herramientas de desarrollo',
    resetZoom: 'Tamaño real',
    zoomIn: 'Acercar',
    zoomOut: 'Alejar',
    fullScreen: 'Pantalla completa',
    help: 'Ayuda',
    about: 'Documentación y Acerca de AmeForge'
  }
};

function createMenu(lang) {
  const dict = MENU_TRANSLATIONS[lang] || MENU_TRANSLATIONS.fr;
  const template = [
    {
      label: dict.file,
      submenu: [
        { role: 'quit', label: dict.quit }
      ]
    },
    {
      label: dict.edit,
      submenu: [
        { role: 'undo', label: dict.undo },
        { role: 'redo', label: dict.redo },
        { type: 'separator' },
        { role: 'cut', label: dict.cut },
        { role: 'copy', label: dict.copy },
        { role: 'paste', label: dict.paste },
        { role: 'selectAll', label: dict.selectAll }
      ]
    },
    {
      label: dict.view,
      submenu: [
        { role: 'reload', label: dict.reload },
        { role: 'forceReload', label: dict.forceReload },
        { role: 'toggleDevTools', label: dict.devTools },
        { type: 'separator' },
        { role: 'resetZoom', label: dict.resetZoom },
        { role: 'zoomIn', label: dict.zoomIn },
        { role: 'zoomOut', label: dict.zoomOut },
        { type: 'separator' },
        { role: 'togglefullscreen', label: dict.fullScreen }
      ]
    },
    {
      label: dict.help,
      submenu: [
        {
          label: dict.about,
          click: async () => {
            await shell.openExternal('https://ameforge.tech/#about');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    frame: true,
    backgroundColor: '#0f0f1a',
    icon: path.join(__dirname, '../assets/logo.png')
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  if (process.argv.includes('--dev')) mainWindow.webContents.openDevTools();
  mainWindow.on('closed', () => { mainWindow = null; });

  createMenu(modelConfig.language || 'fr');
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

// ─── Persistent config ────────────────────────────────────────────────────────
const CONFIG_PATH = path.join(app.getPath('userData'), 'cobrabub-config.json');

let modelConfig = {
  type: 'anthropic',
  apiKey: '',
  modelName: 'claude-haiku-4-5',
  baseUrl: '',
  theme: 'cyber-purple',
  language: 'fr',
  githubToken: '',
  githubUser: '',
  githubEmail: '',
  androidAutoDetect: true,
  androidAlwaysShow: true,
  editorTextColor: ''
};

try {
  if (fs.existsSync(CONFIG_PATH)) {
    modelConfig = { ...modelConfig, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) };
    console.log('✓ Config loaded');
  }
} catch (e) { console.error('Config load error:', e.message); }

ipcMain.handle('save-model-config', async (event, config) => {
  modelConfig = { ...modelConfig, ...config };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(modelConfig, null, 2), 'utf-8');
  createMenu(modelConfig.language || 'fr');
  return { success: true };
});
ipcMain.handle('get-model-config', async () => modelConfig);

// ─── File Operations ───────────────────────────────────────────────────────────
ipcMain.handle('open-directory-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  return result.filePaths[0] || null;
});

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Code & Texte', extensions: ['js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'json', 'md', 'txt', 'java', 'cpp', 'c', 'rs', 'go', 'yml', 'yaml', 'sql', 'sh'] },
      { name: 'Tous les fichiers', extensions: ['*'] }
    ]
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    // Notify renderer that a file was written (for auto-open)
    if (mainWindow) mainWindow.webContents.send('file-written', filePath);
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('list-directory', async (event, dirPath) => {
  try {
    const IGNORE = new Set(['node_modules', '.git', '__pycache__', 'dist', 'out', '.next', 'venv', '.venv', 'build']);
    const items = fs.readdirSync(dirPath, { withFileTypes: true })
      .filter(i => !IGNORE.has(i.name))
      .map(item => ({
        name: item.name,
        isDirectory: item.isDirectory(),
        path: path.join(dirPath, item.name)
      }))
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
    return { success: true, items };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('create-folder', async (event, folderPath) => {
  try {
    fs.mkdirSync(folderPath, { recursive: true });
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('delete-file', async (event, filePath) => {
  try {
    fs.rmSync(filePath, { recursive: true, force: true });
    return { success: true };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── File Tree (recursive, for agent context) ──────────────────────────────────
ipcMain.handle('get-file-tree', async (event, dirPath) => {
  const IGNORE = new Set(['node_modules', '.git', '__pycache__', 'dist', 'out', '.next', 'venv', '.venv', 'build', '.cache']);

  function buildTree(dir, prefix = '', depth = 0) {
    if (depth > 5) return '';
    let result = '';
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true })
        .filter(i => !IGNORE.has(i.name) && !i.name.startsWith('.'))
        .sort((a, b) => {
          if (a.isDirectory() && !b.isDirectory()) return -1;
          if (!a.isDirectory() && b.isDirectory()) return 1;
          return a.name.localeCompare(b.name);
        });

      items.forEach((item, idx) => {
        const isLast = idx === items.length - 1;
        result += prefix + (isLast ? '└── ' : '├── ') + item.name + (item.isDirectory() ? '/' : '') + '\n';
        if (item.isDirectory()) {
          result += buildTree(
            path.join(dir, item.name),
            prefix + (isLast ? '    ' : '│   '),
            depth + 1
          );
        }
      });
    } catch (e) {}
    return result;
  }

  const tree = path.basename(dirPath) + '/\n' + buildTree(dirPath);
  return { success: true, tree };
});

// ─── Screen / Window Capture ──────────────────────────────────────────────────
ipcMain.handle('capture-screens', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 800, height: 600 }
    });
    return {
      success: true,
      sources: sources.map(s => ({
        id: s.id,
        name: s.name,
        thumbnail: s.thumbnail.toDataURL()
      }))
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ─── Terminal / Command Execution ─────────────────────────────────────────────
ipcMain.handle('execute-command', async (event, command, cwd) => {
  return new Promise((resolve) => {
    const workDir = cwd || (mainWindow ? process.cwd() : process.cwd());
    console.log(`▶ Executing: ${command} (in ${workDir})`);

    exec(command, {
      cwd: workDir,
      timeout: 60000,
      maxBuffer: 2 * 1024 * 1024,
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/bash'
    }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: error ? (error.code || 1) : 0,
        command
      });
    });
  });
});

// Streaming command execution (sends output line by line)
ipcMain.handle('execute-command-stream', async (event, command, cwd) => {
  const workDir = cwd || process.cwd();
  const shell = process.platform === 'win32' ? true : '/bin/bash';

  const proc = spawn(command, [], {
    cwd: workDir,
    shell,
    timeout: 120000
  });

  proc.stdout.on('data', data => {
    if (mainWindow) mainWindow.webContents.send('terminal-output', { type: 'stdout', data: data.toString() });
  });
  proc.stderr.on('data', data => {
    if (mainWindow) mainWindow.webContents.send('terminal-output', { type: 'stderr', data: data.toString() });
  });
  proc.on('close', code => {
    if (mainWindow) mainWindow.webContents.send('terminal-output', { type: 'exit', code });
  });
  proc.on('error', err => {
    if (mainWindow) mainWindow.webContents.send('terminal-output', { type: 'error', data: err.message });
  });

  return { success: true, pid: proc.pid };
});

// ─── HTTP request helper ───────────────────────────────────────────────────────
function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const isHttps = options.protocol === 'https:' || !options.protocol;
    const lib = isHttps ? https : http;
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);

    const req = lib.request({
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`API Error ${res.statusCode}: ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Invalid JSON: ${data.slice(0, 300)}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('Timeout 120s')); });
    req.write(bodyStr);
    req.end();
  });
}

// ─── AI call ─────────────────────────────────────────────────────────────────
async function callAI(messages, config) {
  const type = config.type || 'anthropic';
  const apiKey = config.apiKey || config.api_key || '';
  const modelName = config.modelName || 'claude-haiku-4-5';

  if (!apiKey && !['ollama', 'lmstudio', 'vllm', 'local'].includes(type)) {
    throw new Error('Clé API manquante. Cliquez sur "Configure" pour ajouter votre clé.');
  }

  if (type === 'anthropic') {
    const systemMsg = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');
    
    const formattedMessages = userMessages.map(m => {
      if (Array.isArray(m.content)) {
        return {
          role: m.role,
          content: m.content.map(part => {
            if (part.type === 'text') {
              return { type: 'text', text: part.text };
            } else if (part.type === 'image') {
              return {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: part.mimeType || 'image/png',
                  data: part.data
                }
              };
            }
            return part;
          })
        };
      }
      return { role: m.role, content: m.content };
    });

    const aliases = {
      'claude-opus-4': 'claude-opus-4-5', 'claude-sonnet-4': 'claude-sonnet-4-5',
      'claude-haiku-4': 'claude-haiku-4-5', 'claude-3.5-sonnet': 'claude-3-5-sonnet-20241022',
      'claude-3-opus': 'claude-3-opus-20240229', 'claude-3-haiku': 'claude-3-haiku-20240307',
    };
    const resolvedModel = aliases[modelName] || modelName;
    const result = await makeRequest({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
    }, {
      model: resolvedModel, max_tokens: 8192,
      system: systemMsg?.content || 'You are an expert AI coding assistant in CobraBub IDE.',
      messages: formattedMessages
    });
    return result.content[0].text;
  }

  if (type === 'openai' || type === 'custom' || ['ollama', 'lmstudio', 'vllm', 'local'].includes(type)) {
    const baseUrl = config.baseUrl || (type === 'ollama' ? 'http://localhost:11434' : type === 'lmstudio' ? 'http://localhost:1234' : type === 'vllm' ? 'http://localhost:8000' : 'https://api.openai.com');
    const url = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`);
    
    const formattedMessages = messages.map(m => {
      if (Array.isArray(m.content)) {
        return {
          role: m.role,
          content: m.content.map(part => {
            if (part.type === 'text') {
              return { type: 'text', text: part.text };
            } else if (part.type === 'image') {
              return {
                type: 'image_url',
                image_url: {
                  url: `data:${part.mimeType || 'image/png'};base64,${part.data}`
                }
              };
            }
            return part;
          })
        };
      }
      return { role: m.role, content: m.content };
    });

    const result = await makeRequest({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: (url.pathname.replace(/\/$/, '') || '') + '/v1/chat/completions',
      method: 'POST', protocol: url.protocol,
      headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}
    }, { model: modelName, messages: formattedMessages, max_tokens: 4096, temperature: 0.7 });
    return result.choices[0].message.content;
  }

  if (type === 'gemini') {
    const gModel = modelName || 'gemini-1.5-flash';
    const contents = messages.filter(m => m.role !== 'system').map(m => {
      const role = m.role === 'assistant' ? 'model' : 'user';
      let parts = [];
      if (Array.isArray(m.content)) {
        parts = m.content.map(part => {
          if (part.type === 'text') {
            return { text: part.text };
          } else if (part.type === 'image') {
            return {
              inlineData: {
                mimeType: part.mimeType || 'image/png',
                data: part.data
              }
            };
          }
          return { text: JSON.stringify(part) };
        });
      } else {
        parts = [{ text: m.content }];
      }
      return { role, parts };
    });

    const systemMsg = messages.find(m => m.role === 'system');
    const reqBody = { contents };
    if (systemMsg?.content) {
      reqBody.systemInstruction = {
        parts: [{ text: systemMsg.content }]
      };
    }

    const result = await makeRequest({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${gModel}:generateContent?key=${apiKey}`, method: 'POST'
    }, reqBody);
    return result.candidates[0].content.parts[0].text;
  }

  throw new Error(`Unknown provider: ${type}`);
}

// ─── System prompt builder ────────────────────────────────────────────────────
function buildSystemPrompt(fileTree = '', openFiles = []) {
  let prompt = `You are CobraBub, an expert AI coding agent integrated into CobraBub IDE.
You can analyze code, write new code, fix bugs, and execute terminal commands.

CAPABILITIES:
- Read and write files in the project
- Execute terminal commands (CMD/bash)
- Analyze code and suggest improvements
- Create and modify files

RESPONSE FORMATS:
When you want to CREATE or MODIFY a file, use this exact format:
\`\`\`WRITE_FILE:path/to/file.ext
file content here
\`\`\`

When you want to RUN a terminal command, use this exact format:
\`\`\`RUN_CMD
your command here
\`\`\`

Always explain what you're doing before writing files or running commands.`;

  if (fileTree) {
    prompt += `\n\nPROJECT STRUCTURE:\n\`\`\`\n${fileTree}\n\`\`\``;
  }

  if (openFiles && openFiles.length > 0) {
    prompt += `\n\nOPEN FILES IN EDITOR:`;
    openFiles.forEach(f => {
      const ext = f.name.split('.').pop();
      prompt += `\n\n### ${f.name}\n\`\`\`${ext}\n${f.content.slice(0, 4000)}\n\`\`\``;
    });
  }

  return prompt;
}

// ─── Chat handler ─────────────────────────────────────────────────────────────
ipcMain.handle('send-chat-message', async (event, { message, files, activeFile, history, fileTree, attachments }) => {
  try {
    const systemPrompt = buildSystemPrompt(fileTree, files);
    const messages = [{ role: 'system', content: systemPrompt }];

    if (history && history.length > 0) {
      // Map history messages: support both strings and arrays
      const mappedHistory = history.map(h => {
        if (Array.isArray(h.content)) {
          return {
            role: h.role,
            content: h.content.map(p => {
              if (p.type === 'text') return { type: 'text', text: p.text };
              if (p.type === 'image') return { type: 'image', mimeType: p.mimeType, data: p.data };
              return p;
            })
          };
        }
        return h;
      });
      messages.push(...mappedHistory.slice(-12));
    }

    let userContent = [];
    if (activeFile?.content) {
      const ext = activeFile.name.split('.').pop();
      userContent.push({
        type: 'text',
        text: `[Fichier actif: ${activeFile.name}]\n\`\`\`${ext}\n${activeFile.content.slice(0, 6000)}\n\`\`\``
      });
    }
    
    userContent.push({ type: 'text', text: message });

    if (attachments && attachments.length > 0) {
      attachments.forEach(att => {
        userContent.push({
          type: 'image',
          mimeType: att.mimeType,
          data: att.data
        });
      });
    }

    messages.push({ role: 'user', content: userContent });

    const response = await callAI(messages, modelConfig);
    return { success: true, content: response };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ─── Agent task handler ───────────────────────────────────────────────────────
ipcMain.handle('run-agent-task', async (event, { instruction, files, projectPath, fileTree, attachments }) => {
  try {
    const systemPrompt = buildSystemPrompt(fileTree, files);
    
    let userContent = [];
    userContent.push({
      type: 'text',
      text: `Project: ${projectPath || 'Unknown'}\n\nAgent Task: ${instruction}\n\nAnalyze the project structure and open files, then complete the task. Use WRITE_FILE and RUN_CMD formats when needed.`
    });

    if (attachments && attachments.length > 0) {
      attachments.forEach(att => {
        userContent.push({
          type: 'image',
          mimeType: att.mimeType,
          data: att.data
        });
      });
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ];
    
    const response = await callAI(messages, modelConfig);
    return { success: true, content: response };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ─── GitHub ───────────────────────────────────────────────────────────────────
ipcMain.handle('setup-git-credentials', async (event, config) => {
  try {
    const { execSync } = require('child_process');
    const cwd = config.cwd || process.cwd();
    
    // Check if git repo
    let isGit = false;
    try {
      execSync('git rev-parse --is-inside-work-tree', { cwd, stdio: 'ignore' });
      isGit = true;
    } catch (e) {}
    
    if (!isGit) {
      return { success: false, error: 'Pas un dépôt Git valide ou dossier non initialisé.' };
    }

    if (config.githubUser) {
      execSync(`git config user.name "${config.githubUser.replace(/"/g, '\\"')}"`, { cwd });
    }
    if (config.githubEmail) {
      execSync(`git config user.email "${config.githubEmail.replace(/"/g, '\\"')}"`, { cwd });
    }
    
    if (config.githubToken) {
      let remoteUrl = '';
      try {
        remoteUrl = execSync('git remote get-url origin', { cwd, encoding: 'utf-8' }).trim();
      } catch (e) {}

      if (remoteUrl) {
        let newRemoteUrl = remoteUrl;
        if (remoteUrl.startsWith('https://')) {
          const cleanUrl = remoteUrl.replace(/^https:\/\/([^@]+@)?/, '');
          newRemoteUrl = `https://${config.githubToken}@${cleanUrl}`;
        } else if (remoteUrl.startsWith('git@github.com:')) {
          const match = remoteUrl.match(/^git@github\.com:(.+)$/);
          if (match) {
            newRemoteUrl = `https://${config.githubToken}@github.com/${match[1]}`;
          }
        }
        if (newRemoteUrl !== remoteUrl) {
          execSync(`git remote set-url origin "${newRemoteUrl}"`, { cwd });
        }
      }
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
ipcMain.handle('git-pull', async (event, config) => {
  try {
    const { execSync } = require('child_process');
    const output = execSync('git pull', { cwd: config.cwd || process.cwd(), encoding: 'utf-8' });
    return { success: true, message: output };
  } catch (e) { return { success: false, error: e.message }; }
});
ipcMain.handle('git-push', async (event, config) => {
  try {
    const { execSync } = require('child_process');
    execSync(`git add -A && git commit -m "${config.commitMessage}" && git push`, {
      cwd: config.cwd || process.cwd(), shell: true
    });
    return { success: true, message: 'Push successful' };
  } catch (e) { return { success: false, error: e.message }; }
});

// ─── Android Emulators ────────────────────────────────────────────────────────
ipcMain.handle('list-android-emulators', async () => {
  try {
    const { execSync } = require('child_process');
    const output = execSync('android emulator list', { encoding: 'utf-8' });
    const emulators = output.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    return { success: true, emulators };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('start-android-emulator', async (event, name) => {
  try {
    const { spawn } = require('child_process');
    const shell = process.platform === 'win32' ? true : '/bin/bash';
    const proc = spawn('android', ['emulator', 'start', name], {
      shell,
      detached: true,
      stdio: 'ignore'
    });
    proc.unref();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

function checkIsAndroidProject(dirPath, depth = 0) {
  if (depth > 3) return false;
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const IGNORE = new Set(['node_modules', '.git', 'build', '.gradle', 'dist', 'out', 'venv', '.venv']);
    
    // First pass: check files in current directory
    for (const item of items) {
      if (item.isFile()) {
        const name = item.name;
        if (name === 'AndroidManifest.xml' || 
            name === 'build.gradle' || 
            name === 'build.gradle.kts' || 
            name === 'settings.gradle' || 
            name === 'settings.gradle.kts' ||
            name === 'local.properties') {
          return true;
        }
      }
    }
    
    // Second pass: recursively check subdirectories
    for (const item of items) {
      if (item.isDirectory() && !IGNORE.has(item.name) && !item.name.startsWith('.')) {
        if (checkIsAndroidProject(path.join(dirPath, item.name), depth + 1)) {
          return true;
        }
      }
    }
  } catch (e) {}
  return false;
}

ipcMain.handle('detect-android-project', async (event, dirPath) => {
  if (!dirPath) return false;
  return checkIsAndroidProject(dirPath);
});
