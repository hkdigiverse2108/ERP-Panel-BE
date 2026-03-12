import express from "express";
import { salaryController } from "../controllers";

const router = express.Router();

router.post("/add", salaryController.addSalary);
router.get("/all", salaryController.getAllSalary);
router.get("/:id", salaryController.getSalaryById);
router.put("/edit", salaryController.editSalaryById);
router.delete("/:id", salaryController.deleteSalaryById);

export const salaryRouter = router;
