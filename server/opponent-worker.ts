import { parentPort, workerData } from 'node:worker_threads';
import { decide } from '../src/opponent/policy.ts';
import { installNavigation } from '../src/opponent/geography.ts';
if (workerData.navigation) installNavigation(workerData.navigation);
parentPort!.postMessage(decide(workerData.observation, workerData.difficulty, workerData.seed));
