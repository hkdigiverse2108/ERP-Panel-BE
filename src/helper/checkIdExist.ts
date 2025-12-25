import { apiResponse, HTTP_STATUS } from "../common";
import { getFirstMatch } from "./databaseServices";
import { responseMessage } from "./responseMessage";

export const checkIdExist = async (model, id, name, res) => {
  if (!id) return true;

  const exists = await getFirstMatch(model, { _id: id, isDeleted: false }, {}, {});

  if (!exists) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage.getDataNotFound(name), {}, {}));
    return false;
  }
  return true;
};
