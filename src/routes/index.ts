import { Router } from "express";
import { adminJwt, superAdminJwt, userJwt } from "../helper";
import { announcementRouter } from "./announcement";
import { authRoute } from "./auth";
import { branchRouter } from "./branch";
import { callRequestRouter } from "./callRequest";
import { companyRouter } from "./company";
import { contactRouter } from "./contacts";
// import { employeeRouter } from "./employee";
import { productRouter } from "./product";
import { employeeRouter } from "./employee";
import { stockRoute } from "./stock";
import { stockVerificationRoute } from "./stockVerification";
import { roleRoute } from "./role";
import { uploadRoute } from "./upload";
import { userRoute } from "./user";
import { recipeRouter } from "./recipe";
import { brandRouter } from "./brand";
import { categoryRouter } from "./category";
import { bankRouter } from "./bank";
import { materialRouter } from "./material";
import { materialConsumptionRouter } from "./materialConsumption";
import { accountGroupRouter } from "./accountGroup";
import { accountRouter } from "./account";
import { paymentTermRouter } from "./paymentTerm";
import { locationRouter } from "./location";
import { uomRouter } from "./uom";
import { taxRouter } from "./tax";
import { purchaseOrderRouter } from "./purchaseOrder";
import { supplierBillRouter } from "./supplierBill";
import { debitNoteRouter } from "./debitNote";
import { estimateRouter } from "./estimate";
import { salesOrderRouter } from "./salesOrder";
import { invoiceRouter } from "./invoice";
import { deliveryChallanRouter } from "./deliveryChallan";
import { creditNoteRouter } from "./creditNote";
import { voucherRouter } from "./voucher";
import { couponRouter } from "./coupon";
import { discountRouter } from "./discount";
import { feedbackRouter } from "./feedback";
import { loyaltyRouter } from "./loyalty";
import { prefixRouter } from "./prefix";
import { posOrderRouter } from "./posOrder";
import { productRequestRouter } from "./productRequest";
import { billOfLiveProductRouter } from "./billOfLiveProduct";
import { moduleRoute } from "./module";
import { permissionRoute } from "./permission";

const router = Router();

router.use("/auth", authRoute);
// router.use(userJwt);
router.use(adminJwt);

router.use("/module", moduleRoute);
router.use("/permission", permissionRoute);
router.use("/upload", adminJwt, uploadRoute);

router.use("/user", userRoute);

router.use("/role", roleRoute);

router.use("/product", productRouter);
router.use("/product-request", productRequestRouter);
router.use("/employee", employeeRouter);
router.use("/call-request", callRequestRouter);
router.use("/stock", stockRoute);
router.use("/stock-verification", stockVerificationRoute);

router.use("/contacts", contactRouter);
router.use("/bank", bankRouter);
router.use("/payment-term", paymentTermRouter);
router.use("/location", locationRouter);
router.use("/uom", uomRouter);
router.use("/tax", taxRouter);
router.use("/purchase-order", purchaseOrderRouter);
router.use("/supplier-bill", supplierBillRouter);
router.use("/debit-note", debitNoteRouter);
router.use("/estimate", estimateRouter);
router.use("/sales-order", salesOrderRouter);
router.use("/invoice", invoiceRouter);
router.use("/delivery-challan", deliveryChallanRouter);
router.use("/credit-note", creditNoteRouter);
router.use("/voucher", voucherRouter);
router.use("/payment", voucherRouter);
router.use("/receipt", voucherRouter);
router.use("/expense", voucherRouter);
router.use("/coupon", couponRouter);
router.use("/discount", discountRouter);
router.use("/feedback", feedbackRouter);
router.use("/loyalty", loyaltyRouter);
router.use("/prefix", prefixRouter);
router.use("/pos-order", posOrderRouter);

router.use("/recipe", recipeRouter);
router.use("/material", materialRouter);
router.use("/material-consumption", materialConsumptionRouter);
router.use("/bill-of-live-product", billOfLiveProductRouter);

// === For Super Admin
router.use("/account-group", accountGroupRouter);
router.use("/account", accountRouter);
router.use("/company", companyRouter);
router.use("/branch", branchRouter);
router.use("/announcement", announcementRouter);
router.use("/brand", brandRouter);
router.use("/category", categoryRouter);
// router.use("/employee", employeeRouter);

export { router };
