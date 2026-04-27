import { io } from "socket.io-client";
import { API_BASE_URL } from "@/config/api.js";

class NotificationSocketHelper {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect(namespace = "/notifications") {
    if (this.socket && this.connected) {
      return Promise.resolve(this.socket);
    }

    const accessToken = localStorage.getItem("accessToken");
    const baseUrl = API_BASE_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");

    this.socket = io(baseUrl + namespace, {
      transports: ["websocket"],
      auth: { token: accessToken },
    });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Notification socket timeout")), 10000);
      this.socket.on("connect", () => {
        clearTimeout(timeout);
        this.connected = true;
        resolve(this.socket);
      });
      this.socket.on("connect_error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      this.socket.on("disconnect", () => {
        this.connected = false;
      });
    });
  }

  on(event, handler) {
    if (!this.socket) return;
    this.socket.on(event, handler);
  }

  off(event, handler) {
    if (!this.socket) return;
    if (handler) {
      this.socket.off(event, handler);
      return;
    }
    this.socket.off(event);
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket = null;
    this.connected = false;
  }
}

export default new NotificationSocketHelper();
