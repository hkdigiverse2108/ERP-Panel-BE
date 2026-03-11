import express from "express";
import { expenseController } from "../controllers";

const router = express.Router();

router.post("/add", expenseController.addExpense);
router.get("/all", expenseController.getAllExpense);
router.get("/:id", expenseController.getExpenseById);
router.put("/edit", expenseController.editExpenseById);
router.delete("/:id", expenseController.deleteExpenseById);

export const expenseRouter = router;
