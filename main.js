// Arquivo: main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,  // Permite usar APIs do Node.js no frontend (renderer)
            contextIsolation: false // Recomendável manter true e usar preload script por segurança
                                    // mas false pode ser mais fácil para iniciar com código Node existente no frontend
        }
    });

    // Em desenvolvimento, carregue a URL do servidor de desenvolvimento do React.
    // Em produção, carregue o arquivo index.html do build do React.
    const startURL = process.env.ELECTRON_START_URL || url.format({
        pathname: path.join(__dirname, 'build/index.html'), // Caminho para o build do seu React
        protocol: 'file:',
        slashes: true
    });

    mainWindow.loadURL(startURL);

    // Opcional: Abrir o DevTools.
    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

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