export const applyDateFilter = (criteria: any, startDate?: string, endDate?: string, dateField: string = "createdAt") => {
    if (startDate || endDate) {
        criteria[dateField] = {};
        if (startDate) {
            criteria[dateField].$gte = new Date(startDate);
        }
        if (endDate) {
            let end = new Date(endDate);
            end.setUTCHours(23, 59, 59, 999);
            criteria[dateField].$lte = end;
        }
    }
    return criteria;
};
