import express from "express";
import { categoryController } from "../controllers";

const router = express.Router();

router.get("/all", categoryController.getAllCategory);
router.post("/add", categoryController.addCategory);
router.put("/edit", categoryController.editCategoryById);
router.delete("/:id", categoryController.deleteCategoryById);
router.get("/:id", categoryController.getCategoryById);

// get category list wiht their sub-category in tree structure
router.get("/tree/all", categoryController.getCategoryTree);

export const categoryRouter = router;
