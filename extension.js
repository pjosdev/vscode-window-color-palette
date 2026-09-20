const vscode = require('vscode');

const COLORS = [
  { name: 'Rose', value: '#C2185B' },
  { name: 'Pink', value: '#D81B60' },
  { name: 'Violet', value: '#7B1FA2' },
  { name: 'Indigo', value: '#3949AB' },
  { name: 'Blue', value: '#1976D2' },
  { name: 'Cyan', value: '#00838F' },
  { name: 'Teal', value: '#00796B' },
  { name: 'Green', value: '#388E3C' },
  { name: 'Lime', value: '#7A8F00' },
  { name: 'Amber', value: '#B26A00' },
  { name: 'Orange', value: '#D45A00' },
  { name: 'Red', value: '#C62828' },
  { name: 'Slate', value: '#455A64' }
];

const MANAGED_KEYS = [
  'titleBar.activeBackground',
  'titleBar.activeForeground',
  'titleBar.inactiveBackground',
  'titleBar.inactiveForeground',
  'activityBar.background',
  'activityBar.foreground',
  'activityBar.inactiveForeground',
  'statusBar.background',
  'statusBar.foreground',
  'statusBarItem.hoverBackground',
  'statusBarItem.remoteBackground',
  'statusBarItem.remoteForeground'
];

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('windowColorPalette.pick', showPalette),
    vscode.commands.registerCommand('windowColorPalette.autoAssign', autoAssign),
    vscode.commands.registerCommand('windowColorPalette.reset', resetAccent)
  );
}

async function showPalette() {
  if (!hasWorkspace()) return;

  const panel = vscode.window.createWebviewPanel(
    'windowColorPalette',
    'Choose Window Color',
    vscode.ViewColumn.Active,
    { enableScripts: true, retainContextWhenHidden: false }
  );

  panel.webview.html = paletteHtml(panel.webview);
  panel.webview.onDidReceiveMessage(async ({ type, value }) => {
    if (type === 'choose' && COLORS.some((color) => color.value === value)) {
      await applyAccent(value);
      panel.dispose();
    }
    if (type === 'auto') {
      await autoAssign();
      panel.dispose();
    }
    if (type === 'reset') {
      await resetAccent();
      panel.dispose();
    }
  });
}

async function autoAssign() {
  if (!hasWorkspace()) return;
  const identity = vscode.workspace.workspaceFile?.toString()
    || vscode.workspace.workspaceFolders.map((folder) => folder.uri.toString()).join('|');
  const index = stableHash(identity) % COLORS.length;
  await applyAccent(COLORS[index].value);
}

async function applyAccent(hex) {
  const config = vscode.workspace.getConfiguration('workbench');
  const current = config.inspect('colorCustomizations')?.workspaceValue || {};
  const foreground = readableForeground(hex);
  const mutedForeground = foreground === '#FFFFFFCC' ? '#FFFFFF99' : '#00000099';
  const next = {
    ...current,
    'titleBar.activeBackground': hex,
    'titleBar.activeForeground': foreground,
    'titleBar.inactiveBackground': `${hex}B8`,
    'titleBar.inactiveForeground': mutedForeground,
    'activityBar.background': darken(hex, 0.78),
    'activityBar.foreground': foreground,
    'activityBar.inactiveForeground': mutedForeground,
    'statusBar.background': hex,
    'statusBar.foreground': foreground,
    'statusBarItem.hoverBackground': lighten(hex, 1.18),
    'statusBarItem.remoteBackground': darken(hex, 0.72),
    'statusBarItem.remoteForeground': foreground
  };
  await config.update('colorCustomizations', next, vscode.ConfigurationTarget.Workspace);
  const color = COLORS.find((entry) => entry.value === hex);
  vscode.window.setStatusBarMessage(`Window accent: ${color?.name || hex}`, 2500);
}

async function resetAccent() {
  if (!hasWorkspace()) return;
  const config = vscode.workspace.getConfiguration('workbench');
  const current = config.inspect('colorCustomizations')?.workspaceValue || {};
  const next = { ...current };
  for (const key of MANAGED_KEYS) delete next[key];
  await config.update(
    'colorCustomizations',
    Object.keys(next).length ? next : undefined,
    vscode.ConfigurationTarget.Workspace
  );
  vscode.window.setStatusBarMessage('Window accent reset', 2500);
}

function hasWorkspace() {
  if (vscode.workspace.workspaceFile || vscode.workspace.workspaceFolders?.length) return true;
  vscode.window.showInformationMessage('Open a folder or workspace first so this color only affects that project.');
  return false;
}

function stableHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function parseHex(hex) {
  return [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16));
}

function readableForeground(hex) {
  const [r, g, b] = parseHex(hex).map((value) => value / 255);
  const linear = [r, g, b].map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return luminance > 0.36 ? '#000000CC' : '#FFFFFFCC';
}

function scale(hex, factor) {
  return `#${parseHex(hex).map((value) => Math.max(0, Math.min(255, Math.round(value * factor))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function darken(hex, factor) { return scale(hex, factor); }
function lighten(hex, factor) { return scale(hex, factor); }

function paletteHtml(webview) {
  const nonce = String(Date.now());
  const swatches = COLORS.map(({ name, value }) => `
    <button class="swatch" data-color="${value}" aria-label="Choose ${name}">
      <span class="color" style="background:${value}"></span>
      <span>${name}</span>
    </button>`).join('');
  return `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <style>
      body { padding: 28px; color: var(--vscode-foreground); background: var(--vscode-editor-background); font-family: var(--vscode-font-family); }
      h1 { font-size: 22px; margin: 0 0 6px; }
      p { color: var(--vscode-descriptionForeground); margin: 0 0 22px; }
      .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(116px,1fr)); gap:12px; max-width:760px; }
      .swatch { border:1px solid var(--vscode-widget-border); border-radius:8px; padding:8px; background:var(--vscode-button-secondaryBackground); color:var(--vscode-button-secondaryForeground); cursor:pointer; text-align:left; }
      .swatch:hover, .swatch:focus { outline:2px solid var(--vscode-focusBorder); outline-offset:2px; }
      .color { display:block; height:54px; border-radius:5px; margin-bottom:8px; box-shadow:inset 0 0 0 1px #ffffff26; }
      .actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:24px; }
      .actions button { border:0; padding:8px 13px; border-radius:3px; cursor:pointer; color:var(--vscode-button-foreground); background:var(--vscode-button-background); }
      .actions .secondary { color:var(--vscode-button-secondaryForeground); background:var(--vscode-button-secondaryBackground); }
    </style>
  </head>
  <body>
    <h1>Choose this project's window color</h1>
    <p>The accent is stored in this workspace. Your editor theme and code colors stay unchanged.</p>
    <div class="grid">${swatches}</div>
    <div class="actions">
      <button id="auto">Pick from project name</button>
      <button id="reset" class="secondary">Reset</button>
    </div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      document.querySelectorAll('[data-color]').forEach((button) => button.addEventListener('click', () => vscode.postMessage({ type:'choose', value:button.dataset.color })));
      document.getElementById('auto').addEventListener('click', () => vscode.postMessage({ type:'auto' }));
      document.getElementById('reset').addEventListener('click', () => vscode.postMessage({ type:'reset' }));
    </script>
  </body>
  </html>`;
}

function deactivate() {}

module.exports = { activate, deactivate };
