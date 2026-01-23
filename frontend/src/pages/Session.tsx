import { useContext, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { SocketContext } from "../context/SocketContext";

const rtcConf = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export const Session: React.FC = () => {
    const { id } = useParams();
    const socket = useContext(SocketContext);
    const peerConnection = useRef<RTCPeerConnection | null>(null);
    const dataChannel = useRef<RTCDataChannel | null>(null);

    const [messages, setMessages] = useState<string[]>([]);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (!socket || !id) {
            return;
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
                const dc = event.channel;
                dc.onmessage = (e: MessageEvent) => {
                    setMessages((prev) => [...prev, `Peer: ${e.data}`]);
                }
                dc.onopen = () => console.log('Data channel open');
                
                dataChannel.current = dc;
            }

            peerConnection.current = pc;
            return pc;
        }

        const handleInitiateOffer = async () => {
            console.log('Initiating WebRTC offer');
            const pc = createPeerConnection();

            const dc = pc.createDataChannel('file-channel');
            dc.onmessage = (e: MessageEvent) => {
                setMessages((prev) => [...prev, `Peer: ${e.data}`]);
            }
            dc.onopen = () => console.log('Data channel open');
            dataChannel.current = dc;

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

    const sendMessage = () => {
        if (dataChannel.current && dataChannel.current.readyState === 'open' && inputValue) {
            dataChannel.current.send(inputValue);
            setMessages((prev) => [...prev, `You: ${inputValue}`]);
            setInputValue('');
        }
    }

    return (
        <div>
            <h2>P2P Chat</h2>
            <div style={{ border: '1px solid black', height: '200px', overflowY: 'scroll', marginBottom: '10px', padding: '5px' }}>
                {messages.map((msg, index) => (
                  <div key={index}>{msg}</div>  
                ))}
            </div>
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            >
            </input>
            <button onClick={sendMessage}>Send</button>
        </div>
    );
};
