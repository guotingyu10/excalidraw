const { app, BrowserWindow, Menu, protocol, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

const isDev = !app.isPackaged;

// 性能优化: 提升 Electron windows 桌面端性能
// 设置最大内存为 16GB (16384 MB)
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=16384');

// 其他性能优化选项
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
// app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('disable-gpu-vsync'); // 禁用 VSync 提升帧率

// 会话存储路径
const getSessionFilePath = () => {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'session.json');
};

// 读取会话状态
const readSession = () => {
  try {
    const sessionPath = getSessionFilePath();
    if (fs.existsSync(sessionPath)) {
      const data = fs.readFileSync(sessionPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    // console.error('[Session] Failed to read session:', error);
  }
  return { lastOpenedFiles: [], lastActiveFile: null };
};

// 保存会话状态
const saveSession = (sessionData) => {
  try {
    const sessionPath = getSessionFilePath();
    const dir = path.dirname(sessionPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2), 'utf-8');
    // console.log('[Session] Saved:', sessionPath);
    return { success: true };
  } catch (error) {
    // console.error('[Session] Failed to save session:', error);
    return { success: false, error: error.message };
  }
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false,
      disableBlinkFeatures: 'CacheStorage',
      hardwareAcceleration: true,
      experimentalFeatures: true,
      backgroundThrottling: false, // 禁用后台节流，提升性能
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
    icon: path.join(__dirname, 'icon.png'),
  });

  // 开发模式
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(`app://./index.html`);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 创建菜单
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '新建',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-drawing');
          }
        },
        {
          label: '打开',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              title: '打开文件',
              filters: [
                { name: 'Excalidraw', extensions: ['excalidraw'] },
                { name: '所有文件', extensions: ['*'] }
              ],
              properties: ['openFile'],
            });
            if (!result.canceled && result.filePaths.length > 0) {
              const filePath = result.filePaths[0];
              const content = fs.readFileSync(filePath, 'utf-8');
              mainWindow.webContents.send('open-drawing', { filePath, content });
            }
          }
        },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('save-drawing');
          }
        },
        {
          label: '另存为',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            mainWindow.webContents.send('save-drawing-as');
          }
        },
        { type: 'separator' },
        {
          label: '导出图片',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('export-image');
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        {
          label: '放大',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            mainWindow.webContents.send('zoom-in');
          }
        },
        {
          label: '缩小',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            mainWindow.webContents.send('zoom-out');
          }
        },
        {
          label: '重置缩放',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow.webContents.send('zoom-reset');
          }
        },
        { type: 'separator' },
        { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' },
        { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            mainWindow.webContents.send('show-about');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// 获取文件大小
ipcMain.handle('get-file-size', async (event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'File not found' };
    }
    const stats = fs.statSync(filePath);
    return {
      success: true,
      size: stats.size,
      lastModified: stats.mtime.getTime(),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 显示保存对话框
ipcMain.handle('show-save-dialog', async (event, options) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: options.title || '保存文件',
      defaultPath: options.defaultPath || 'untitled.excalidraw',
      filters: options.filters || [
        { name: 'Excalidraw', extensions: ['excalidraw'] },
        { name: '所有文件', extensions: ['*'] }
      ],
    });
    return {
      success: !result.canceled,
      filePath: result.filePath,
      canceled: result.canceled,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 显示打开对话框
ipcMain.handle('show-open-dialog', async (event, options) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: options.title || '打开文件',
      filters: options.filters || [
        { name: 'Excalidraw', extensions: ['excalidraw'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile'],
    });
    return {
      success: !result.canceled,
      filePaths: result.filePaths,
      canceled: result.canceled,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 写入文件
ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    fs.writeFileSync(filePath, data, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 读取文件
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 会话管理 IPC
ipcMain.handle('get-session', async () => {
  const session = readSession();
  return { success: true, session };
});

ipcMain.handle('save-session', async (event, sessionData) => {
  return saveSession(sessionData);
});

ipcMain.handle('get-session-path', async () => {
  return { success: true, path: getSessionFilePath() };
});

app.whenReady().then(() => {
  protocol.registerFileProtocol('app', (request, callback) => {
    const url = request.url.replace('app://', '');
    const filePath = path.join(__dirname, url);
    callback(filePath);
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
