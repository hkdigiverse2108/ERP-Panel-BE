import express from "express";
import { companyController } from "../controllers";

const router = express.Router();
router.get("/", companyController.getCompanyList);
router.post("/add", companyController.addCompany);
router.put("/", companyController.updateCompanyDetails);
router.delete("/:companyId", companyController.deleteCompany);

export const companyRouter = router;
