import express from "express";
import { dashboardController } from "../controllers";

const router = express.Router();

router.get("/transactions", dashboardController.transactionDetails);
router.get("/top-customers", dashboardController.topCustomers);
router.get("/category-wise-customers", dashboardController.categoryWiseCustomers);
router.get("/category-wise-customers-count", dashboardController.categoryWiseCustomersCount);
router.get("/best-selling-products", dashboardController.bestSellingProducts);
router.get("/least-selling-products", dashboardController.leastSellingProducts);
router.get("/top-expenses", dashboardController.topExpenses);
router.get("/top-coupons", dashboardController.topCoupons);
router.get("/receivable", dashboardController.receivable);
router.get("/payable", dashboardController.payable);
router.get("/sales-and-purchase-graph", dashboardController.salesAndPurchaseGraph);
router.get("/transaction-graph", dashboardController.transactionGraph);

export const dashboardRouter = router;
