import express from "express";
import { brandController } from "../controllers";
import { superAdminJwt } from "../helper";

const router = express.Router();

router.get("/all", brandController.getAllBrand);
router.get("/dropdown", brandController.getBrandDropdown);
router.get("/tree/all", brandController.getBrandTree);
router.get("/:id", brandController.getBrandById);

router.use(superAdminJwt);

router.post("/add", brandController.addBrand);
router.put("/edit", brandController.editBrandById);
router.delete("/:id", brandController.deleteBrandById);

export const brandRouter = router;
