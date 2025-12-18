import { Router } from "express";
import { recipeController } from "../controllers";
const router = Router();

router.get("/all", recipeController.getAllRecipe);
router.post("/add", recipeController.addRecipe);
router.put("/edit", recipeController.editRecipeById);
router.delete("/:id", recipeController.deleteRecipeById);
router.get("/:id", recipeController.getRecipeById);

router.get("/:id/product_of_material/", recipeController.getRecipeForBOM);

export const recipeRouter = router;
