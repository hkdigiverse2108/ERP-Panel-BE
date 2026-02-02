import { Model } from "mongoose";

interface GenerateSequenceOptions {
  model: Model<any>;
  prefix: string;
  fieldName?: string;
  companyId?: string | null;
}

export const generateSequenceNumber = async ({ model, prefix, fieldName = "number", companyId }: GenerateSequenceOptions): Promise<string> => {
  const baseQuery: any = {
    ...(companyId ? { companyId } : {}),
    isDeleted: false,
  };

  const latest = await model.findOne(baseQuery).select(fieldName).sort({ createdAt: -1 }).lean();

  let nextNumber = 1;

  if (latest?.[fieldName]) {
    const parts = String(latest[fieldName]).split("-");
    const lastPart = parts[parts.length - 1];
    const parsed = Number(lastPart);

    if (!Number.isNaN(parsed)) {
      nextNumber = parsed + 1;
    }
  }

  let candidate = `${prefix}-${nextNumber}`;

  while (
    await model.exists({
      ...baseQuery,
      [fieldName]: candidate,
    })
  ) {
    nextNumber += 1;
    candidate = `${prefix}-${nextNumber}`;
  }

  return candidate;
};
