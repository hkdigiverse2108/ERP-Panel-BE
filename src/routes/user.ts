import express from "express";
import { userController } from "../controllers";
import { adminJwt } from "../helper";

const router = express.Router();

router.use(adminJwt);

router.get("/all", userController.getAllUser);
router.get("/dropdown", userController.getUserDropDown);
router.post("/add", userController.addUser);
router.put("/edit", userController.editUserById);
router.delete("/:id", userController.deleteUserById);
router.get("/:id", userController.getUserById);

// super admin can modify the admin permission
router.put("/:id/permission", userController.superAdminOverridePermissions);
export const userRouter = router;
