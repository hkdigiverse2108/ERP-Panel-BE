import { COUPON_DISCOUNT_TYPE, COUPON_STATUS, LOYALTY_REDEMPTION_TYPE, LOYALTY_STATUS, LOYALTY_TYPE } from "../../common";
import { couponModel, loyaltyModel } from "../../database";
import { getFirstMatch } from "../../helper";


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
}

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

        // const loyalty = await getFirstMatch(loyaltyModel, { _id: loyaltyId, isDeleted: false }, {}, {});
        // if (!loyalty) {
        //     return `Loyalty not found`;
        // }

        // if (loyalty.status !== LOYALTY_STATUS.ACTIVE) {
        //     return `Loyalty is ${loyalty.status}`;
        // }

        // const now = new Date();

        // // Check Start Date
        // if (loyalty.startDate && now < new Date(loyalty.startDate)) {
        //     return `Loyalty is not yet active`;
        // }

        // // Check End Date
        // if (loyalty.endDate && now > new Date(loyalty.endDate)) {
        //     return `Loyalty has expired`;
        // }

        // // Check Expiry Days (from createdAt)
        // if (loyalty.expiryDays) {
        //     const expiryDate = new Date(loyalty.createdAt);
        //     expiryDate.setDate(expiryDate.getDate() + loyalty.expiryDays);
        //     if (now > expiryDate) {
        //         return `Loyalty has expired based on expiry days`;
        //     }
        // }

        // // Check Global Usage Limit
        // if (loyalty.usageLimit && loyalty.usedCount >= loyalty.usageLimit) {
        //     return `Loyalty usage limit reached`;
        // }

        // // Check Single Time Use (Per Customer)
        // if (loyalty.singleTimeUse) {
        //     const hasUsed = loyalty.customerIds && loyalty.customerIds.some((item: any) => item.id.toString() === customerId.toString());
        //     if (hasUsed) {
        //         return `You have already used this loyalty`;
        //     }
        // }

        // // Check Minimum Amount (loyaltyPrice)
        // if (loyalty.loyaltyPrice && totalAmount < loyalty.loyaltyPrice) {
        //     return `Minimum amount required to use this loyalty is ${loyalty.loyaltyPrice}`;
        // }

        // // Calculate Discount
        // let discountAmount = 0;
        // if (loyalty.redemptionType === LOYALTY_DISCOUNT_TYPE.PERCENTAGE) {
        //     discountAmount = (totalAmount * loyalty.redeemValue) / 100;
        // } else if (loyalty.redemptionType === LOYALTY_DISCOUNT_TYPE.FLAT) {
        //     discountAmount = loyalty.redeemValue;
        // }

        // // Ensure discount doesn't exceed total amount
        // discountAmount = Math.min(discountAmount, totalAmount);

        // const result = {
        //     loyaltyId: loyalty._id,
        //     name: loyalty.name,
        //     discountAmount,
        //     finalAmount: totalAmount - discountAmount,
        //     redemptionType: loyalty.redemptionType,
        //     redeemValue: loyalty.redeemValue,
        // };

        // // Update Loyalty usage
        // const customerEntry = loyalty.customerIds ? loyalty.customerIds.find((item: any) => item.id.toString() === customerId.toString()) : null;

        // if (customerEntry) {
        //     await loyaltyModel.updateOne({ _id: loyalty._id, "customerIds.id": customerId as any }, { $inc: { "customerIds.$.count": 1, usedCount: 1 } });
        // } else {
        //     await loyaltyModel.updateOne({ _id: loyalty._id }, { $push: { customerIds: { id: customerId, count: 1 } }, $inc: { usedCount: 1 } });
        // }

        // return "Loyalty applied successfully";
    } catch (error) {
        console.error(error);
        return error;
    }
}