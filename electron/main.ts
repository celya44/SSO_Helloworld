import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import * as path from 'path';
import { initAuth } from './auth';
import { initLogger, getLogContent, clearLogs, closeLogger, getLogFilePath } from './logger';

const isDev = require('electron-is-dev');

let mainWindow: BrowserWindow | null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', () => {
  // Initialize logger first
  initLogger();
  
  createWindow();
  
  if (mainWindow) {
    initAuth(mainWindow);
  }
  
  // Setup IPC handlers for logging
  setupLoggerHandlers();
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

const template: any[] = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Exit',
        accelerator: 'CmdOrCtrl+Q',
        click: () => {
          app.quit();
        },
      },
    ],
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Toggle Developer Tools',
        accelerator: 'CmdOrCtrl+Shift+I',
        click: () => {
          if (mainWindow) {
            mainWindow.webContents.toggleDevTools();
          }
        },
      },
    ],
  },
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

/**
 * Setup IPC handlers for logger
 */
function setupLoggerHandlers() {
  // Get current log content
  ipcMain.handle('logger:get-logs', async () => {
    return getLogContent();
  });

  // Get log file path
  ipcMain.handle('logger:get-log-path', async () => {
    return getLogFilePath();
  });

  // Clear logs
  ipcMain.handle('logger:clear-logs', async () => {
    try {
      clearLogs();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}

// Handle app quit
app.on('before-quit', () => {
  closeLogger();
});
