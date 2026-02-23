import { apiResponse, HTTP_STATUS, USER_TYPES } from "../../common";
import { loginLogModel } from "../../database";
import { countData, createOne, getDataWithSorting, reqInfo, responseMessage } from "../../helper";

export const createLoginLogEntry = async (req, user: any, eventType: "LOGIN" | "FINANCIAL_YEAR_UPDATE", message: string) => {

    const ipHeader = (req.headers["x-forwarded-for"] as string) || "";
    const ipAddress = ipHeader.split(",")[0].trim() || req.ip || "";

    const userAgent = req.header("user-agent") || "";
    let systemDetails = userAgent;
    try {
        let split = userAgent.split("(").toString().split(")");
        const browserName = split[split.length - 1];
        split = split[0].split(",");
        const osName = split[1];
        systemDetails = `${(osName || "").trim()} ${browserName || ""}`.trim();
    } catch {
        // fallback: raw UA
    }

    await createOne(loginLogModel, {
        companyId: user?.companyId?._id || user?.companyId || null,
        branchId: user?.branchId?._id || user?.branchId || null,
        userId: user?._id,
        message,
        ipAddress,
        systemDetails,
        eventType,
        createdBy: user?._id || null,
        updatedBy: user?._id || null,
    });
};

export const getAllLoginLog = async (req, res) => {
    reqInfo(req);
    try {
        const { user } = req?.headers;
        const companyId = user?.companyId?._id;

        let { page, limit, search, companyFilter, branchFilter, startDate, endDate } = req.query;

        const criteria: any = { isDeleted: false };

        if (user?.userType !== USER_TYPES.SUPER_ADMIN && companyId) {
            criteria.companyId = companyId;
        }

        if (companyFilter) criteria.companyId = companyFilter;
        if (branchFilter) criteria.branchId = branchFilter;

        if (search) {
            criteria.$or = [
                { message: { $regex: search, $options: "si" } },
                { ipAddress: { $regex: search, $options: "si" } },
                { systemDetails: { $regex: search, $options: "si" } },
            ];
        }

        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                criteria.createdAt = { $gte: start, $lte: end };
            }
        }

        const options: any = {
            sort: { createdAt: -1 },
            skip: (page - 1) * limit,
            limit,
            populate: [
                { path: "companyId", select: "name" },
                { path: "branchId", select: "name" },
                { path: "userId", select: "fullName email" },
            ],
        };

        const logs = await getDataWithSorting(loginLogModel, criteria, {}, options);
        const totalData = await countData(loginLogModel, criteria);

        return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage?.getDataSuccess("Login Log"), {
            loginLog_data: logs,
            totalData,
            state: { page, limit, totalPages: Math.ceil(totalData / limit) || 1 },
        }, {}));
    } catch (error) {
        console.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage?.internalServerError, {}, error));
    }
};