import express from "express";
import { companyController } from "../controllers";
import { adminJwt } from "../helper";

const router = express.Router();

router.use(adminJwt);

router.get("/all", companyController.getAllCompany);
router.post("/add", companyController.addCompany);
router.put("/edit", companyController.editCompanyById);
router.delete("/:id", companyController.deleteCompanyById);
router.get("/:id", companyController.getCompanyById);

export const companyRouter = router;
