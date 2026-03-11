import mongoose, { Schema } from "mongoose";
import { baseSchemaFields, baseSchemaOptions } from "./base";
import { IExpense } from "../../types";
import { EXPENSEDATA_TYPE } from "../../common";

const expenseSchema = new Schema<IExpense>({
    ...baseSchemaFields,
    amount: { type: Number },
    file: { type: String },
    description: { type: String },
    isSalary: { type: Boolean },
    // if isSalary is true then the partyId will be a from user other wise it will be from the contect.
    partyId: { type: Schema.Types.ObjectId },
    type: { type: String, enum: Object.values(EXPENSEDATA_TYPE), },
    incentive: { type: Number }, // 0 if isSalary false other wise user can set the value.
    fromDate: { type: Date }, // null if isSalary false
    toDate: { type: Date }, // null if isSalary false
    total: { type: Number },
}, baseSchemaOptions)

export const ExpenseModel = mongoose.model<IExpense>("expense", expenseSchema);