# whipthisshit 🔥

![Whip divider](assets/divider.png)

Sometimes Claude Code is going too slow and you must whip him into shape.

Press a hotkey, a whip drops into your hand, flick the mouse, **CRACK**. That's it.
It is **animation and sound only**: it never types into your terminal, never sends
Ctrl‑C, never sends any keystroke. Claude keeps working. You just feel better.

Forked from [OpenWhip](https://github.com/GitFrog1111/OpenWhip), which did send
Ctrl‑C and typed "FASTER" into your terminal. This version removes all of that and
adds global hotkeys, a proper menu bar icon, and a one‑shot installer.

## What you get

| Key / command | Does |
|---|---|
| **⌃⌥⌘1** (Control+Option+Command+1) | Not running → starts the app with the whip already in your hand. Running → whip drops, app quits. |
| **⌃⌥⌘2** (Control+Option+Command+2) | While running: spawn a whip, or drop the one you're holding. |
| Menu bar whip icon | Left‑click: spawn / drop. Right‑click: Whip, Start at login, Quit. |
| `whipthisshit` | From any terminal: start (or spawn the whip if already running). |
| `whipthisshit toggle` | Same as ⌃⌥⌘1. |
| `whipthisshit stop` | Drop the whip and quit. |
| `whipthisshit status` | `running` or `not running`. |

Whip physics: move the mouse fast enough and the tip cracks, playing one of five
whip sounds. Click anywhere to drop it.

## Requirements

- macOS (hotkeys and installer are macOS). Windows and Linux can run it with `npm start`, see below.
- [Node.js](https://nodejs.org) 18 or newer (`node --version`).

## Install (macOS)

```bash
git clone https://github.com/tillwelzel/whipthisshit.git
cd whipthisshit
./install.sh
```

The installer:

1. runs `npm install` (downloads Electron, about 100 MB, once),
2. links the `whipthisshit` command into `~/.local/bin`,
3. installs a macOS Quick Action called **Whip This Shit** into `~/Library/Services`
   and binds it to **⌃⌥⌘1**.

Then press **⌃⌥⌘1**. If a terminal says `command not found: whipthisshit`, open a new
terminal window, or make sure `~/.local/bin` is on your `PATH`:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
```

Safe to re‑run `./install.sh` any time (after pulling updates, moving the folder, etc).

### Optional: always available

Right‑click the whip icon in the menu bar and tick **Start at login**. Then ⌃⌥⌘2 is
always one keypress away and ⌃⌥⌘1 becomes a quit key.

## Uninstall

```bash
cd whipthisshit
./install.sh uninstall     # removes the command and the ⌃⌥⌘1 hotkey
cd .. && rm -rf whipthisshit
```

## Windows / Linux

No installer yet, but the app itself is cross‑platform:

```bash
git clone https://github.com/tillwelzel/whipthisshit.git
cd whipthisshit
npm install
npm start
```

Click the tray icon to spawn the whip, or press **Ctrl+Alt+2** while it runs.
On Linux, `bin/whipthisshit` works too (`start|toggle|stop|status`); bind
`whipthisshit toggle` to a key in your desktop's keyboard settings.

## Troubleshooting

**⌃⌥⌘1 does nothing in one app.** Some apps build their Services menu once at launch.
Quit and reopen that app.

**⌃⌥⌘1 does nothing anywhere.** Open *System Settings → Keyboard → Keyboard Shortcuts
→ Services → General*, make sure **Whip This Shit** is ticked and shows ⌃⌥⌘1. You can
also assign a different key there.

**"Electron failed to install correctly".** Your npm blocked Electron's postinstall.
Run `./install.sh` again; it downloads and extracts the binary itself.

**Another app owns ⌃⌥⌘2.** The app logs a warning and the other controls still work.
Change the key by editing one line at the top of `main.js`:

```js
const WHIP_SHORTCUT = process.platform === 'darwin' ? 'Command+Alt+Control+2' : 'Control+Alt+2';
```

**Change the ⌃⌥⌘1 key.** Edit `key_equivalent` in `install.sh` (`@` Cmd, `~` Option,
`^` Control, `$` Shift) and re‑run it, or change it in System Settings as above.

## How it works

- `main.js`: Electron tray app. Owns the menu bar icon, the ⌃⌥⌘2 global shortcut, and a
  single‑instance lock. A second launch with `--whip` spawns the whip, with `--quit`
  drops it and exits; the shell command uses that to talk to the running app.
- `overlay.html`: transparent, click‑through‑ish full‑screen window with the whip
  physics (verlet rope), crack detection, and sound playback.
- `bin/whipthisshit`: the shell command. Launches via `open` so the app outlives the
  hotkey runner.
- `macos/Whip This Shit.workflow`: Automator Quick Action template that runs
  `whipthisshit toggle`. `install.sh` fills in the path and registers the hotkey.

## Credits

Original whip, physics, sounds and the idea: [GitFrog1111/OpenWhip](https://github.com/GitFrog1111/OpenWhip).
MIT licensed, see [LICENSE](LICENSE).
