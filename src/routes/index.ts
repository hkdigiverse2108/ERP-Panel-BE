import { Router } from "express";
import { userJwt } from "../helper";
import { announcementRouter } from "./announcement";
import { authRoute } from "./auth";
import { branchRouter } from "./branch";
import { callRequestRouter } from "./callRequest";
import { companyRouter } from "./company";
import { contactRouter } from "./contacts";
import { employeeRouter } from "./employee";
import { productRouter } from "./product";
import { roleRoute } from "./role";
import { uploadRoute } from "./upload";
import { userRoute } from "./user";
import { recipeRouter } from "./recipe";
import { brandRouter } from "./brand";
import { categoryRouter } from "./category";

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
router.use("/contacts", contactRouter);
router.use("/call-request", callRequestRouter);
router.use("/recipe", recipeRouter);
router.use("/brand", brandRouter);
router.use("/category", categoryRouter);

router.use("/upload", userJwt, uploadRoute);

export { router };

