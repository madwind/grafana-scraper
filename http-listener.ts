import type {Server} from 'node:http';
import {lstat, unlink} from 'node:fs/promises';
import {createConnection} from 'node:net';
import {isAbsolute} from 'node:path';

async function removeStaleSocket(socketPath: string): Promise<void> {
    let stat;
    try {
        stat = await lstat(socketPath);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
        throw error;
    }
    if (!stat.isSocket()) {
        throw new Error(`Refusing to replace a non-socket file: ${socketPath}`);
    }

    await new Promise<void>((resolve, reject) => {
        const probe = createConnection(socketPath);
        probe.once('connect', () => {
            probe.destroy();
            reject(new Error(`Socket is already in use: ${socketPath}`));
        });
        probe.once('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'ECONNREFUSED' || error.code === 'ENOENT') resolve();
            else reject(error);
        });
        probe.setTimeout(1000, () => {
            probe.destroy();
            reject(new Error(`Timed out checking socket: ${socketPath}`));
        });
    });
    try {
        await unlink(socketPath);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
}

export async function listenHttpServer(server: Server, socketPath: string): Promise<void> {
    if (!isAbsolute(socketPath)) {
        throw new Error('HTTP_SOCKET must be an absolute path');
    }
    await removeStaleSocket(socketPath);
    await new Promise<void>((resolve, reject) => {
        const onError = (error: Error) => reject(error);
        server.once('error', onError);
        server.listen({path: socketPath, readableAll: true, writableAll: true}, () => {
            server.off('error', onError);
            resolve();
        });
    });
}
