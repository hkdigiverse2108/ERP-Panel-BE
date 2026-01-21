import { apiResponse, HTTP_STATUS, LOCATION_TYPE } from "../common";
import { getFirstMatch } from "./databaseServices";
import { responseMessage } from "./responseMessage";

export const checkLocationExist = async (model, address, res) => {
  const locationChecks = [];

  if (address?.country) {
    locationChecks.push({
      _id: address.country,
      type: LOCATION_TYPE.COUNTRY,
      label: "country",
    });
  }

  if (address?.state) {
    locationChecks.push({
      _id: address.state,
      type: LOCATION_TYPE.STATE,
      label: "state",
    });
  }

  if (address?.city) {
    locationChecks.push({
      _id: address.city,
      type: LOCATION_TYPE.CITY,
      label: "city",
    });
  }

  for (const loc of locationChecks) {
    const exists = await getFirstMatch(model, { _id: loc._id, type: loc.type, isDeleted: false }, {}, {});

    if (!exists) {
      res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, responseMessage.getDataNotFound(loc.label), {}, {}));
      return false;
    }
  }

  return true;
};
