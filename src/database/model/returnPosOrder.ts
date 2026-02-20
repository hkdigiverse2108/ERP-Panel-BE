import mongoose from "mongoose"
import { baseSchemaFields, baseSchemaOptions } from "./base"
import { RETURN_POS_ORDER_TYPE } from "../../common"

const returnPosOrderSchema = new mongoose.Schema({
    returnOrderNo: { type: String, required: true, index: true },
    posOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "pos-order" },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "contact" },
    salesManId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },

    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "product" },
        quantity: { type: Number },
        price: { type: Number },
        total: { type: Number }
    }],
    total: { type: Number },
    type: { type: String, enum: Object.values(RETURN_POS_ORDER_TYPE), default: RETURN_POS_ORDER_TYPE.SALES_RETURN },
    reason: { type: String },

    refundViaCash: { type: Number, default: 0 },
    refundViaBank: { type: Number, default: 0 },
    bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "bank" },
    refundDescription: { type: String },
    ...baseSchemaFields
}, baseSchemaOptions)

export const returnPosOrderModel = mongoose.model("return-pos-order", returnPosOrderSchema)
