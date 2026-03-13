import { CronJob } from "cron";
import { couponModel, discountModel } from "../database";
import { COUPON_STATUS, DISCOUNT_STATUS } from "../common";

export const deactivateExpiredCoupons = async () => {
    try {
        const now = new Date();

        // 1. Coupons expired by endDate
        await couponModel.updateMany(
            {
                isDeleted: false,
                isActive: true,
                status: COUPON_STATUS.ACTIVE,
                endDate: { $lte: now },
            },
            {
                $set: { isActive: false, status: COUPON_STATUS.EXPIRED },
            }
        );

        // 2. Coupons expired by expiryDays (calculated from createdAt)
        const couponsWithExpiryDays = await couponModel.find({
            isDeleted: false,
            isActive: true,
            status: COUPON_STATUS.ACTIVE,
            expiryDays: { $exists: true, $ne: null },
        });

        for (const coupon of couponsWithExpiryDays) {
            const expiryDate = new Date(coupon.createdAt);
            expiryDate.setDate(expiryDate.getDate() + coupon.expiryDays);

            if (now > expiryDate) {
                await couponModel.updateOne(
                    { _id: coupon._id },
                    { $set: { isActive: false, status: COUPON_STATUS.EXPIRED } }
                );
            }
        }

        console.log(`[CRON] Expired coupons deactivated at ${now.toISOString()}`);
    } catch (error) {
        console.error("[CRON] Error deactivating expired coupons:", error);
    }
};

export const deactivateExpiredDiscounts = async () => {
    try {
        const now = new Date();

        // 1. Discounts expired by endDateTime
        const expiredByDate = await discountModel.updateMany(
            {
                isDeleted: false,
                status: DISCOUNT_STATUS.ACTIVE,
                hasEndDate: true,
                endDateTime: { $lte: now },
            },
            {
                $set: { status: DISCOUNT_STATUS.INACTIVE },
            }
        );

        // 2. Discounts that hit their total usage limit
        const expiredByUsage = await discountModel.updateMany(
            {
                isDeleted: false,
                status: DISCOUNT_STATUS.ACTIVE,
                usageLimitTotal: { $exists: true, $ne: null },
                $expr: { $gte: ["$usedCount", "$usageLimitTotal"] },
            },
            {
                $set: { status: DISCOUNT_STATUS.INACTIVE },
            }
        );

        const totalDeactivated = (expiredByDate.modifiedCount || 0) + (expiredByUsage.modifiedCount || 0);
        if (totalDeactivated > 0) {
            console.log(`[CRON] Deactivated ${totalDeactivated} expired/exhausted discounts at ${now.toISOString()}`);
        }
    } catch (error) {
        console.error("[CRON] Error deactivating expired discounts:", error);
    }
};

export const initCronJobs = () => {
    // check every 1 hour
    const couponExpiryCron = new CronJob("0 * * * *", deactivateExpiredCoupons);
    couponExpiryCron.start();
    console.log("[CRON] Coupon expiry cron job initialized (runs every 1 hour)");

    const discountExpiryCron = new CronJob("0 * * * *", deactivateExpiredDiscounts);
    discountExpiryCron.start();
    console.log("[CRON] Discount expiry cron job initialized (runs every 1 hour)");
};
