import express from "express";
import { couponController } from "../controllers";

const router = express.Router();

router.get("/all", couponController.getAllCoupon);
router.get("/dropdown", couponController.getCouponDropdown);
router.post("/add", couponController.addCoupon);
router.post("/apply", couponController.applyCoupon);
router.post("/remove", couponController.removeCoupon);
router.put("/edit", couponController.editCoupon);
router.delete("/:id", couponController.deleteCoupon);
router.get("/:id", couponController.getOneCoupon);

export const couponRouter = router;
