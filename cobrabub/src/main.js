const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    titleBarStyle: 'hiddenInset',
    frame: true
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers for file operations
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Code Files', extensions: ['js', 'py', 'ts', 'tsx', 'jsx', 'html', 'css', 'json', 'md'] }
    ]
  });
  return result.filePaths;
});

ipcMain.handle('open-directory-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('list-directory', async (event, dirPath) => {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const result = items.map(item => ({
      name: item.name,
      isDirectory: item.isDirectory(),
      path: path.join(dirPath, item.name)
    }));
    return { success: true, items: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-file-as', async (event, defaultPath, content) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultPath,
    filters: [
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  
  if (!result.canceled && result.filePath) {
    try {
      fs.writeFileSync(result.filePath, content, 'utf-8');
      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, canceled: true };
});

// Model configuration storage
let modelConfig = {
  type: 'openai',
  apiKey: '',
  baseUrl: '',
  modelName: 'gpt-4',
  localModelPath: ''
};

ipcMain.handle('save-model-config', async (event, config) => {
  modelConfig = { ...modelConfig, ...config };
  return { success: true };
});

ipcMain.handle('get-model-config', async () => {
  return modelConfig;
});

// Agent server communication
const WebSocket = require('ws');
let agentWs = null;

ipcMain.handle('connect-agent-server', async (event, url) => {
  try {
    if (agentWs) {
      agentWs.close();
    }
    
    agentWs = new WebSocket(url);
    
    return new Promise((resolve) => {
      agentWs.on('open', () => {
        resolve({ success: true, message: 'Connected to agent server' });
      });
      
      agentWs.on('error', (error) => {
        resolve({ success: false, error: error.message });
      });
      
      setTimeout(() => {
        if (!agentWs || agentWs.readyState !== WebSocket.OPEN) {
          resolve({ success: false, error: 'Connection timeout' });
        }
      }, 5000);
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('send-to-agent', async (event, message) => {
  if (agentWs && agentWs.readyState === WebSocket.OPEN) {
    agentWs.send(JSON.stringify(message));
    return { success: true };
  }
  return { success: false, error: 'Not connected to agent server' };
});

if (agentWs) {
  agentWs.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      mainWindow.webContents.send('agent-message', message);
    } catch (error) {
      console.error('Error parsing agent message:', error);
    }
  });
}
