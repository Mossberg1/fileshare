import { Socket, Server } from "socket.io";
import { v4 as uuidv4 } from 'uuid';

export class Session {
    private _sessionId: string;
    private _clients: Set<string>;

    constructor(sessionId: string) {
        this._sessionId = sessionId;
        this._clients = new Set();
    }

    public addClient(clientId: string): boolean {
        if (this.isFull()) {
            return false;
        }

        this._clients.add(clientId);
        return true;
    }

    public removeClient(clientId: string) {
        this._clients.delete(clientId);
    }

    public isFull(): boolean {
        return this._clients.size >= 2;
    }

    public getClients(): string[] {
        return Array.from(this._clients);
    }
}

export class SessionTable {
    private _sessions = new Map<string, Session>();

    public newEntry(socketId: string): string {
        const sessionId = uuidv4();

        const session = new Session(sessionId);
        session.addClient(socketId);
        this._sessions.set(sessionId, session);

        return sessionId;
    }

    public get(sessionId: string): Session | undefined {
        return this._sessions.get(sessionId);
    }

    public add(sessionId: string, socketId: string): boolean {
        const session = this._sessions.get(sessionId);
        if (!session) {
            return false;
        }

        return session.addClient(socketId);
    }

    public remove(socketId: string): string | null {
        for (const [id, session] of this._sessions) {
            if (session.getClients().includes(socketId)) {
                session.removeClient(socketId);
                if (session.getClients().length === 0) {
                    this._sessions.delete(id);
                }
                return id;
            }
        }

        return null;
    }
}

export const sessionTable = new SessionTable(); 

export class SessionHandler { 
    private _socket: Socket;
    private _io: Server;

    constructor(socket: Socket, io: Server) {
        this._socket = socket;
        this._io = io;
    }

    public register(): void {
        this.startSession();
        this.joinSession();
        this.handleDisconnect();
    }

    public startSession(): void {
        this._socket.on('start-session', () => {
            const sessionId = sessionTable.newEntry(this._socket.id);

            this._socket.join(sessionId);
            this._socket.emit('session-created', { sessionId });

            console.log(`User has started session: ${sessionId}`);
        });
    }

    public joinSession(): void {
        this._socket.on('join-session', (sessionId: string) => {
            const success = sessionTable.add(sessionId, this._socket.id);
            if (!success) {
                this._socket.emit('session-notfound-or-full');
                return;
            }

            this._socket.join(sessionId);
            this._socket.emit('session-joined', { sessionId });

            const session = sessionTable.get(sessionId);
            if (session?.isFull()) {
                const initiator = session.getClients().find(
                    client => client !== this._socket.id
                );
                if (initiator) {
                    this._io.to(initiator).emit('initiate-webrtc-offer', {
                        peerId: this._socket.id
                    });
                }
            }

            console.log(`User has joined session: ${sessionId}`);
        });
    }

    private handleDisconnect(): void {
        this._socket.on('disconnect', () => {
            const sessionId = sessionTable.remove(this._socket.id);
            if (sessionId) {
                this._socket.to(sessionId).emit('peer-disconnected');
            }

            console.log(`User disconnected: ${this._socket.id}`);
        });
    }
}