import express from "express";
import { userController } from "../controllers";
import { adminJwt } from "../helper";

const router = express.Router();

// router.use(adminJwt);
router.get("/all", userController.getAllUser);
router.post("/add", userController.addUser);
router.put("/edit", userController.editUserById);
router.delete("/:id", userController.deleteUserById);
router.get("/:id", userController.getUserById);

export const userRoute = router;
