import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import bodyParser from "body-parser";
import * as packageInfo from "../package.json";
import { connectDb } from "./database/connection";
import { router } from "./routes";
import path from "path";
import { apiResponse, HTTP_STATUS } from "./common";
import { socketServer } from "./helper/socket";
import { initCronJobs } from "./helper";

const app = express();

app.use("/public", express.static(path.join(__dirname, "..", "..", "public")));

app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "100mb" }));
app.use(express.static(path.join(__dirname, "public")));

connectDb();
initCronJobs();

const health = (_, res) => {
  return res.status(200).json({
    message: `Project Name Server is Running, Server health is green`,
    app: packageInfo.name,
    description: packageInfo.description,
    author: packageInfo.author,
    license: packageInfo.license,
  });
};

app.get("/", health);
app.get("/health", health);
app.get("/isServerUp", (_, res) => {
  res.send("Server is running");
});

app.use(router);

app.use((err, req, res, next) => {
  if (err.name === "MulterError") {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, err.message, {}, err));
  }
  if (err) {
    console.error(err);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Internal Server Error", {}, err));
  }
  next();
});

app.use((_, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    status: HTTP_STATUS.NOT_FOUND,
    message: "Project Name Backend API Bad Gateway",
  });
});

let server = new http.Server(app);
export const socket = socketServer(server);

export default server;

