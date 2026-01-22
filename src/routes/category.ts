import express from "express";
import { categoryController } from "../controllers";
import { superAdminJwt } from "../helper";

const router = express.Router();

router.get("/all", categoryController.getAllCategory);
router.get("/dropdown", categoryController.getCategoryDropdown);
router.get("/tree/all", categoryController.getCategoryTree);
router.get("/:id", categoryController.getCategoryById);

router.use(superAdminJwt);

router.post("/add", categoryController.addCategory);
router.put("/edit", categoryController.editCategoryById);
router.delete("/:id", categoryController.deleteCategoryById);

// get category list wiht their sub-category in tree structure

export const categoryRouter = router;
