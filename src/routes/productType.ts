import express from "express";
import { productTypeController } from "../controllers";

const router = express.Router();

router.post("/add", productTypeController.addProductType);
router.put("/edit", productTypeController.editProductType);
router.delete("/:id", productTypeController.deleteProductType);
router.get("/all", productTypeController.getAllProductType);
router.get("/dropdown", productTypeController.getProductTypeDropdown);
router.get("/:id", productTypeController.getProductTypeById);

export const productTypeRouter = router;
