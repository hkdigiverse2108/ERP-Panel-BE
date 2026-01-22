import express from "express";
import { accountController } from "../controllers";
import { superAdminJwt } from "../helper";

const router = express.Router();

router.get("/all", accountController.getAllAccount);
router.get("/dropdown", accountController.getAccountDropdown);
router.get("/:id", accountController.getOneAccount);

router.use(superAdminJwt);

router.post("/add", accountController.addAccount);
router.put("/edit", accountController.editAccount);
router.delete("/:id", accountController.deleteAccount);

export const accountRouter = router;
