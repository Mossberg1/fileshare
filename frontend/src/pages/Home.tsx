import { useContext, useState } from "react";
import { SocketContext } from "../context/SocketContext";
import { Container, Card, CardContent, Stack, Box, Typography, Button, Divider, TextField } from "@mui/material";

export const Home: React.FC = () => {
    const socket = useContext(SocketContext);
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
        <Container maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
            <Card variant="outlined" sx={{ width: '100%' }}>
                <CardContent>
                    <Stack spacing={3}>
                        <Box textAlign="center">
                            <Typography variant="h5" component="div" gutterBottom>
                                FileShare
                            </Typography>
                        </Box>

                        <Button 
                            variant="contained" 
                            size="large" 
                            onClick={startSession}
                            fullWidth
                        >
                            Start New Session
                        </Button>

                        <Divider>OR JOIN</Divider>

                        <Stack direction="row" spacing={1}>
                            <TextField 
                                label="Session ID" 
                                variant="outlined" 
                                size="small"
                                fullWidth
                                value={sessionId}
                                onChange={(e) => setSessionId(e.target.value)}
                            />
                            <Button variant="outlined" onClick={joinSession}>
                                Join
                            </Button>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>
        </Container>
    );
};
