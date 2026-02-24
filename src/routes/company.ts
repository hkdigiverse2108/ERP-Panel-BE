import express from "express";
import { companyController } from "../controllers";
import { adminJwt, superAdminJwt } from "../helper";

const router = express.Router();

router.put("/edit", companyController.editCompanyById);
router.use(adminJwt);

router.get("/all", companyController.getAllCompany);
router.get("/dropdown", companyController.getCompanyDropdown);
router.get("/:id", companyController.getCompanyById);

router.use(superAdminJwt);

router.post("/add", companyController.addCompany);
router.delete("/:id", companyController.deleteCompanyById);

export const companyRouter = router;
