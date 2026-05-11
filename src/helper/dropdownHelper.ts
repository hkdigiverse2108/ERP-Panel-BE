import mongoose from "mongoose";

/**
 * Wraps existing criteria with an $or condition to include specific IDs.
 * Supports single ID, array of IDs, or comma-separated string.
 * 
 * @param criteria - The original MongoDB query criteria
 * @param includeId - The ID or IDs to include (string, array, or comma-separated string)
 * @param idField - The field name for the ID (defaults to "_id")
 * @returns Updated criteria with $or condition
 */
export const handleIncludeId = (criteria: any, includeId: any, idField: string = "_id") => {
  if (!includeId) return criteria;

  let includeIds: any[] = [];
  if (Array.isArray(includeId)) {
    includeIds = includeId;
  } else if (typeof includeId === "string") {
    // Handle comma-separated string
    includeIds = includeId.split(",").map((id: string) => id.trim()).filter((id: string) => id !== "");
  } else {
    includeIds = [includeId];
  }

  const validObjectIds = includeIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (validObjectIds.length > 0) {
    // Use $in to support multiple IDs
    const includeCriteria = { [idField]: { $in: validObjectIds } };

    // If criteria is empty, just return the includeCriteria
    if (Object.keys(criteria).length === 0) {
      return includeCriteria;
    }

    // Wrap in $or to include either the filtered results OR the specific IDs
    return {
      $or: [criteria, includeCriteria],
    };
  }

  return criteria;
};
