// TEMPORARY test script: asks a running Feishin instance to play a radio station by name
// via the remote WebSocket server. Delete when done.
//
// Usage:
//   node test-radio-play.mjs
//   node test-radio-play.mjs "Radio Paradise Mellow Mix" ws://localhost:4333
//   REMOTE_USER=... REMOTE_PASSWORD=... node test-radio-play.mjs
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { WebSocket } = require('ws');

const name = process.argv[2] ?? 'Radio Paradise Mellow Mix';
const url = process.argv[3] ?? 'ws://localhost:4333';
const user = process.env.REMOTE_USER ?? '';
const password = process.env.REMOTE_PASSWORD ?? '';

const ws = new WebSocket(url);

ws.on('open', () => {
    console.log(`connected to ${url}`);

    const send = (event) => {
        console.log('->', JSON.stringify(event));
        ws.send(JSON.stringify(event));
    };

    if (user || password) {
        const header = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
        send({ event: 'authenticate', header });
    }

    send({ event: 'play-radio', name });

    // The server sends no reply for play-radio, so give it a moment to act, then close.
    setTimeout(() => {
        console.log('done, closing');
        ws.close();
    }, 1000);
});

ws.on('message', (data) => {
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
