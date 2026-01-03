import express from "express";
import { accountController } from "../controllers";

const router = express.Router();

router.get("/all", accountController.getAllAccount);
router.get("/dropdown", accountController.getAccountDropdown);
router.post("/add", accountController.addAccount);
router.put("/edit", accountController.editAccount);
router.delete("/:id", accountController.deleteAccount);
router.get("/:id", accountController.getOneAccount);

export const accountRouter = router;

