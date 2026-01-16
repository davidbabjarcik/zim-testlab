const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// ✅ userData – funguje v .exe aj vo VS
const DATA_DIR = path.join(app.getPath('userData'), 'data');

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const defaults = {
    'history.json': [],
    'wrong.json': [],
    'favorites.json': [],
    'questions.json': []
  };

  for (const file in defaults) {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(
        filePath,
        JSON.stringify(defaults[file], null, 2),
        'utf-8'
      );
    }
  }
}

function createWindow() {
  ensureDataFiles();

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
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error('LOAD ERROR:', err);
    return null;
  }
});

ipcMain.handle('save-json', async (event, { file, data }) => {
  try {
    const filePath = path.join(DATA_DIR, file);
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
