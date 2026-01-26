import { useContext, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { SocketContext } from "../context/SocketContext";

interface FileRequestMessage {
    type: 'file-request';
    name: string;
    size: number;
}

interface FileAcceptMessage {
    type: 'file-accept';
}

interface FileRejectMessage {
    type: 'file-reject';
}

const rtcConf = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

type ControlMessage = FileRequestMessage | FileAcceptMessage | FileRejectMessage;

export const Session: React.FC = () => {
    const { id } = useParams();
    const socket = useContext(SocketContext);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const dataChannel = useRef<RTCDataChannel | null>(null);

    const [messages, setMessages] = useState<string[]>([]);

    const [sendFile, setSendFile] = useState<File | null>(null);
    const sendFileRef = useRef<File | null>(null);
    const [incomingFileRequest, setIncomingFileRequest] = useState<{ name: string, size: number} | null>(null);
    const [receivedChunks, setReceivedChunks] = useState<ArrayBuffer[]>([]);
    const [receivedSize, setReceivedSize] = useState<number>(0);
    const [transferProgress, setTransferProgress] = useState<number>(0);
    const [isReceiving, setIsReceiving] = useState<boolean>(false);

    useEffect(() => { sendFileRef.current = sendFile; }, [sendFile]);

    useEffect(() => {
        if (!socket || !id) {
            return;
        }
    
        const handleDataChannelMessage = (event: MessageEvent) => {
            if (typeof event.data === 'string') {
                try {
                    const msg = JSON.parse(event.data) as ControlMessage;
                    switch (msg.type) {
                        case 'file-request':
                            setMessages(prev => [...prev, `User wants to send file: ${msg.name} (${msg.size} bytes)`]);
                            setIncomingFileRequest({ name: msg.name, size: msg.size });
                            break;
                        case 'file-accept':
                            setMessages(prev => [...prev, 'User accepted. Starting file transfer...']);
                            sendFileInChunks();
                            break;
                        case 'file-reject':
                            setMessages(prev => [...prev, 'User rejected file transfer.']);
                            setSendFile(null);
                            break;
                    }
                }
                catch (ex) {
                    console.error('Failed to parse conrol message', ex);
                }
            }
            else {
                const chunk = event.data as ArrayBuffer;
                setReceivedSize(prevSize => prevSize + chunk.byteLength);
                setReceivedChunks(prevChunks => [...prevChunks, chunk]);
            }
        }

        const setupDataChannel = (dc: RTCDataChannel) => {
            dc.onmessage = handleDataChannelMessage;
            dc.onopen = () => {
                setMessages(prev => [...prev, 'Data channel is open. You can now send files.']);
                console.log('Data channel open.');
            }
            dc.onclose = () => console.log('Data channel closed.');
            dc.binaryType = 'arraybuffer';
            dataChannel.current = dc;
        }

        const createPeerConnection = (): RTCPeerConnection => {
            const pc = new RTCPeerConnection(rtcConf);

            pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
                if (event.candidate) {
                    socket.emit('ice-candidate', {
                        candidate: event.candidate, 
                        sessionId: id
                    });
                }
            }

            pc.ondatachannel = (event: RTCDataChannelEvent) => {
               setupDataChannel(event.channel); 
            }

            peerConnection.current = pc;
            return pc;
        }

        const handleInitiateOffer = async () => {
            console.log('Initiating WebRTC offer');
            const pc = createPeerConnection();

            const dc = pc.createDataChannel('file-channel');
            setupDataChannel(dc);

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit('webrtc-offer', { offer, sessionId: id });
        }

        const handleReceivedOffer = async (offer: RTCSessionDescriptionInit) => {
            console.log('Received WebRTC offer...');
            
            const pc = createPeerConnection();
            await pc.setRemoteDescription(new RTCSessionDescription(offer));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('webrtc-answer', { answer, sessionId: id });
        }

        const handleReceivedAnswer = async (asnwer: RTCSessionDescriptionInit) => {
            console.log('Received WebRTC answer.');
            if (peerConnection.current) {
                await peerConnection.current.setRemoteDescription(new RTCSessionDescription(asnwer));
            }
        }

        const handleNewIceCandidate = async (candidate: RTCIceCandidateInit) => {
            if (peerConnection.current) {
                try {
                    await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
                }
                catch (ex) {
                    console.error('Error adding received ice candidate', ex);
                }
            }            
        }

        socket.on('initiate-webrtc-offer', handleInitiateOffer);
        socket.on('webrtc-offer', handleReceivedOffer);
        socket.on('webrtc-answer', handleReceivedAnswer);
        socket.on('ice-candidate', handleNewIceCandidate);

        return () => {
            socket.off('initiate-webrtc-offer');
            socket.off('webrtc-offer');
            socket.off('webrtc-answer');
            socket.off('ice-candidate');
            peerConnection.current?.close();
        }
    }, [socket, id]);

    // -- Transfer progress --
    useEffect(() => {
        if (isReceiving && incomingFileRequest) {
            const progress = receivedSize / incomingFileRequest.size * 100;
            setTransferProgress(progress);
        }
    }, [receivedSize, isReceiving, incomingFileRequest]);

    // -- Completed file transfer --
    useEffect(() => {
        if (isReceiving && incomingFileRequest && receivedSize === incomingFileRequest.size && receivedSize > 0) {
            setMessages(prev => [...prev, `File "${incomingFileRequest.name} received successfully"`]);

            const fileblob = new Blob(receivedChunks);
            const url = URL.createObjectURL(fileblob);
            const a = document.createElement('a');
            a.href = url;
            a.download = incomingFileRequest.name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            setReceivedChunks([]);
            setReceivedSize(0);
            setTransferProgress(0);
            setIncomingFileRequest(null);
            setIsReceiving(false);
        }
    }, [receivedSize, incomingFileRequest, receivedChunks, isReceiving]);

    // -- Funcitons to handle files --
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSendFile(file);
        }
    };

    const requestFileTransfer = () => {
        if (sendFile && dataChannel.current && dataChannel.current.readyState === 'open') {
            const message: FileRequestMessage = {
                type: 'file-request',
                name: sendFile.name,
                size: sendFile.size
            };
            dataChannel.current.send(JSON.stringify(message));
            setMessages(prev => [...prev, `You: Requested to send file: ${sendFile.name}`]);
        }  
    }

    const sendFileInChunks = async () => {
        const file = sendFileRef.current;
        if(!file || !dataChannel.current)
            return;

        const dc = dataChannel.current;
        const chunkSize = 16384;
        let offset = 0;

        while (offset < file.size) {
            const slice = file.slice(offset, offset + chunkSize);
            const buffer = await slice.arrayBuffer();
            dc.send(buffer);
            offset += chunkSize;
        }

        setMessages(prev => [...prev, `You: Finished sending ${file.name}`]);
        setSendFile(null);
    };

    /*
    const sendFileInChunks = () => {
        if (!sendFile || !dataChannel.current)
            return;

        const dc = dataChannel.current;
        const chunkSize = 16384;
        let offset = 0;

        const reader = new FileReader();

        reader.onload = function(e) {
            if (!e.target?.result)
                return;

            const chunk = e.target.result as ArrayBuffer;
            dc.send(chunk);
            offset += chunk.byteLength;

            if (offset < sendFile.size) {
                readSlice(offset);
            }
            else {
                setMessages(prev => [...prev, `You: Finished sending ${sendFile.name}`]);
                setSendFile(null);
            }
        };

        const readSlice = (o: number) => {
            const slice = sendFile.slice(o, o + chunkSize);
            reader.readAsArrayBuffer(slice);
        };

        readSlice(0);
    };
    */

    const handleAccept = () => {
        if (incomingFileRequest && dataChannel.current && dataChannel.current.readyState === 'open') {
            setIsReceiving(true);
            const message: FileAcceptMessage = { type: 'file-accept' };
            dataChannel.current.send(JSON.stringify(message));
            setMessages(prev => [...prev, 'You: Accepted the file transfer']);
        }
    };

    const handleReject = () => {
        if (incomingFileRequest && dataChannel.current && dataChannel.current.readyState === 'open') {
            const message: FileRejectMessage = { type: 'file-reject' };
            dataChannel.current.send(JSON.stringify(message));
            setMessages(prev => [...prev, 'You: Rejected the fil transfer']);
            setIncomingFileRequest(null);
        }
    };

    return (
        <div>
            <h2>File Transfer Session</h2>
            <div style={{ border: '1px solid black', height: '200px', overflowY: 'scroll', marginBottom: '10px', padding: '5px' }}>
                {messages.map((msg, index) => (
                  <div key={index}>{msg}</div>  
                ))}
            </div>

            {/* -- Incoming file request -- */}
            {incomingFileRequest && !isReceiving && (
                <div style={{ border: '1px solid blue', padding: '10px', margin: '10px 0'}}>
                    <p>Incoming file: <strong>{incomingFileRequest.name}</strong> ({(incomingFileRequest.size / 1024).toFixed(2)} KB)</p>
                    <button onClick={handleAccept}>Accept</button>                    
                    <button onClick={handleReject} style={{marginLeft: '10px'}}>Reject</button>
                </div>
            )}

            {/* -- Send file -- */}
            {!incomingFileRequest && (
                <div style={{margin: '10px 0'}}>
                    <input type="file" onChange={handleFileSelect} disabled={!!sendFile} />
                    <button onClick={requestFileTransfer} disabled={!sendFile} style={{marginLeft: '10px'}}>Send File</button>
                    {sendFile && <p>Selected file: {sendFile.name}</p>}
                </div>
            )}

            {/* -- Progress Bar -- */}
            {isReceiving && (
                <div style={{margin: '10px 0'}}>
                    <p>Receiving {incomingFileRequest?.name}</p>
                    <progress value={transferProgress} max="100" style={{width:'100%'}}/>
                    <span> {Math.round(transferProgress)}%</span>
                </div>
            )}
       </div>
    );
};
