import { COUPON_DISCOUNT_TYPE, COUPON_STATUS, LOYALTY_TYPE, REDEEM_CREDIT_TYPE, POS_CREDIT_NOTE_STATUS, POS_PAYMENT_TYPE } from "../../common";
import { couponModel, loyaltyModel, posCreditNoteModel, PosPaymentModel } from "../../database";
import { getFirstMatch } from "../../helper";
import mongoose from "mongoose";

const ObjectId = mongoose.Types.ObjectId;

export const applyCoupon = async (couponId: string, customerId: string, totalAmount: number) => {
  try {
    const coupon = await getFirstMatch(couponModel, { _id: couponId, isDeleted: false }, {}, {});
    if (!coupon) {
      return `Coupon not found`;
    }

    if (coupon.status !== COUPON_STATUS.ACTIVE) {
      return `Coupon is ${coupon.status}`;
    }

    const now = new Date();

    // Check Start Date
    if (coupon.startDate && now < new Date(coupon.startDate)) {
      return `Coupon is not yet active`;
    }

    // Check End Date
    if (coupon.endDate && now > new Date(coupon.endDate)) {
      return `Coupon has expired`;
    }

    // Check Expiry Days (from createdAt)
    if (coupon.expiryDays) {
      const expiryDate = new Date(coupon.createdAt);
      expiryDate.setDate(expiryDate.getDate() + coupon.expiryDays);
      if (now > expiryDate) {
        return `Coupon has expired based on expiry days`;
      }
    }

    // Check Global Usage Limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return `Coupon usage limit reached`;
    }

    // Check Single Time Use (Per Customer)
    if (coupon.singleTimeUse) {
      const hasUsed = coupon.customerIds && coupon.customerIds.some((item: any) => item.id.toString() === customerId.toString());
      if (hasUsed) {
        return `You have already used this coupon`;
      }
    }

    // Check Minimum Amount (couponPrice)
    if (coupon.couponPrice && totalAmount < coupon.couponPrice) {
      return `Minimum amount required to use this coupon is ${coupon.couponPrice}`;
    }

    // Calculate Discount
    let discountAmount = 0;
    if (coupon.redemptionType === COUPON_DISCOUNT_TYPE.PERCENTAGE) {
      discountAmount = (totalAmount * coupon.redeemValue) / 100;
    } else if (coupon.redemptionType === COUPON_DISCOUNT_TYPE.FLAT) {
      discountAmount = coupon.redeemValue;
    }

    // Ensure discount doesn't exceed total amount
    discountAmount = Math.min(discountAmount, totalAmount);

    const result = {
      couponId: coupon._id,
      name: coupon.name,
      discountAmount,
      finalAmount: totalAmount - discountAmount,
      redemptionType: coupon.redemptionType,
      redeemValue: coupon.redeemValue,
    };

    // Update Coupon usage
    const customerEntry = coupon.customerIds ? coupon.customerIds.find((item: any) => item.id.toString() === customerId.toString()) : null;

    if (customerEntry) {
      await couponModel.updateOne({ _id: coupon._id, "customerIds.id": customerId as any }, { $inc: { "customerIds.$.count": 1, usedCount: 1 } });
    } else {
      await couponModel.updateOne({ _id: coupon._id }, { $push: { customerIds: { id: customerId, count: 1 } }, $inc: { usedCount: 1 } });
    }

    return "Coupon applied successfully";
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const applyRedeemCredit = async (redeemCreditId: string, redeemCreditType: string, redeemCreditAmount: number, customerId: string) => {
  try {
    if (redeemCreditType === REDEEM_CREDIT_TYPE.CREDIT_NOTE) {
      const creditNote = await getFirstMatch(posCreditNoteModel, { _id: redeemCreditId, isDeleted: false }, {}, {});
      if (!creditNote) {
        return `Credit Note not found`;
      }
      if (customerId && creditNote.customerId?.toString() !== customerId.toString()) {
        return `Credit Note does not belong to this customer`;
      }
      if (creditNote.creditsRemaining < redeemCreditAmount) {
        return `Insufficient credits in Credit Note`;
      }

      const updatedCreditNote = await posCreditNoteModel.findOneAndUpdate({ _id: redeemCreditId }, { $inc: { creditsUsed: redeemCreditAmount, creditsRemaining: -redeemCreditAmount } }, { new: true });

      if (updatedCreditNote && updatedCreditNote.creditsRemaining <= 0) {
        await posCreditNoteModel.updateOne({ _id: redeemCreditId }, { status: POS_CREDIT_NOTE_STATUS.USED });
      }
    } else if (redeemCreditType === REDEEM_CREDIT_TYPE.ADVANCE_PAYMENT) {
      const advancePayment = await getFirstMatch(PosPaymentModel, { _id: redeemCreditId, isDeleted: false, paymentType: POS_PAYMENT_TYPE.ADVANCE }, {}, {});
      if (!advancePayment) {
        return `Advance Payment not found`;
      }
      if (customerId && advancePayment.partyId?.toString() !== customerId.toString()) {
        return `Advance Payment does not belong to this customer`;
      }
      if ((advancePayment.amount || 0) < redeemCreditAmount) {
        return `Insufficient amount in Advance Payment`;
      }

      await PosPaymentModel.updateOne({ _id: redeemCreditId }, { $inc: { amount: -redeemCreditAmount } });
    } else {
      return `Invalid redemption type`;
    }

    return "Redeem credit applied successfully";
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const applyLoyalty = async (loyaltyId: string, customerId: string, totalAmount: number) => {
  try {
    const loyalty = await getFirstMatch(loyaltyModel, { _id: loyaltyId, isDeleted: false }, {}, {});

    if (!loyalty) {
      return "Loyalty campaign not found";
    }

    if (!loyalty.isActive) {
      return `Loyalty campaign is inactive`;
    }

    const now = new Date();

    // Check Launch Date
    if (loyalty.campaignLaunchDate && now < new Date(loyalty.campaignLaunchDate)) {
      return "Loyalty campaign is not yet active";
    }

    // Check Expiry Date
    if (loyalty.campaignExpiryDate && now > new Date(loyalty.campaignExpiryDate)) {
      return "Loyalty campaign has expired";
    }

    // Check Minimum Purchase Amount
    if (loyalty.minimumPurchaseAmount && totalAmount < loyalty.minimumPurchaseAmount) {
      return `Minimum amount required to use this campaign is ${loyalty.minimumPurchaseAmount}`;
    }

    // Check Global Usage Limit
    if (loyalty.usageLimit && loyalty.usedCount >= loyalty.usageLimit) {
      return "Loyalty campaign usage limit reached";
    }

    // Check Single Time Use (Per Customer)
    if (loyalty.singleTimeUse) {
      const hasUsed = loyalty.customerIds && loyalty.customerIds.some((item: any) => item.id.toString() === customerId.toString());
      if (hasUsed) {
        return "You have already used this loyalty campaign";
      }
    }

    // Calculate Benefits (based on type)
    let benefit: any = {
      loyaltyId: loyalty._id,
      name: loyalty.name,
      type: loyalty.type,
    };

    if (loyalty.type === LOYALTY_TYPE.DISCOUNT) {
      benefit.discountValue = loyalty.discountValue || 0;
    } else if (loyalty.type === LOYALTY_TYPE.FREE_PRODUCT) {
      benefit.discountValue = loyalty.redemptionPoints || 0;
    }

    // Update Loyalty usage
    const customerEntry = loyalty.customerIds ? loyalty.customerIds.find((item: any) => item.id.toString() === customerId.toString()) : null;

    if (customerEntry) {
      await loyaltyModel.updateOne({ _id: loyaltyId, "customerIds.id": customerId }, { $inc: { "customerIds.$.count": 1, usedCount: 1 } });
    } else {
      await loyaltyModel.updateOne({ _id: loyaltyId }, { $push: { customerIds: { id: customerId, count: 1 } }, $inc: { usedCount: 1 } });
    }

    return "Loyalty redeemed successfully";
  } catch (error) {
    console.error(error);
    return error;
  }
};

export const revertCoupon = async (couponId: string, customerId: string) => {
  try {
    const coupon = await getFirstMatch(couponModel, { _id: couponId }, {}, {});
    if (!coupon) return;

    const customerEntry = coupon.customerIds ? coupon.customerIds.find((item: any) => item.id.toString() === customerId.toString()) : null;
    if (customerEntry) {
      if (customerEntry.count > 1) {
        await couponModel.updateOne({ _id: new ObjectId(couponId) as any, "customerIds.id": new ObjectId(customerId) as any }, { $inc: { "customerIds.$.count": -1, usedCount: -1 } });
      } else {
        await couponModel.updateOne({ _id: new ObjectId(couponId) as any }, { $pull: { customerIds: { id: new ObjectId(customerId) as any } }, $inc: { usedCount: -1 } });
      }
    }
  } catch (error) {
    console.error("Error in revertCoupon:", error);
  }
};

export const revertRedeemCredit = async (redeemCreditId: string, redeemCreditType: string, redeemCreditAmount: number) => {
  try {
    if (redeemCreditType === REDEEM_CREDIT_TYPE.CREDIT_NOTE) {
      await posCreditNoteModel.updateOne(
        { _id: new ObjectId(redeemCreditId) as any },
        {
          $inc: { creditsUsed: -redeemCreditAmount, creditsRemaining: redeemCreditAmount },
          $set: { status: POS_CREDIT_NOTE_STATUS.AVAILABLE },
        },
      );
    } else if (redeemCreditType === REDEEM_CREDIT_TYPE.ADVANCE_PAYMENT) {
      await PosPaymentModel.updateOne({ _id: new ObjectId(redeemCreditId) }, { $inc: { amount: redeemCreditAmount } });
    }
  } catch (error) {
    console.error("Error in revertRedeemCredit:", error);
  }
};

export const revertLoyalty = async (loyaltyId: string, customerId: string) => {
  try {
    const loyalty = await getFirstMatch(loyaltyModel, { _id: loyaltyId }, {}, {});
    if (!loyalty) return;

    const customerEntry = loyalty.customerIds ? loyalty.customerIds.find((item: any) => item.id.toString() === customerId.toString()) : null;
    if (customerEntry) {
      if (customerEntry.count > 1) {
        await loyaltyModel.updateOne({ _id: new ObjectId(loyaltyId) as any, "customerIds.id": new ObjectId(customerId) as any }, { $inc: { "customerIds.$.count": -1, usedCount: -1 } });
      } else {
        await loyaltyModel.updateOne({ _id: new ObjectId(loyaltyId) as any }, { $pull: { customerIds: { id: new ObjectId(customerId) as any } }, $inc: { usedCount: -1 } });
      }
    }
  } catch (error) {
    console.error("Error in revertLoyalty:", error);
  }
};
