# Window Color Palette

Give each VS Code project window a distinct accent without changing the editor's syntax theme.

## Use it

- Press `Ctrl+Alt+Shift+C` (`Cmd+Option+Shift+C` on macOS) to open the visual swatch picker.
- Or open the Command Palette and run **Window Colors: Choose Accent**.
- Run **Window Colors: Assign from Project** for a deterministic color based on the workspace path.
- Run **Window Colors: Reset Accent** to remove only the colors managed by this extension.

The extension updates workspace-level `workbench.colorCustomizations`, so the color returns whenever you reopen that project. It preserves unrelated color customizations.

## Try it locally

1. Open this folder in VS Code.
2. Press `F5` to launch an Extension Development Host.
3. In the new window, open a project folder.
4. Press the shortcut and choose a swatch.

## Install a packaged build

With the VS Code extension packaging tool available, run:

```sh
npx @vscode/vsce package
```

Then run **Extensions: Install from VSIX...** in VS Code and select the generated file.

## Limitation

VS Code does not expose a reliable API for enumerating all open windows or styling a window independently of settings. Automatic assignment therefore derives a stable color from the current project rather than trying to track live instances. Empty windows are intentionally left unchanged because user-level color settings would affect other windows.
