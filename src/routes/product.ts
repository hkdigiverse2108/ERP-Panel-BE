import { Router } from "express";
import { productController } from "../controllers";

const router = Router();

// router.use(adminJwt);
router.get("/all", productController.getAllProduct);
router.post("/add", productController.addProduct);
router.post("/edit", productController.editProduct);
router.delete("/:id", productController.deleteProduct);
router.get("/:id", productController.getOneProduct);

export const productRouter = router;
