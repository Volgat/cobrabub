const { ipcRenderer } = require('electron');

// State management
let currentProject = null;
let openFiles = [];
let activeFile = null;
let modelConfig = null;
let isConnectedToAgent = false;

// DOM Elements
const fileTree = document.getElementById('file-tree');
const codeEditor = document.getElementById('code-editor');
const tabsContainer = document.getElementById('tabs');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const configModal = document.getElementById('config-modal');
const taskList = document.getElementById('task-list');

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
        // Electron window minimize would be handled here
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

    // Modal
    document.getElementById('close-modal').addEventListener('click', hideConfigModal);
    document.getElementById('cancel-config').addEventListener('click', hideConfigModal);
    document.getElementById('save-config').addEventListener('click', saveModelConfig);

    // Model type change
    document.getElementById('model-type').addEventListener('change', handleModelTypeChange);

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
    }
}

async function saveCurrentFile() {
    if (!activeFile) return;
    
    try {
        const result = await ipcRenderer.invoke('write-file', activeFile.path, activeFile.content);
        if (result.success) {
            activeFile.isModified = false;
            renderTabs();
        } else {
            showError('Failed to save file: ' + result.error);
        }
    } catch (error) {
        showError('Failed to save file: ' + error.message);
    }
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
    // Could adjust UI based on model type
}

function showConfigModal() {
    configModal.classList.add('active');
}

function hideConfigModal() {
    configModal.classList.remove('active');
}

async function saveModelConfig() {
    const config = {
        type: document.getElementById('model-type').value,
        apiKey: document.getElementById('api-key').value,
        baseUrl: document.getElementById('base-url').value,
        modelName: document.getElementById('model-name').value,
        localModelPath: document.getElementById('local-model-path').value,
        agentServerUrl: document.getElementById('agent-server-url').value
    };
    
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

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+S / Cmd+S - Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentFile();
    }
    
    // Ctrl+P / Cmd+P - Quick file search (placeholder)
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        console.log('Quick file search');
    }
    
    // Ctrl+` - Toggle terminal (placeholder)
    if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        console.log('Toggle terminal');
    }
});

// Auto-save functionality
setInterval(() => {
    openFiles.forEach(file => {
        if (file.isModified) {
            ipcRenderer.invoke('write-file', file.path, file.content);
            file.isModified = false;
        }
    });
    renderTabs();
}, 30000); // Auto-save every 30 seconds

// Initialize on load
init();
