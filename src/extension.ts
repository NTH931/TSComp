import * as vscode from 'vscode';
import { exec, ExecException } from 'child_process';
import { Console } from 'console';

let lastCompileTime: number = 0;
let isCompiling: boolean = false;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {

  const config = vscode.workspace.getConfiguration('typescriptCompiler');
  const tsconfLocation = config.get<string>('tsconfig');
  const compileOnSave = config.get<boolean>('compileOnSave');

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  // Register a save event listener for .ts files
  context.subscriptions.push(
    vscode.commands.registerCommand("typescriptCompiler.compile", () => {
      const now = Date.now();

      if (isCompiling) {
        vscode.window.showWarningMessage('Compilation is already in progress. Please wait.');
        return; // Block execution if compiling
      }

      if (now - lastCompileTime > 3000) {
        compileTypeScript(tsconfLocation);
        isCompiling = false;
      } else {
        vscode.window.showWarningMessage('Please wait until compiled before compiling again.');
      }
    })
  );

  // if compileOnSave is enabled
  if (compileOnSave) {
    context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (document.languageId === 'typescript') {
          const now = Date.now();

          if (isCompiling) {
            vscode.window.showWarningMessage('Compilation is already in progress. Please wait.');
            return; // Block execution if compiling
          }

          if (now - lastCompileTime > 3000) {
            compileTypeScript(tsconfLocation);
          } else {
            vscode.window.showWarningMessage('Please wait until the previous compilation finishes.');
          }
        }
      })
    );
  }
}

function compileTypeScript(tsconfLocation?: string | undefined) {
  isCompiling = true;
  lastCompileTime = Date.now();

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found.');
    return;
  }

  const now = Date.now();
  const command = `npx tsc -p ${tsconfLocation || 'tsconfig.json'}`;

  statusBarItem.text = '$(sync~spin) Compiling TypeScript...';
  statusBarItem.show();

  exec(command, { cwd: workspaceFolder.uri.fsPath }, (err: ExecException | null, stdout: string, stderr: string) => {
    statusBarItem.hide();
    const outOrErr: string = stderr || stdout;
    isCompiling = false;

    if (outOrErr) {
      // If there are any errors in stderr, display them
      vscode.window.showErrorMessage(`TypeScript compilation errors:\n${outOrErr}`, "Show Output")
      .then(() => {

      });
      console.error(outOrErr);
    } else if (err) {
      // Show general errors from the exec call
      vscode.window.showErrorMessage(`Error: ${err.message}`);
    } else {
      vscode.window.showInformationMessage("TypeScript compiled successfully.");
      return;
    }
  });
}

export function deactivate() {
  statusBarItem.dispose(); // Clean up the status bar item
}
