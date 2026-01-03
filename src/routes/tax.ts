import express from "express";
import { taxController } from "../controllers";

const router = express.Router();

router.get("/all", taxController.getAllTax);
router.get("/dropdown", taxController.getTaxDropdown);

export const taxRouter = router;

