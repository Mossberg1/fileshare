import React, { useContext, useEffect } from "react";
import logo from "./logo.svg";
import "./App.css";
import socketIO from "socket.io-client";
import { SessionContext } from "./context/SessionContext";


function App() {
    const socket = useContext(SessionContext);
    if (!socket) {
      throw new Error();
    }

    const startSession = () => {
      socket.emit("start-session");
    };

    const joinSession = () => {
      socket.emit("join-session");
    };

    return (
        <div>
            <button onClick={startSession}>Start session</button>
            <button onClick={joinSession}>Join session</button>
        </div>
    );
}

export default App;
