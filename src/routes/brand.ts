import express from "express";
import { brandController } from "../controllers";

const router = express.Router();

router.get("/all", brandController.getAllBrand);
router.get("/dropdown", brandController.getBrandDropdown);
router.post("/add", brandController.addBrand);
router.put("/edit", brandController.editBrandById);
router.delete("/:id", brandController.deleteBrandById);
router.get("/:id", brandController.getBrandById);
router.get("/tree/all", brandController.getBrandTree);



export const brandRouter = router;
