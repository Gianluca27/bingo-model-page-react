import { io } from 'socket.io-client';
const socket = io('http://localhost:3001'); // o el puerto que uses
export default socket;