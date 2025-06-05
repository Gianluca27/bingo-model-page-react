import React from "react";
import socket from "./socket"; // importa el socket único

const SocketContext = React.createContext(socket);
export default SocketContext;
