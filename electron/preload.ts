import { contextBridge, ipcRenderer } from 'electron';

// Expose safe API to renderer process
contextBridge.exposeInMainWorld('electron', {
  send: (channel: string, data: any) => {
    ipcRenderer.send(channel, data);
  },
  receive: (channel: string, func: Function) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  },
  invoke: (channel: string, data?: any) => {
    return ipcRenderer.invoke(channel, data);
  },
  // Logger functions
  getLogs: () => {
    return ipcRenderer.invoke('logger:get-logs');
  },
  getLogPath: () => {
    return ipcRenderer.invoke('logger:get-log-path');
  },
  clearLogs: () => {
    return ipcRenderer.invoke('logger:clear-logs');
  },
});
