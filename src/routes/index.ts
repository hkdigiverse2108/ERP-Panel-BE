import { Router } from "express";
import { authRoute } from "./auth";
import { userRoute } from "./user";
import { uploadRoute } from "./upload";
import { userJwt } from "../helper";
import { companyRouter } from "./company";
import { announcementRouter } from "./announcement";
import { roleRoute } from "./role";
import { branchRouter } from "./branch";

const router = Router();

router.use("/auth", authRoute);
router.use("/user", userRoute);
router.use("/company", companyRouter);
router.use("/announcement", announcementRouter);
router.use("/branch", branchRouter);
router.use("/role", roleRoute)

router.use("/upload", userJwt, uploadRoute);

export { router };
