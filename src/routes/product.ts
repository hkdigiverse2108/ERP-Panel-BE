import { Router } from "express";
import multer from "multer";
import { productController } from "../controllers";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// router.use(adminJwt);
router.get("/all", productController.getAllProduct);
router.post("/detect", upload.array('images', 10), productController.detectProduct);
router.get("/dropdown", productController.getProductDropdown);
router.post("/add", productController.addProduct);
router.post("/bulk-add", upload.single("file"), productController.bulkAddProduct);
router.put("/edit", productController.editProduct);
router.get("/barcode/:code", productController.getByBarcode);
router.delete("/:id", productController.deleteProduct);
router.get("/:id", productController.getOneProduct);

export const productRouter = router;
