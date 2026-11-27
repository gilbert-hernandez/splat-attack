// A `npm run sim` worker thread: plays the matches it's given and sends back their records.
import { parentPort, workerData } from 'node:worker_threads';
import { playMatch } from './simMatch.js';

const { jobs, maxTicks } = workerData;
parentPort.postMessage(jobs.map((job) => playMatch(job, maxTicks)));
