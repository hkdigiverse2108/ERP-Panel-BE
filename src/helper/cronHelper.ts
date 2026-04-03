// import * as cron from "cron";
import { CronJob } from "cron";
import { companyModel, couponModel, discountModel, PrefixModel } from "../database";
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
      },
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
        await couponModel.updateOne({ _id: coupon._id }, { $set: { isActive: false, status: COUPON_STATUS.EXPIRED } });
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
      },
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
      },
    );

    const totalDeactivated = (expiredByDate.modifiedCount || 0) + (expiredByUsage.modifiedCount || 0);
    if (totalDeactivated > 0) {
      console.log(`[CRON] Deactivated ${totalDeactivated} expired/exhausted discounts at ${now.toISOString()}`);
    }
  } catch (error) {
    console.error("[CRON] Error deactivating expired discounts:", error);
  }
};

export const resetPrefixNumbers = async () => {
  try {
    const now = new Date();
    // Determine the financial year that just ended (e.g., if today is April 1st, 2025, the year was 2024-25)
    const currentYear = now.getFullYear();
    const financialYearSuffix = currentYear.toString().slice(-2);
    const previousYear = currentYear - 1;
    const financialYear = `${previousYear}-${financialYearSuffix}`;

    console.log(`[CRON] Starting Financial Year Prefix Reset for ${financialYear}...`);

    const prefixes = await PrefixModel.find({ isDeleted: false });

    for (const prefix of prefixes) {
      // 1. Store the current number in history before resetting
      const historyEntry = {
        financialYear: financialYear,
        lastNumber: prefix.currentNumber || 1,
        resetDate: now,
      };

      // 2. Reset currentNumber back to sequenceNumber (the starting reference)
      await PrefixModel.updateOne(
        { _id: prefix._id },
        {
          $set: { currentNumber: prefix.sequenceNumber || 1 },
          $push: { history: historyEntry },
        },
      );
    }

    // 3. Update the Current Financial Year for all companies
    const startDate = new Date(Date.UTC(currentYear, 3, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(currentYear + 1, 2, 31, 23, 59, 59, 999));
    const newFinancialYear = `${startDate.toISOString()} - ${endDate.toISOString()}`;
    await companyModel.updateMany(
      { isDeleted: false },
      { $set: { financialYear: newFinancialYear } }
    );

    console.log(`[CRON] Successfully updated company financial year to ${newFinancialYear} and reset ${prefixes.length} prefixes.`);
  } catch (error) {
    console.error("[CRON] Error resetting prefix numbers:", error);
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

  // Financial Year Reset: Runs on April 1st at 12:00 AM
  const prefixResetCron = new CronJob("0 0 0 1 4 *", resetPrefixNumbers);
  // const prefixResetCron = new CronJob("* * * * *", resetPrefixNumbers);
  prefixResetCron.start();
  console.log("[CRON] Financial Year Prefix Reset cron job initialized (runs every April 1st at 12:00 AM)");
};
