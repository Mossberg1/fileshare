import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { SocketProvider } from "./context/SocketContext";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { Session } from "./pages/Session";
import {
    Box,
    createTheme,
    CssBaseline,
    IconButton,
    ThemeProvider,
} from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";

const RootApp = () => {
    const [mode, setMode] = useState<"light" | "dark">("dark");

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,

                    ...(mode === "light"
                        ? {
                              background: {
                                  default: "#f5f5f5",
                                  paper: "#ffffff",
                              },
                          }
                        : {
                              background: {
                                  default: "#121212",
                                  paper: "#1e1e1e",
                              },
                          }),
                },
            }),
        [mode],
    );

    const toggleColorMode = () => {
        setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />

            <Box sx={{ position: "absolute", top: 16, right: 16 }}>
                <IconButton
                    sx={{ ml: 1 }}
                    onClick={toggleColorMode}
                    color="inherit"
                >
                    {mode === "dark" ? (
                        <Brightness7Icon />
                    ) : (
                        <Brightness4Icon />
                    )}
                </IconButton>
            </Box>

            <React.StrictMode>
                <BrowserRouter>
                    <SocketProvider>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="session/:id" element={<Session />} />
                        </Routes>
                    </SocketProvider>
                </BrowserRouter>
            </React.StrictMode>
        </ThemeProvider>
    );
};

const root = ReactDOM.createRoot(
    document.getElementById("root") as HTMLElement,
);
root.render(<RootApp />);

reportWebVitals();
