import { Router } from "express";
import { AuthRoute } from "./auth";
import { userRoute } from "./user";
import { uploadRoute } from "./upload";
import { userJwt } from "../helper";

const router = Router();

router.use("/auth", AuthRoute);
router.use("/user", userRoute);

router.use("/upload", userJwt, uploadRoute);


export { router };
