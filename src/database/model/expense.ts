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
    incentive: { type: Number },
    fromDate: { type: Date },
    toDate: { type: Date },
    total: { type: Number },
}, baseSchemaOptions)

export const ExpenseModel = mongoose.model<IExpense>("expense", expenseSchema);