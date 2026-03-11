import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IExpense } from "../../types";
import { EXPENSEDATA_TYPE } from "../../common";

const expenseSchema = new Schema<IExpense>({
    ...baseSchemaFields,
    amount: { type: Number },
    file: { type: String },
    discreption: { type: String },
    isSalery: { type: Boolean },
    // if isSalery is true then the partyId will be a from user other wise it will be from the contect.
    partyId: { type: Schema.Types.ObjectId },
    type: { type: String, enum: Object.values(EXPENSEDATA_TYPE), },
    incentive: { type: Number }, // 0 if isSalery false other wise user can set the value.
    fromDate: { type: Date }, // null if isSalery false
    toDate: { type: Date }, // null if isSalery false
    total: { type: Number },
}, baseSchemaOptions)

export const ExpenseModel = mongoose.model<IExpense>("expense", expenseSchema);