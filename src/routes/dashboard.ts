import express from "express";
import { dashboardController } from "../controllers";

const router = express.Router();

router.get("/transactions", dashboardController.transactionDetails);
router.get("/top-customers", dashboardController.topCustomers);
router.get("/category-wise-customers", dashboardController.categoryWiseCustomers);
router.get("/best-selling-products", dashboardController.bestSellingProducts);
router.get("/least-selling-products", dashboardController.leastSellingProducts);

export const dashboardRouter = router;
