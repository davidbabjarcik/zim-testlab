const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

const DATA_DIR = path.join(__dirname, 'public', 'data');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));
}

// ---------- IPC ----------
ipcMain.handle('load-json', async (event, file) => {
  try {
    const filePath = path.join(DATA_DIR, file);
    console.log('[LOAD]', filePath);

    if (!fs.existsSync(filePath)) {
      console.warn('Súbor neexistuje:', filePath);
      return {};
    }

    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error('LOAD ERROR:', err);
    return {};
  }
});

ipcMain.handle('save-json', async (event, { file, data }) => {
  try {
    const filePath = path.join(DATA_DIR, file);
    console.log('[SAVE]', filePath);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('SAVE ERROR:', err);
    return false;
  }
});

// ---------- APP ----------
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
