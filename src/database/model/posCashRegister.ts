import { Schema, model } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";

const posCashRegisterSchema = new Schema(
    {
        ...baseSchemaFields,
        registerId: { type: Schema.Types.ObjectId, ref: "cash_registers" },

        openingCash: { type: Number },

        cashPayment: { type: Number, default: 0 },
        chequePayment: { type: Number, default: 0 },
        cardPayment: { type: Number, default: 0 },
        bankPayment: { type: Number, default: 0 },
        upiPayment: { type: Number, default: 0 },
        walletPayment: { type: Number, default: 0 },

        salesReturn: { type: Number, default: 0 },
        cashRefund: { type: Number, default: 0 },
        bankRefund: { type: Number, default: 0 },

        creditAdvanceRedeemed: { type: Number, default: 0 },
        payLater: { type: Number, default: 0 },

        expense: { type: Number, default: 0 },
        purchasePayment: { type: Number, default: 0 },

        totalSales: { type: Number },

        denominations: [
            {
                currency: { type: Number },
                count: { type: Number },
                amount: { type: Number },
            },
        ],

        totalDenominationAmount: {
            type: Number,
        },

        bankAccountId: {
            type: Schema.Types.ObjectId,
            ref: "bank_accounts",
        },

        bankTransferAmount: {
            type: Number,
            default: 0,
        },

        cashFlow: {
            type: Number,
            default: 0,
        },

        totalCashLeftInDrawer: {
            type: Number,
        },

        physicalDrawerCash: {
            type: Number,
        },

        closingNote: {
            type: String,
            trim: true,
        },

    },
    baseSchemaOptions
);

export const PosCashRegisterModel = model("pos-cash-register", posCashRegisterSchema);
