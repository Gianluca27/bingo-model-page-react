import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import socket from "./services/socket";
import SocketContext from "./services/SocketContext";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <SocketContext.Provider value={socket}>
    <App />
  </SocketContext.Provider>
);
