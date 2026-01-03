import { HTTP_STATUS } from "../../common";
import { apiResponse } from "../../common/utils";
import { reqInfo, responseMessage } from "../../helper";

// Static country data - can be moved to database if needed
const countries = [
  { _id: "IN", name: "India", code: "IN" },
  { _id: "US", name: "United States", code: "US" },
  { _id: "GB", name: "United Kingdom", code: "GB" },
  // Add more countries as needed
];

// Static state data for India - can be moved to database if needed
const indianStates = [
  { _id: "GJ", name: "Gujarat", countryCode: "IN" },
  { _id: "MH", name: "Maharashtra", countryCode: "IN" },
  { _id: "DL", name: "Delhi", countryCode: "IN" },
  { _id: "KA", name: "Karnataka", countryCode: "IN" },
  { _id: "TN", name: "Tamil Nadu", countryCode: "IN" },
  { _id: "UP", name: "Uttar Pradesh", countryCode: "IN" },
  { _id: "WB", name: "West Bengal", countryCode: "IN" },
  { _id: "RJ", name: "Rajasthan", countryCode: "IN" },
  { _id: "MP", name: "Madhya Pradesh", countryCode: "IN" },
  { _id: "AP", name: "Andhra Pradesh", countryCode: "IN" },
  { _id: "PB", name: "Punjab", countryCode: "IN" },
  { _id: "HR", name: "Haryana", countryCode: "IN" },
  { _id: "KL", name: "Kerala", countryCode: "IN" },
  { _id: "OR", name: "Odisha", countryCode: "IN" },
  { _id: "AS", name: "Assam", countryCode: "IN" },
  { _id: "BR", name: "Bihar", countryCode: "IN" },
  { _id: "CT", name: "Chhattisgarh", countryCode: "IN" },
  { _id: "HP", name: "Himachal Pradesh", countryCode: "IN" },
  { _id: "JH", name: "Jharkhand", countryCode: "IN" },
  { _id: "UT", name: "Uttarakhand", countryCode: "IN" },
  { _id: "GA", name: "Goa", countryCode: "IN" },
  { _id: "MN", name: "Manipur", countryCode: "IN" },
  { _id: "ML", name: "Meghalaya", countryCode: "IN" },
  { _id: "MZ", name: "Mizoram", countryCode: "IN" },
  { _id: "NL", name: "Nagaland", countryCode: "IN" },
  { _id: "SK", name: "Sikkim", countryCode: "IN" },
  { _id: "TR", name: "Tripura", countryCode: "IN" },
  { _id: "AN", name: "Andaman and Nicobar Islands", countryCode: "IN" },
  { _id: "CH", name: "Chandigarh", countryCode: "IN" },
  { _id: "DN", name: "Dadra and Nagar Haveli", countryCode: "IN" },
  { _id: "DD", name: "Daman and Diu", countryCode: "IN" },
  { _id: "LD", name: "Lakshadweep", countryCode: "IN" },
  { _id: "PY", name: "Puducherry", countryCode: "IN" },
];

// Static city data - can be moved to database if needed
const cities = [
  { _id: "SUR", name: "Surat", stateCode: "GJ" },
  { _id: "AMD", name: "Ahmedabad", stateCode: "GJ" },
  { _id: "VAD", name: "Vadodara", stateCode: "GJ" },
  { _id: "RAJ", name: "Rajkot", stateCode: "GJ" },
  { _id: "BOM", name: "Mumbai", stateCode: "MH" },
  { _id: "PUN", name: "Pune", stateCode: "MH" },
  { _id: "NDL", name: "New Delhi", stateCode: "DL" },
  { _id: "BLR", name: "Bangalore", stateCode: "KA" },
  { _id: "CHN", name: "Chennai", stateCode: "TN" },
  // Add more cities as needed
];

export const getAllCountries = async (req, res) => {
  reqInfo(req);
  try {
    const dropdownData = countries.map((item) => ({
      _id: item._id,
      name: item.name,
      code: item.code,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("Country"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

export const getStatesByCountry = async (req, res) => {
  reqInfo(req);
  try {
    const { countryCode } = req.params;

    if (!countryCode) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "Country code is required", {}, {}));
    }

    let states = [];
    if (countryCode === "IN") {
      states = indianStates;
    }
    // Add more country-specific state lists as needed

    const dropdownData = states.map((item) => ({
      _id: item._id,
      name: item.name,
      countryCode: item.countryCode,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("State"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

export const getCitiesByState = async (req, res) => {
  reqInfo(req);
  try {
    const { stateCode } = req.params;

    if (!stateCode) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(new apiResponse(HTTP_STATUS.BAD_REQUEST, "State code is required", {}, {}));
    }

    const filteredCities = cities.filter((city) => city.stateCode === stateCode);

    const dropdownData = filteredCities.map((item) => ({
      _id: item._id,
      name: item.name,
      stateCode: item.stateCode,
    }));

    return res.status(HTTP_STATUS.OK).json(new apiResponse(HTTP_STATUS.OK, responseMessage.getDataSuccess("City"), dropdownData, {}));
  } catch (error) {
    console.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(new apiResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR, responseMessage.internalServerError, {}, error));
  }
};

