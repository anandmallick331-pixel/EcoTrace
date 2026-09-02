const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');

// Find virtualenv Python executable or system fallback
const candidatePythons = [
  path.join(backendDir, '.venv', 'Scripts', 'python.exe'),
  path.join(backendDir, '.venv', 'bin', 'python'),
  path.join(backendDir, 'venv', 'Scripts', 'python.exe'),
  path.join(backendDir, 'venv', 'bin', 'python'),
  path.join(rootDir, '.venv', 'Scripts', 'python.exe'),
  path.join(rootDir, '.venv', 'bin', 'python'),
  'python3',
  'python'
];

let pythonCmd = 'python';
for (const candidate of candidatePythons) {
  if ((candidate.startsWith('python') && !candidate.includes(path.sep)) || fs.existsSync(candidate)) {
    pythonCmd = candidate;
    break;
  }
}

console.log(`[backend] Starting FastAPI backend using Python binary: ${pythonCmd}`);

const proc = spawn(pythonCmd, ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000', '--reload'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: false
});

proc.on('exit', (code) => {
  process.exit(code || 0);
});
