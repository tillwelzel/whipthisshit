const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

// ── Globals ─────────────────────────────────────────────────────────────────
let tray, overlay;
let overlayReady = false;
let spawnQueued = false;

// Global hotkey: spawns the whip from any app; press again to drop it.
// Electron accelerator syntax – change this line to rebind.
const WHIP_SHORTCUT = process.platform === 'darwin' ? 'Command+Alt+Control+2' : 'Control+Alt+2';

function createTrayIconFallback() {
  const p = path.join(__dirname, 'icon', 'Template.png');
  if (fs.existsSync(p)) {
    const img = nativeImage.createFromPath(p);
    if (!img.isEmpty()) {
      if (process.platform === 'darwin') img.setTemplateImage(true);
      return img;
    }
  }
  console.warn('openwhip: icon/Template.png missing or invalid');
  return nativeImage.createEmpty();
}

async function getTrayIcon() {
  const iconDir = path.join(__dirname, 'icon');
  if (process.platform === 'win32') {
    const file = path.join(iconDir, 'icon.ico');
    if (fs.existsSync(file)) {
      const img = nativeImage.createFromPath(file);
      if (!img.isEmpty()) return img;
    }
    return createTrayIconFallback();
  }
  // macOS: menu bar wants a small monochrome template image, not the app icon.
  if (process.platform === 'darwin') return createTrayIconFallback();
  return createTrayIconFallback();
}

// ── Overlay window ──────────────────────────────────────────────────────────
function createOverlay() {
  const { bounds } = screen.getPrimaryDisplay();
  overlay = new BrowserWindow({
    x: bounds.x, y: bounds.y,
    width: bounds.width, height: bounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlayReady = false;
  overlay.loadFile('overlay.html');
  overlay.webContents.on('did-finish-load', () => {
    overlayReady = true;
    if (spawnQueued && overlay && overlay.isVisible()) {
      spawnQueued = false;
      overlay.webContents.send('spawn-whip');
    }
  });
  overlay.on('closed', () => {
    overlay = null;
    overlayReady = false;
    spawnQueued = false;
  });
}

/** Drop the whip if it is out, then quit once it has fallen off screen. */
function gracefulQuit() {
  if (overlay && overlay.isVisible()) {
    overlay.webContents.send('drop-whip');
    setTimeout(() => app.quit(), 900);
  } else {
    app.quit();
  }
}

function toggleOverlay() {
  if (overlay && overlay.isVisible()) {
    overlay.webContents.send('drop-whip');
    return;
  }
  if (!overlay) createOverlay();
  overlay.show();
  if (overlayReady) {
    overlay.webContents.send('spawn-whip');
  } else {
    spawnQueued = true;
  }
}

// ── IPC ─────────────────────────────────────────────────────────────────────
ipcMain.on('hide-overlay', () => { if (overlay) overlay.hide(); });

// ── App lifecycle ───────────────────────────────────────────────────────────
// Only one instance. Launching again while running just spawns/drops the whip.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // `--quit`: drop the whip (animated) and exit. Anything else: toggle whip.
  app.on('second-instance', (_e, argv) => {
    if (argv.includes('--quit')) return gracefulQuit();
    toggleOverlay();
  });

  app.whenReady().then(async () => {
    if (process.platform === 'darwin' && app.dock) app.dock.hide();

    const hotkeyOk = globalShortcut.register(WHIP_SHORTCUT, toggleOverlay);
    if (hotkeyOk) console.log(`global shortcut registered: ${WHIP_SHORTCUT}`);
    else console.warn(`could not register global shortcut ${WHIP_SHORTCUT} (already taken?)`);

    tray = new Tray(await getTrayIcon());
    tray.setToolTip(`OpenWhip – click or ${WHIP_SHORTCUT} for whip`);
    const menu = Menu.buildFromTemplate([
      { label: `Whip  (${WHIP_SHORTCUT})`, click: toggleOverlay },
      { type: 'separator' },
      {
        label: 'Start at login',
        type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        click: item => app.setLoginItemSettings({ openAtLogin: item.checked }),
      },
      { type: 'separator' },
      { label: 'Quit', click: gracefulQuit },
    ]);
    // NOTE: do not use tray.setContextMenu – on macOS that makes a left click
    // open the menu and the 'click' event never fires.
    tray.on('click', toggleOverlay);
    tray.on('right-click', () => tray.popUpContextMenu(menu));

    // `--whip`: launched by the hotkey, so put the whip in hand straight away.
    if (process.argv.includes('--whip')) toggleOverlay();
  });

  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', e => e.preventDefault()); // keep alive in tray
}
