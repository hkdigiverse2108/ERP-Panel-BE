import express from "express";
import { employeeController } from "../controllers";

const router = express.Router();
router.get("/all", employeeController.getAllEmployee);
router.post("/add", employeeController.addEmployee);
router.put("/edit", employeeController.editEmployeeById);
router.delete("/:id", employeeController.deleteEmployeeById);
router.get("/:id", employeeController.getEmployeeById);

export const employeeRouter = router;
