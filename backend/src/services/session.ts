import { Socket } from "socket.io";
import { v4 as uuidv4 } from 'uuid';

export class SessionHandler {
    private _socket: Socket;

    constructor(socket: Socket) {
        this._socket = socket;
    }

    public joinSession(): void {
        this._socket.on('join-session', (sessionId: string) => {
            this._socket.join(sessionId);
            this._socket.emit('session-joined', { sessionId });
            console.log(`User has joined a session: ${sessionId}`);
        });
    }

    public startSession(): void {
        this._socket.on('start-session', () => {
            const sessionId = uuidv4();
            this._socket.join(sessionId);
            this._socket.emit('session-created', { sessionId }); // TODO: Send the url for joining the session to hide sessionId
            console.log(`User has started a session: ${sessionId}`);
        });
    }
}