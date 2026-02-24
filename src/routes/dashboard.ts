import express from "express";
import { dashboardController } from "../controllers";

const router = express.Router();

router.get("/transactions", dashboardController.transactionDetails);
router.get("/top-customers", dashboardController.topCustomers);
router.get("/category-wise-customers", dashboardController.categoryWiseCustomers);

export const dashboardRouter = router;
