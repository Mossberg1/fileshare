import { createContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useNavigate } from "react-router-dom";

export const SocketContext = createContext<Socket | null>(null);

export const SocketProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    const navigate = useNavigate();
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        const s = io("http://localhost:8080");
        setSocket(s);

        s.on("session-created", ({ sessionId }) => {
            navigate(`/session/${sessionId}`);
        });

        s.on("session-joined", ({ sessionId }) => {
            navigate(`/session/${sessionId}`);
        });

        return () => {s.disconnect()};
    }, []);

    if (!socket) {
        return null;
    }

    return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};
