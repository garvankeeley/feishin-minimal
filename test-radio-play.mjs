// TEMPORARY test script: toggles playback in a running Feishin instance via the remote
// WebSocket server. If something is playing, send pause. Otherwise play the radio station
// by name. Delete when done.
//
// Linux packaging: npx electron-builder --linux AppImage --arm64
//
// Usage:
//   node test-radio-play.mjs
//   node test-radio-play.mjs "Radio Paradise Mellow Mix" ws://localhost:4333
//   REMOTE_USER=... REMOTE_PASSWORD=... node test-radio-play.mjs
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { WebSocket } = require('ws');

const [nameArg, urlArg] = process.argv.slice(2);
const name = nameArg ?? 'Radio Paradise Mellow Mix';
const url = urlArg ?? 'ws://localhost:4333';
const user = process.env.REMOTE_USER ?? 'garvan';
const password = process.env.REMOTE_PASSWORD ?? 'maps';

// How long to wait for the initial state push after connecting.
const STATE_WAIT_MS = 1000;

let playbackStatus; // 'playing' | 'paused' | 'stopped', from 'state' and 'playback'
let radioStatus; // from 'radio-status'

const ws = new WebSocket(url);

const send = (event) => {
    console.log('->', JSON.stringify(event));
    ws.send(JSON.stringify(event));
};

ws.on('open', () => {
    console.log(`connected to ${url}`);

    if (user || password) {
        const header = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
        send({ event: 'authenticate', header });
    }

    // The server pushes 'state' and 'radio-status' after auth. Wait for them, then decide.
    setTimeout(() => {
        const radioPlaying = Boolean(radioStatus?.isActive && radioStatus.isPlaying);
        const somethingPlaying = radioPlaying || playbackStatus === 'playing';
        console.log(
            `status: playback=${playbackStatus ?? 'unknown'} radio=${
                radioStatus?.isActive ? (radioStatus.isPlaying ? 'playing' : 'paused') : 'off'
            }`,
        );

        if (somethingPlaying) {
            send({ event: 'pause' });
        } else {
            send({ event: 'play-radio', name });
        }

        // The server sends no reply for these commands, so give it a moment to act, then close.
        setTimeout(() => {
            console.log('done, closing');
            ws.close();
        }, 1000);
    }, STATE_WAIT_MS);
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.event === 'state') playbackStatus = msg.data.status;
    if (msg.event === 'playback') playbackStatus = msg.data;
    if (msg.event === 'radio-status') radioStatus = msg.data;
    console.log('<-', data.toString().slice(0, 300));
});

ws.on('close', (code, reason) => {
    console.log(`closed ${code} ${reason.toString()}`);
});

ws.on('error', (error) => {
    console.error(`error: ${error.message}`);
    console.error('Is Feishin running with remote control enabled on this port?');
    process.exitCode = 1;
});
