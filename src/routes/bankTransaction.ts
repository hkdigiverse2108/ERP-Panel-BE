import { Router } from "express";
import { bankTransactionController } from "../controllers";

const router = Router();

router.post("/add", bankTransactionController.addBankTransaction);
router.get("/all", bankTransactionController.getBankTransactions);
router.get("/:id", bankTransactionController.getBankTransactionById);
router.put("/update", bankTransactionController.updateBankTransaction);
router.delete("/:id", bankTransactionController.deleteBankTransaction);

export const bankTransactionRouter = router;