const vscode = require('vscode');

let timerInterval;
let remainingSeconds;
let statusBarItem;
let isWorkSession = true;
const WORK_DURATION = 25 * 60; // 25 minutes
const BREAK_DURATION = 5 * 60;  // 5 minutes

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.text = `$(clock) Ready for Pomodoro`;
    statusBarItem.show();

    let startCommand = vscode.commands.registerCommand('pomodoro.start', () => {
        startPomodoro(context);
    });

    let stopCommand = vscode.commands.registerCommand('pomodoro.stop', () => {
        stopPomodoro();
    });

    let resetCommand = vscode.commands.registerCommand('pomodoro.reset', () => {
        resetPomodoro(context);
    });

    context.subscriptions.push(startCommand, stopCommand, resetCommand, statusBarItem);

}

function startPomodoro(context) {
    clearInterval(timerInterval);
    isWorkSession = true;
    startSession(context);
}

function startSession(context) {
    remainingSeconds = isWorkSession ? WORK_DURATION : BREAK_DURATION;
    updateStatusBar();

    timerInterval = setInterval(() => {
        remainingSeconds--;
        updateStatusBar();

        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);

            if (isWorkSession) {
                showWebview(context, '🍅 Pomodoro Complete!', 'Take a 5-minute break and relax.');
            } else {
                showWebview(context, '✅ Break Over!', 'Time to focus for 25 minutes.');
            }

            // Switch mode and start next session
            isWorkSession = !isWorkSession;
            setTimeout(() => startSession(context), 5000); // 3s delay before next session
        }
    }, 1000);
}

function showWebview(context, title, message) {
    const panel = vscode.window.createWebviewPanel(
        'pomodoroAlert',
        title,
        vscode.ViewColumn.One,
        { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')] }
    );

    const audioPath = vscode.Uri.joinPath(context.extensionUri, 'media', 'pomo.wav');

    const audioUri = panel.webview.asWebviewUri(audioPath);
    panel.webview.html = getWebviewContent(title, message, audioUri);

    setTimeout(() => panel.dispose(), 5000);
}

function getWebviewContent(title, message, audioUri) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {
                    font-family: sans-serif;
                    text-align: center;
                    padding: 50px;
                    background: #1e1e1e;
                    color: white;
                    animation: fadeIn 1s ease-in-out;
                }
                h1 { font-size: 3em; }
                p { font-size: 1.5em; margin-top: 10px; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            </style>
        </head>
        <body>
            <audio autoplay>
                <source src="${audioUri}" type="audio/wav" />
            </audio>
            <h1>${title}</h1>
            <p>${message}</p>
        </body>
        </html>
    `;
}


function updateStatusBar() {
    let minutes = Math.floor(remainingSeconds / 60);
    let seconds = remainingSeconds % 60;
    const mode = isWorkSession ? 'Work' : 'Break';
    statusBarItem.text = `$(clock) ${mode}: ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function stopPomodoro() {
    clearInterval(timerInterval);
    statusBarItem.text = `$(debug-pause) Pomodoro stopped`;
}


function resetPomodoro(context) {
    clearInterval(timerInterval);

    remainingSeconds = isWorkSession ? WORK_DURATION : BREAK_DURATION;
    updateStatusBar();

    // Show reset notification in a webview
    const mode = isWorkSession ? "Work Session" : "Break Session";
    showWebview(
        context,
        "⏱ Timer Reset",
        `The ${mode} timer has been reset to ${Math.floor(remainingSeconds / 60)} minutes.`
    );

    startSession(context); // Start again from beginning

}


function deactivate() {
    clearInterval(timerInterval);
}

module.exports = {
    activate,
    deactivate
};
