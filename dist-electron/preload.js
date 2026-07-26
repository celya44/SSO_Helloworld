"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose safe API to renderer process
electron_1.contextBridge.exposeInMainWorld('electron', {
    send: (channel, data) => {
        electron_1.ipcRenderer.send(channel, data);
    },
    receive: (channel, func) => {
        electron_1.ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    invoke: (channel, data) => {
        return electron_1.ipcRenderer.invoke(channel, data);
    },
});
//# sourceMappingURL=preload.js.map