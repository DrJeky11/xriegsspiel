import { execFileSync } from 'node:child_process';

const adb = (...args) => execFileSync('adb', args, { encoding: 'utf8' }).trim();
const devices = adb('devices').split('\n').slice(1).map(line => line.trim().split(/\s+/)).filter(([, status]) => status === 'device');
const serial = process.env.QUEST_SERIAL || (devices.length === 1 ? devices[0][0] : '');
if (!serial) {
  console.error('Connect one authorized Quest over USB, or set QUEST_SERIAL to choose a device.');
  process.exit(1);
}
const model = adb('-s', serial, 'shell', 'getprop', 'ro.product.model');
if (!model.includes('Quest')) throw new Error(`Selected device is ${model}, not a Quest.`);
const port = Number(process.env.PORT || 5173);
const path = process.env.QUEST_PATH || '/pacific.html';
if (!Number.isInteger(port) || port < 1024 || port > 65535 || !path.startsWith('/') || path.startsWith('//')) throw new Error('Use a valid local PORT and an absolute application QUEST_PATH.');
const response = await fetch(`http://127.0.0.1:${port}/api/maps/state?map=hormuz`).catch(() => null);
if (!response?.ok) throw new Error('Start the map workspaces with npm run dev or npm start before opening it on Quest.');
adb('-s', serial, 'reverse', `tcp:${port}`, `tcp:${port}`);
const url = `http://localhost:${port}${path}`;
adb('-s', serial, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url, '-p', 'com.oculus.browser');
console.log(`${model}: USB forwarding configured and Browser launch requested. Put on the headset, open ${url} if needed, and choose Enter VR or Enter MR. Keep USB connected.`);
