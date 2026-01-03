import express from "express";
import { uomController } from "../controllers";

const router = express.Router();

router.get("/all", uomController.getAllUOM);
router.get("/dropdown", uomController.getUOMDropdown);

export const uomRouter = router;

