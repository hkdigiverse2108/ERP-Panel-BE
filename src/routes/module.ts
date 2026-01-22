import { Router } from 'express';
import { moduleController } from "../controllers";

const router = Router()

router.post("/add", moduleController.add_module)
router.put("/edit", moduleController.edit_module_by_id)
router.delete("/:id", moduleController.delete_module_by_id)
router.get("/all", moduleController.get_all_module)
router.get("/:id", moduleController.get_by_id_module)
router.put("/bulk/edit", moduleController.bulk_edit_permissions_by_module)
router.get("/user/permissions", moduleController.get_users_permissions_by_moduleId)

export const moduleRoute = router;
