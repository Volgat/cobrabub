const { ipcRenderer } = require('electron');

// State management
let currentProject = null;
let openFiles = [];
let activeFile = null;
let modelConfig = null;
let isConnectedToAgent = false;
let attachedFiles = []; // Files attached to chat
let githubConfig = null; // GitHub connection config
let fileEncoding = 'utf-8';
let autoFormat = false;
let lineEndings = 'lf';
let tabSize = 4;

// Predefined model configurations
const MODEL_PRESETS = {
    openai: {
        baseUrl: 'https://api.openai.com/v1',
        endpoint: '/v1/chat/completions',
        defaultModel: 'gpt-4'
    },
    anthropic: {
        baseUrl: 'https://api.anthropic.com',
        endpoint: '/v1/messages',
        defaultModel: 'claude-3-sonnet-20240229'
    },
    gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        endpoint: '/models/gemini-pro:generateContent',
        defaultModel: 'gemini-pro'
    },
    qwen: {
        baseUrl: 'https://dashscope.aliyuncs.com/api/v1',
        endpoint: '/services/aigc/text-generation/generation',
        defaultModel: 'qwen-max'
    },
    ollama: {
        baseUrl: 'http://localhost:11434',
        endpoint: '/api/generate',
        defaultModel: 'llama2'
    },
    lmstudio: {
        baseUrl: 'http://localhost:1234/v1',
        endpoint: '/v1/chat/completions',
        defaultModel: 'local-model'
    },
    vllm: {
        baseUrl: 'http://localhost:8000/v1',
        endpoint: '/v1/chat/completions',
        defaultModel: 'meta-llama/Llama-2-7b-chat-hf'
    },
    custom: {
        baseUrl: '',
        endpoint: '/v1/chat/completions',
        defaultModel: 'custom-model'
    }
};

// DOM Elements
const fileTree = document.getElementById('file-tree');
const codeEditor = document.getElementById('code-editor');
const tabsContainer = document.getElementById('tabs');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const configModal = document.getElementById('config-modal');
const taskList = document.getElementById('task-list');
const githubModal = document.getElementById('github-modal');
const fileAttachModal = document.getElementById('file-attach-modal');
const attachedFilesContainer = document.getElementById('attached-files');
const attachedFilesList = document.getElementById('attached-files-list');

// Initialize application
async function init() {
    await loadModelConfig();
    setupEventListeners();
    updateStatus();
}

// Event Listeners Setup
function setupEventListeners() {
    // Window controls
    document.getElementById('minimize-btn').addEventListener('click', () => {
        console.log('Minimize window');
    });

    document.getElementById('maximize-btn').addEventListener('click', () => {
        console.log('Maximize window');
    });

    document.getElementById('close-btn').addEventListener('click', () => {
        console.log('Close window');
    });

    // File operations
    document.getElementById('open-folder-btn').addEventListener('click', openFolder);
    document.getElementById('refresh-files').addEventListener('click', refreshFileTree);
    document.getElementById('new-file-btn').addEventListener('click', createNewFile);
    document.getElementById('new-folder-btn')?.addEventListener('click', createNewFolder);

    // GitHub operations
    document.getElementById('github-sync')?.addEventListener('click', showGithubModal);
    document.getElementById('git-pull')?.addEventListener('click', gitPull);
    document.getElementById('git-push')?.addEventListener('click', gitPush);

    // Editor events
    codeEditor.addEventListener('input', handleEditorInput);
    codeEditor.addEventListener('keyup', updateCursorPosition);
    codeEditor.addEventListener('click', updateCursorPosition);

    // Agent panel
    document.getElementById('send-message').addEventListener('click', sendMessage);
    document.getElementById('run-agent').addEventListener('click', runAgentTask);
    document.getElementById('configure-model').addEventListener('click', showConfigModal);
    document.getElementById('agent-settings').addEventListener('click', showConfigModal);
    document.getElementById('toggle-agent-panel').addEventListener('click', toggleAgentPanel);
    document.getElementById('attach-file-btn')?.addEventListener('click', showAttachFileModal);
    document.getElementById('attach-file-chat')?.addEventListener('click', showAttachFileModal);

    // Modal
    document.getElementById('close-modal').addEventListener('click', hideConfigModal);
    document.getElementById('cancel-config').addEventListener('click', hideConfigModal);
    document.getElementById('save-config').addEventListener('click', saveModelConfig);

    // GitHub modal
    document.getElementById('close-github-modal')?.addEventListener('click', hideGithubModal);
    document.getElementById('cancel-github')?.addEventListener('click', hideGithubModal);
    document.getElementById('connect-github')?.addEventListener('click', connectGithub);
    document.getElementById('disconnect-github')?.addEventListener('click', disconnectGithub);

    // File attach modal
    document.getElementById('close-attach-modal')?.addEventListener('click', hideAttachFileModal);
    document.getElementById('cancel-attach')?.addEventListener('click', hideAttachFileModal);
    document.getElementById('confirm-attach')?.addEventListener('click', confirmAttachFiles);
    document.getElementById('file-drop-zone')?.addEventListener('click', triggerFileInput);
    document.getElementById('file-input')?.addEventListener('change', handleFileSelect);

    // Model type change
    document.getElementById('model-type').addEventListener('change', handleModelTypeChange);
    document.getElementById('model-type-config')?.addEventListener('change', () => {
        const modelType = document.getElementById('model-type-config').value;
        updateConfigModalForModelType(modelType);
    });

    // Drag and drop for files in chat
    chatInput?.addEventListener('dragover', handleDragOver);
    chatInput?.addEventListener('drop', handleDrop);

    // Listen for agent messages
    ipcRenderer.on('agent-message', (event, message) => {
        handleAgentMessage(message);
    });
}

// File Operations
async function openFolder() {
    try {
        const folderPath = await ipcRenderer.invoke('open-directory-dialog');
        if (folderPath) {
            currentProject = folderPath;
            document.getElementById('project-name').textContent = folderPath.split('/').pop() || 'Project';
            await loadFileTree(folderPath);
            
            // Connect to agent server if configured
            if (modelConfig && modelConfig.agentServerUrl) {
                connectToAgentServer(modelConfig.agentServerUrl);
            }
        }
    } catch (error) {
        showError('Failed to open folder: ' + error.message);
    }
}

async function loadFileTree(dirPath) {
    try {
        const result = await ipcRenderer.invoke('list-directory', dirPath);
        if (result.success) {
            renderFileTree(result.items, dirPath);
        }
    } catch (error) {
        showError('Failed to load file tree: ' + error.message);
    }
}

function renderFileTree(items, parentPath = '', container = fileTree) {
    container.innerHTML = '';
    
    items.forEach(item => {
        const fileElement = document.createElement('div');
        fileElement.className = `file-item ${item.isDirectory ? 'folder-item' : ''}`;
        fileElement.innerHTML = `
            <span class="file-icon">${item.isDirectory ? '📁' : getFileIcon(item.name)}</span>
            <span>${item.name}</span>
        `;
        
        fileElement.addEventListener('click', () => {
            if (item.isDirectory) {
                loadFileTree(item.path);
            } else {
                openFile(item.path);
            }
        });
        
        container.appendChild(fileElement);
    });
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'js': '📜', 'jsx': '⚛️', 'ts': '📘', 'tsx': '⚛️',
        'py': '🐍', 'html': '🌐', 'css': '🎨', 'json': '📋',
        'md': '📝', 'txt': '📄', 'java': '☕', 'cpp': '⚙️',
        'c': '⚙️', 'rs': '🦀', 'go': '🔹', 'rb': '💎'
    };
    return icons[ext] || '📄';
}

async function openFile(filePath) {
    try {
        const result = await ipcRenderer.invoke('read-file', filePath);
        if (result.success) {
            // Check if file is already open
            let existingTab = openFiles.find(f => f.path === filePath);
            
            if (!existingTab) {
                openFiles.push({
                    path: filePath,
                    name: filePath.split('/').pop(),
                    content: result.content,
                    isModified: false
                });
                existingTab = openFiles[openFiles.length - 1];
            } else {
                existingTab.content = result.content;
            }
            
            activeFile = existingTab;
            renderTabs();
            codeEditor.value = result.content;
            updateFileLanguage(filePath);
            updateCursorPosition();
            updateLineNumbers();
            setupScrollSync();
        } else {
            showError('Failed to open file: ' + result.error);
        }
    } catch (error) {
        showError('Failed to open file: ' + error.message);
    }
}

function renderTabs() {
    tabsContainer.innerHTML = '';
    
    openFiles.forEach(file => {
        const tab = document.createElement('div');
        tab.className = `tab ${file === activeFile ? 'active' : ''}`;
        tab.innerHTML = `
            <span>${getFileIcon(file.name)} ${file.name}</span>
            <span class="tab-close" data-path="${file.path}">×</span>
        `;
        
        tab.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-close')) {
                switchToFile(file.path);
            }
        });
        
        const closeBtn = tab.querySelector('.tab-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeFile(file.path);
        });
        
        tabsContainer.appendChild(tab);
    });
}

function switchToFile(filePath) {
    const file = openFiles.find(f => f.path === filePath);
    if (file) {
        activeFile = file;
        codeEditor.value = file.content;
        renderTabs();
        updateFileLanguage(filePath);
    }
}

function closeFile(filePath) {
    const index = openFiles.findIndex(f => f.path === filePath);
    if (index !== -1) {
        openFiles.splice(index, 1);
        
        if (activeFile && activeFile.path === filePath) {
            if (openFiles.length > 0) {
                switchToFile(openFiles[openFiles.length - 1].path);
            } else {
                activeFile = null;
                codeEditor.value = '';
            }
        }
        renderTabs();
    }
}

async function createNewFile() {
    if (!currentProject) {
        showError('Please open a folder first');
        return;
    }
    
    const filename = prompt('Enter file name:');
    if (filename) {
        const filePath = `${currentProject}/${filename}`;
        const result = await ipcRenderer.invoke('write-file', filePath, '');
        if (result.success) {
            await loadFileTree(currentProject);
            await openFile(filePath);
        } else {
            showError('Failed to create file: ' + result.error);
        }
    }
}

async function handleEditorInput() {
    if (activeFile) {
        activeFile.content = codeEditor.value;
        activeFile.isModified = true;
        renderTabs();
        updateLineNumbers();
    }
}

async function saveCurrentFile() {
    if (!activeFile) return;
    
    // Show saving indicator
    const saveIndicator = document.getElementById('save-indicator');
    if (saveIndicator) {
        saveIndicator.textContent = 'Saving...';
        saveIndicator.className = 'saving visible';
    }
    
    try {
        // Apply auto-formatting if enabled
        let contentToSave = activeFile.content;
        if (autoFormat && activeFile.path) {
            contentToSave = await formatCode(contentToSave, activeFile.path);
        }
        
        // Apply encoding and line endings
        contentToSave = applyEncodingAndLineEndings(contentToSave);
        
        const result = await ipcRenderer.invoke('write-file', activeFile.path, contentToSave);
        if (result.success) {
            activeFile.isModified = false;
            activeFile.content = contentToSave;
            codeEditor.value = contentToSave;
            renderTabs();
            
            // Show saved indicator
            if (saveIndicator) {
                saveIndicator.textContent = 'Saved ✓';
                saveIndicator.className = 'saved visible';
                setTimeout(() => {
                    saveIndicator.className = '';
                }, 2000);
            }
        } else {
            showError('Failed to save file: ' + result.error);
            if (saveIndicator) saveIndicator.className = '';
        }
    } catch (error) {
        showError('Failed to save file: ' + error.message);
        if (saveIndicator) saveIndicator.className = '';
    }
}

function updateLineNumbers() {
    const lineNumbersEl = document.getElementById('line-numbers');
    if (!lineNumbersEl) return;
    
    const lines = codeEditor.value.split('\n').length;
    const lineHeight = 22.4; // 14px font-size * 1.6 line-height
    lineNumbersEl.style.height = `${lines * lineHeight}px`;
    
    let lineNumbersHtml = '';
    for (let i = 1; i <= lines; i++) {
        lineNumbersHtml += `<div>${i}</div>`;
    }
    lineNumbersEl.innerHTML = lineNumbersHtml;
}

// Sync scroll between line numbers and editor
function setupScrollSync() {
    const lineNumbersEl = document.getElementById('line-numbers');
    if (lineNumbersEl && codeEditor) {
        codeEditor.addEventListener('scroll', () => {
            lineNumbersEl.scrollTop = codeEditor.scrollTop;
        });
    }
}

async function formatCode(code, filePath) {
    // Simple formatting based on file type
    const ext = filePath.split('.').pop().toLowerCase();
    
    // Basic formatting rules
    let formatted = code;
    
    // Remove trailing whitespace
    if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs'].includes(ext)) {
        formatted = formatted.split('\n').map(line => line.trimEnd()).join('\n');
    }
    
    // Ensure single newline at end of file
    formatted = formatted.replace(/\n*$/, '\n');
    
    return formatted;
}

function applyEncodingAndLineEndings(content) {
    // Apply line endings
    let result = content;
    if (lineEndings === 'crlf') {
        result = result.replace(/\n/g, '\r\n');
    } else if (lineEndings === 'cr') {
        result = result.replace(/\n/g, '\r');
    }
    
    // Note: UTF-8 BOM handling would require binary write in main.js
    // For now, we just track the setting
    
    return result;
}

function updateCursorPosition() {
    const text = codeEditor.value;
    const selectionStart = codeEditor.selectionStart;
    
    const lines = text.substr(0, selectionStart).split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    
    document.getElementById('cursor-position').textContent = `Ln ${line}, Col ${col}`;
}

function updateFileLanguage(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    const languages = {
        'js': 'JavaScript', 'jsx': 'JavaScript React',
        'ts': 'TypeScript', 'tsx': 'TypeScript React',
        'py': 'Python', 'html': 'HTML', 'css': 'CSS',
        'json': 'JSON', 'md': 'Markdown', 'java': 'Java',
        'cpp': 'C++', 'c': 'C', 'rs': 'Rust', 'go': 'Go',
        'rb': 'Ruby'
    };
    document.getElementById('file-language').textContent = languages[ext] || 'Plain Text';
}

function refreshFileTree() {
    if (currentProject) {
        loadFileTree(currentProject);
    }
}

// Agent and Model Functions
async function loadModelConfig() {
    try {
        modelConfig = await ipcRenderer.invoke('get-model-config');
        updateModelUI();
    } catch (error) {
        console.error('Failed to load model config:', error);
    }
}

function updateModelUI() {
    if (modelConfig) {
        document.getElementById('api-key').value = modelConfig.apiKey || '';
        document.getElementById('base-url').value = modelConfig.baseUrl || '';
        document.getElementById('model-name').value = modelConfig.modelName || '';
        document.getElementById('local-model-path').value = modelConfig.localModelPath || '';
        document.getElementById('agent-server-url').value = modelConfig.agentServerUrl || '';
        document.getElementById('model-type').value = modelConfig.type || 'openai';
        
        document.getElementById('model-status').textContent = `Model: ${modelConfig.modelName || 'None'}`;
    }
}

function handleModelTypeChange() {
    const modelType = document.getElementById('model-type').value;
    updateConfigModalForModelType(modelType);
}

function updateConfigModalForModelType(modelType) {
    const preset = MODEL_PRESETS[modelType];
    if (preset) {
        document.getElementById('base-url').value = preset.baseUrl;
        document.getElementById('api-endpoint').value = preset.endpoint;
        document.getElementById('model-name').placeholder = `Ex: ${preset.defaultModel}`;
        
        // Update hints
        const baseUrlHint = document.getElementById('base-url-hint');
        const endpointHint = document.getElementById('endpoint-hint');
        if (baseUrlHint) {
            baseUrlHint.textContent = getDefaultUrlHint(modelType);
        }
        if (endpointHint) {
            endpointHint.textContent = getEndpointHint(modelType);
        }
    }
}

function getDefaultUrlHint(modelType) {
    const hints = {
        openai: 'OpenAI API base URL',
        anthropic: 'Anthropic API base URL',
        gemini: 'Google Gemini API base URL',
        qwen: 'Alibaba DashScope API base URL',
        ollama: 'http://localhost:11434',
        lmstudio: 'http://localhost:1234/v1',
        vllm: 'http://localhost:8000/v1',
        custom: 'Enter your custom API base URL'
    };
    return hints[modelType] || '';
}

function getEndpointHint(modelType) {
    const hints = {
        openai: '/v1/chat/completions',
        anthropic: '/v1/messages',
        gemini: '/models/gemini-pro:generateContent',
        qwen: '/services/aigc/text-generation/generation',
        ollama: '/api/generate or /v1/chat/completions',
        lmstudio: '/v1/chat/completions',
        vllm: '/v1/chat/completions',
        custom: 'Enter your API endpoint path'
    };
    return hints[modelType] || '';
}

function showConfigModal() {
    configModal.classList.add('active');
    // Initialize with current model type settings
    const currentModelType = document.getElementById('model-type-config').value;
    updateConfigModalForModelType(currentModelType);
}

function hideConfigModal() {
    configModal.classList.remove('active');
}

async function saveModelConfig() {
    const config = {
        type: document.getElementById('model-type-config').value,
        apiKey: document.getElementById('api-key').value,
        baseUrl: document.getElementById('base-url').value,
        endpoint: document.getElementById('api-endpoint').value,
        modelName: document.getElementById('model-name').value,
        localModelPath: document.getElementById('local-model-path').value,
        agentServerUrl: document.getElementById('agent-server-url').value,
        fileEncoding: document.getElementById('file-encoding')?.value || 'utf-8',
        autoFormat: document.getElementById('auto-format')?.value === 'true',
        lineEndings: document.getElementById('line-endings')?.value || 'lf',
        tabSize: parseInt(document.getElementById('tab-size')?.value) || 4
    };
    
    // Save encoding settings
    fileEncoding = config.fileEncoding;
    autoFormat = config.autoFormat;
    lineEndings = config.lineEndings;
    tabSize = config.tabSize;
    
    try {
        await ipcRenderer.invoke('save-model-config', config);
        modelConfig = config;
        updateModelUI();
        hideConfigModal();
        
        // Connect to agent server if URL provided
        if (config.agentServerUrl) {
            connectToAgentServer(config.agentServerUrl);
        }
    } catch (error) {
        showError('Failed to save configuration: ' + error.message);
    }
}

async function connectToAgentServer(url) {
    try {
        const result = await ipcRenderer.invoke('connect-agent-server', url);
        if (result.success) {
            isConnectedToAgent = true;
            document.getElementById('agent-status').textContent = 'Agent: Connected';
            document.getElementById('connection-status').className = 'status-indicator connected';
            addChatMessage('system', 'Connected to agent server');
        } else {
            showError('Failed to connect to agent server: ' + result.error);
        }
    } catch (error) {
        showError('Failed to connect to agent server: ' + error.message);
    }
}

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    addChatMessage('user', message);
    chatInput.value = '';
    
    if (!isConnectedToAgent) {
        addChatMessage('system', 'Not connected to agent server. Please configure and connect first.');
        return;
    }
    
    try {
        // Prepare context from open files
        const context = {
            message: message,
            files: openFiles.map(f => ({
                name: f.name,
                content: f.content
            })),
            activeFile: activeFile ? {
                name: activeFile.name,
                content: activeFile.content,
                path: activeFile.path
            } : null,
            modelConfig: modelConfig
        };
        
        await ipcRenderer.invoke('send-to-agent', context);
        addTask('Processing request...', 'running');
    } catch (error) {
        showError('Failed to send message: ' + error.message);
    }
}

function handleAgentMessage(message) {
    // Remove running task
    removeTask('Processing request...');
    
    if (message.type === 'response') {
        addChatMessage('assistant', message.content);
    } else if (message.type === 'file_update') {
        // Handle file updates from agent
        if (message.filePath && message.content) {
            updateFileContent(message.filePath, message.content);
        }
    } else if (message.type === 'task_complete') {
        addTask(message.description, 'completed');
    } else if (message.type === 'error') {
        addChatMessage('system', 'Error: ' + message.error);
        addTask(message.description || 'Task failed', 'failed');
    }
}

async function runAgentTask() {
    const message = chatInput.value.trim() || 'Analyze this project and suggest improvements';
    addChatMessage('user', `[Agent Task] ${message}`);
    chatInput.value = '';
    
    if (!isConnectedToAgent) {
        addChatMessage('system', 'Not connected to agent server.');
        return;
    }
    
    try {
        const context = {
            task: 'agent',
            instruction: message,
            files: openFiles.map(f => ({
                name: f.name,
                content: f.content
            })),
            projectPath: currentProject,
            modelConfig: modelConfig
        };
        
        await ipcRenderer.invoke('send-to-agent', context);
        addTask('Running agent task...', 'running');
    } catch (error) {
        showError('Failed to run agent task: ' + error.message);
    }
}

function addChatMessage(type, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = content;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addTask(description, status) {
    const taskDiv = document.createElement('div');
    taskDiv.className = 'task-item';
    taskDiv.innerHTML = `
        <span class="task-status ${status}"></span>
        <span>${description}</span>
    `;
    taskDiv.dataset.description = description;
    taskList.appendChild(taskDiv);
}

function removeTask(description) {
    const task = Array.from(taskList.children).find(
        t => t.dataset.description === description
    );
    if (task) {
        task.remove();
    }
}

function toggleAgentPanel() {
    const panel = document.getElementById('agent-panel');
    const btn = document.getElementById('toggle-agent-panel');
    
    if (panel.style.width === '0px') {
        panel.style.width = 'var(--agent-panel-width)';
        btn.textContent = '◀';
    } else {
        panel.style.width = '0px';
        btn.textContent = '▶';
    }
}

function updateStatus() {
    // Update connection status indicator
    const indicator = document.getElementById('connection-status');
    if (isConnectedToAgent) {
        indicator.className = 'status-indicator connected';
    } else {
        indicator.className = 'status-indicator disconnected';
    }
}

function showError(message) {
    console.error(message);
    addChatMessage('system', `❌ ${message}`);
}

// File Tree with nested structure
async function loadFileTree(dirPath, parentElement = fileTree, level = 0) {
    try {
        const result = await ipcRenderer.invoke('list-directory', dirPath);
        if (result.success) {
            renderFileTree(result.items, dirPath, parentElement);
        }
    } catch (error) {
        showError('Failed to load file tree: ' + error.message);
    }
}

function renderFileTree(items, parentPath = '', container = fileTree) {
    container.innerHTML = '';
    
    items.forEach(item => {
        const fileElement = document.createElement('div');
        fileElement.className = `file-item ${item.isDirectory ? 'folder-item collapsed' : ''}`;
        fileElement.innerHTML = `\n            <span class="file-icon">${item.isDirectory ? '📁' : getFileIcon(item.name)}</span>\n            <span>${item.name}</span>\n        `;
        
        fileElement.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (item.isDirectory) {
                const isExpanded = fileElement.classList.contains('expanded');
                if (isExpanded) {
                    fileElement.classList.remove('expanded');
                    fileElement.classList.add('collapsed');
                    const childTree = fileElement.querySelector('.file-tree');
                    if (childTree) childTree.remove();
                } else {
                    fileElement.classList.remove('collapsed');
                    fileElement.classList.add('expanded');
                    const childTreeContainer = document.createElement('div');
                    childTreeContainer.className = 'file-tree';
                    childTreeContainer.innerHTML = '<div class="empty-state">Loading...</div>';
                    fileElement.appendChild(childTreeContainer);
                    await loadFileTree(item.path, childTreeContainer);
                }
            } else {
                openFile(item.path);
            }
        });
        
        container.appendChild(fileElement);
    });
}

async function createNewFolder() {
    if (!currentProject) {
        showError('Please open a folder first');
        return;
    }
    
    const folderName = prompt('Enter folder name:');
    if (folderName) {
        const folderPath = `${currentProject}/${folderName}`;
        const result = await ipcRenderer.invoke('create-folder', folderPath);
        if (result.success) {
            await loadFileTree(currentProject);
        } else {
            showError('Failed to create folder: ' + result.error);
        }
    }
}

// GitHub Functions
function showGithubModal() {
    if (githubModal) githubModal.classList.add('active');
}

function hideGithubModal() {
    if (githubModal) githubModal.classList.remove('active');
}

async function connectGithub() {
    const token = document.getElementById('gh-token').value;
    const repo = document.getElementById('gh-repo').value;
    const branch = document.getElementById('gh-branch').value;
    const statusDiv = document.getElementById('github-status');
    
    if (!token || !repo) {
        statusDiv.className = 'github-status error';
        statusDiv.textContent = 'Token and repository are required';
        return;
    }
    
    statusDiv.className = 'github-status loading';
    statusDiv.textContent = 'Connecting...';
    
    try {
        githubConfig = { token, repo, branch };
        await ipcRenderer.invoke('save-github-config', githubConfig);
        
        const githubSection = document.getElementById('github-section');
        const repoName = document.getElementById('github-repo-name');
        if (githubSection && repoName) {
            githubSection.style.display = 'block';
            repoName.textContent = repo;
        }
        
        statusDiv.className = 'github-status success';
        statusDiv.textContent = 'Connected successfully!';
        hideGithubModal();
    } catch (error) {
        statusDiv.className = 'github-status error';
        statusDiv.textContent = 'Connection failed: ' + error.message;
    }
}

async function disconnectGithub() {
    githubConfig = null;
    await ipcRenderer.invoke('save-github-config', null);
    
    const githubSection = document.getElementById('github-section');
    if (githubSection) githubSection.style.display = 'none';
    
    hideGithubModal();
}

async function gitPull() {
    if (!githubConfig) {
        showError('GitHub not configured');
        return;
    }
    
    try {
        const result = await ipcRenderer.invoke('git-pull', githubConfig);
        if (result.success) {
            addChatMessage('system', '✅ Git pull successful: ' + result.message);
            await loadFileTree(currentProject);
        } else {
            showError('Git pull failed: ' + result.error);
        }
    } catch (error) {
        showError('Git pull error: ' + error.message);
    }
}

async function gitPush() {
    if (!githubConfig) {
        showError('GitHub not configured');
        return;
    }
    
    const commitMessage = prompt('Enter commit message:');
    if (!commitMessage) return;
    
    try {
        const result = await ipcRenderer.invoke('git-push', { ...githubConfig, commitMessage });
        if (result.success) {
            addChatMessage('system', '✅ Git push successful: ' + result.message);
        } else {
            showError('Git push failed: ' + result.error);
        }
    } catch (error) {
        showError('Git push error: ' + error.message);
    }
}

// File Attachment Functions
function showAttachFileModal() {
    if (fileAttachModal) fileAttachModal.classList.add('active');
    renderAttachedFilesList();
}

function hideAttachFileModal() {
    if (fileAttachModal) fileAttachModal.classList.remove('active');
}

function triggerFileInput() {
    document.getElementById('file-input').click();
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    addFilesToAttach(files);
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    const dropZone = document.getElementById('file-drop-zone');
    if (dropZone) dropZone.classList.add('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const dropZone = document.getElementById('file-drop-zone');
    if (dropZone) dropZone.classList.remove('drag-over');
    
    const files = Array.from(e.dataTransfer.files);
    addFilesToAttach(files);
}

function addFilesToAttach(files) {
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            attachedFiles.push({
                name: file.name,
                content: e.target.result,
                type: file.type
            });
            renderAttachedFilesList();
        };
        reader.readAsText(file);
    });
}

function renderAttachedFilesList() {
    if (!attachedFilesList) return;
    
    attachedFilesList.innerHTML = '';
    attachedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'attached-file-item';
        item.innerHTML = `\n            <span>📄 ${file.name}</span>\n            <span class="remove-file" onclick="removeAttachedFile(${index})">×</span>\n        `;
        attachedFilesList.appendChild(item);
    });
}

function removeAttachedFile(index) {
    attachedFiles.splice(index, 1);
    renderAttachedFilesList();
}

async function confirmAttachFiles() {
    renderAttachedFilesInChat();
    hideAttachFileModal();
}

function renderAttachedFilesInChat() {
    if (!attachedFilesContainer) return;
    
    attachedFilesContainer.innerHTML = '';
    attachedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'attached-file-item';
        item.innerHTML = `\n            <span>📄 ${file.name}</span>\n            <span class="remove-file" onclick="removeAttachedFileFromChat(${index})">×</span>\n        `;
        attachedFilesContainer.appendChild(item);
    });
}

function removeAttachedFileFromChat(index) {
    attachedFiles.splice(index, 1);
    renderAttachedFilesInChat();
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentFile();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        console.log('Quick file search');
    }
});

// Initialize on load
init();
