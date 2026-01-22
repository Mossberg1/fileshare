import { useContext, useState } from "react";
import { SessionContext } from "../context/SessionContext";

export const Home: React.FC = () => {
    const socket = useContext(SessionContext);
    const [sessionId, setSessionId] = useState<string>("");

    if (!socket) {
        throw new Error();
    }

    const startSession = () => {
        socket.emit("start-session");
    };

    const joinSession = () => {
        socket.emit("join-session", sessionId);
    };

    return (
        <div>
            <button onClick={startSession}>Start session</button>
            <input 
                type="text"
                placeholder="Session Id"
                value={sessionId}
                onChange={e => setSessionId(e.target.value)}
            />
            <button onClick={joinSession}>Join session</button>
        </div>
    );
};
