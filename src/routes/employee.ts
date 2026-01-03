import express from "express";
import { employeeController } from "../controllers";

const router = express.Router();
router.get("/all", employeeController.getAllEmployee);
router.get("/dropdown", employeeController.getEmployeeDropdown);
router.post("/add", employeeController.addEmployee);
router.put("/edit", employeeController.editEmployeeById);
router.delete("/:id", employeeController.deleteEmployeeById);
router.get("/:id", employeeController.getEmployeeById);


// update the permission for the specific users or employee under the admin
router.put("/:id/permission", employeeController.updateEmployeePermissions);
export const employeeRouter = router;