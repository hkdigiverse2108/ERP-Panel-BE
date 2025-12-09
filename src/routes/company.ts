import express from "express";
import { companyController } from "../controllers";

const router = express.Router();
router.get("/all", companyController.getAllCompany);
router.post("/add", companyController.addCompany);
router.put("/edit", companyController.editCompanyById);
router.delete("/:id", companyController.deleteCompanyById);
router.get("/:id", companyController.getCompanyById);

export const companyRouter = router;
