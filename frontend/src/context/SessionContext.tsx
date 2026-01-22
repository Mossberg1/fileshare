import { createContext, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { useNavigate } from "react-router-dom";

export const SessionContext = createContext<Socket | null>(null);
const socket = io("http://localhost:8080");

export const SessionProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
    const navigate = useNavigate();

    useEffect(() => {
        socket.on("session-created", ({ sessionId }) => {
            navigate(`/session/${sessionId}`);
        });

        socket.on("session-joined", ({ sessionId }) => {
            navigate(`/session/${sessionId}`);
        });
    }, []);

    return <SessionContext.Provider value={socket}>{children}</SessionContext.Provider>;
};
