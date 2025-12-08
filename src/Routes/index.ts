import { Router } from "express";
import { AuthRoute } from "./auth";
import { userRoute } from "./user";
import { uploadRoute } from "./upload";
import { userJwt } from "../helper";
import { companyRouter } from "./company";
import { announcementRouter } from "./announcement";

const router = Router();

router.use("/auth", AuthRoute);
router.use("/user", userRoute);
router.use("/company", companyRouter);
router.use("/announcement", announcementRouter);
router.use("/upload", userJwt, uploadRoute);

export { router };
