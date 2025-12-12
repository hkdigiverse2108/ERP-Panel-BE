import { Router } from "express";
import { authRoute } from "./auth";
import { userRoute } from "./user";
import { uploadRoute } from "./upload";
import { userJwt } from "../helper";
import { companyRouter } from "./company";
import { announcementRouter } from "./announcement";
import { roleRoute } from "./role";
import { branchRouter } from "./branch";
import { productRouter } from "./product";
import { employeeRouter } from "./employee";
import { callRequestRouter } from "./callRequest";

const router = Router();

router.use("/auth", authRoute);
router.use(userJwt);
router.use("/user", userRoute);
router.use("/company", companyRouter);
router.use("/announcement", announcementRouter);

router.use("/branch", branchRouter);
router.use("/role", roleRoute);
router.use("/product", productRouter);
router.use("/employee", employeeRouter);
router.use("/call-request", callRequestRouter);

router.use("/upload", userJwt, uploadRoute);

export { router };
