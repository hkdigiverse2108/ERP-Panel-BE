import { Router } from 'express';
import { permissionController } from "../controllers";

const router = Router();

router.post("/edit", permissionController.edit_permission_by_id)
router.get("/details", permissionController.get_permission_by_userId)

export const permissionRoute = router