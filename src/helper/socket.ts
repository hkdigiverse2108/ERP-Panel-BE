import { notificationModel } from "../database/model/notification";
import { countData } from "./databaseServices";
import { Server } from "socket.io";

export const socketServer = (server) => {
  const io = new Server(server, { cors: { origin: "*" } });
  ioEvents(io);
  Io = io;
  return io;
};

export let Io;

const ioEvents = (io) => {
  io.on("connection", (socket) => {
    console.log("A Company connected");

    socket.on("joinRoom", (data) => {
      //   console.log("Company joined room 1", data);
      socket.join(data.roomId);
    });

    socket.on("joinAll", () => {
      //   console.log("Company joined all");
      socket.join("all");
    });

    socket.on("disconnect", () => {
      //   console.log("Company disconnected");
    });
  });
};

export const sendRealTimeUpdate = async (roomId, payload) => {
  let { eventType, data } = payload;
  try {
    // for (let roomId of roomIds) {
    await Io.to(String(roomId)).emit(eventType, data);
    //   console.log(`${eventType} event sent to room ${roomId}`);
    // }
  } catch (error) {
    console.error("Socket Error", error);
  }
};

export const sendNotification = async ({ companyId, branchId, title, message, eventType, meta }) => {
  //   console.log("Sending notification to rooms");
  try {
    const notification = await notificationModel.create({
      companyId,
      branchId,
      title,
      message,
      eventType,
      meta,
    });

    // const targetCompanyIds = [String(companyId)];
    // for (const targetId of targetCompanyIds) {
    const unreadCount = await countData(notificationModel, { branchId: branchId, isRead: false });
    await sendRealTimeUpdate(branchId, { eventType, data: { branchId: branchId, unreadCount, title, message, eventType, meta } });
    // }

    return notification;
  } catch (error) {
    console.error("Socket Error", error);
    return error;
  }
};
