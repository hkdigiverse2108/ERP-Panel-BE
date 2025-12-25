import { Router } from "express";
import { roleController } from "../controllers";
import { userJwt } from "../helper";

const router = Router();

// router.use(userJwt);
router.get("/all", roleController.getAllRole);
router.post("/add", roleController.addRole);
router.put("/edit", roleController.editRole);
router.get("/:id", roleController.getRoleById);
router.delete("/:id", roleController.deleteRole);

export const roleRoute = router;
