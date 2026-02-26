import { Schema, model } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { CASH_REGISTER_STATUS } from "../../common";

const posCashRegisterSchema = new Schema(
  {
    ...baseSchemaFields,
    registerNo: { type: String, trim: true },
    openingCash: { type: Number },

    salesManId: { type: Schema.Types.ObjectId, ref: "user", default: null },

    cashPayment: { type: Number, default: 0 },
    chequePayment: { type: Number, default: 0 },
    cardPayment: { type: Number, default: 0 },
    bankPayment: { type: Number, default: 0 },
    upiPayment: { type: Number, default: 0 },

    salesReturn: { type: Number, default: 0 },
    cashRefund: { type: Number, default: 0 },
    bankRefund: { type: Number, default: 0 },

    creditAdvanceRedeemed: { type: Number, default: 0 },
    payLater: { type: Number, default: 0 },

    expense: { type: Number, default: 0 },
    purchasePayment: { type: Number, default: 0 },

    totalSales: { type: Number, default: 0 },

    denominations: [
      {
        currency: { type: Number },
        count: { type: Number },
        amount: { type: Number },
        _id: false,
      },
    ],

    totalDenominationAmount: {
      type: Number,
    },

    bankAccountId: {
      type: Schema.Types.ObjectId,
      ref: "bank",
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

    status: { type: String, enum: Object.values(CASH_REGISTER_STATUS), default: CASH_REGISTER_STATUS.OPEN },
  },
  baseSchemaOptions,
);

export const PosCashRegisterModel = model("pos-cash-register", posCashRegisterSchema);
