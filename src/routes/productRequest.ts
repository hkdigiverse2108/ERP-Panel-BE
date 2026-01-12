import { Router } from "express";
import { productController, productRequestController } from "../controllers";

const router = Router();

// router.use(adminJwt);
router.get("/all", productRequestController.getAllProductRequest);
router.post("/add", productRequestController.addProductRequest);
router.put("/edit", productRequestController.editProductRequest);
router.delete("/:id", productRequestController.deleteProductRequest);
router.get("/:id", productRequestController.getOneProductRequest);

export const productRequestRouter = router;
