import express from "express";
import { locationController } from "../controllers";

const router = express.Router();

router.get("/country", locationController.getAllCountries);
router.get("/state/:countryCode", locationController.getStatesByCountry);
router.get("/city/:stateCode", locationController.getCitiesByState);

export const locationRouter = router;

