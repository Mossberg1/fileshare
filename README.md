# P2P File Share
A simple peer-to-peer file transfer application using WebRTC and Socket.IO.
Files are transfered directly between users. The server is only used to create the session between the users. 
Support for TURN server will be added later. 

## Features
- Create a direct private session
- Invite via url
- P2P file transfer
- Turn server (later)

## Stack
- Frontend: React + TypeScript
- Backend: Express + Socket.IO

## Setup
```bash
$ cd frontend
$ npm install
$ cd ..

$ cd backend
$ npm install
$ cd ..

$ chmod +x run.sh
$ ./run.sh
```

## License
Open source (MIT)
