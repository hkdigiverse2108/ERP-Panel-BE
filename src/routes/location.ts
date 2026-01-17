import express from "express";
import { locationController } from "../controllers";

const router = express.Router();


router.get("/country", locationController.getAllCountries);
router.get("/state/:countryId", locationController.getStatesByCountry);
router.get("/city/:stateId", locationController.getCitiesByState);

router.get("/all", locationController.getAllLocation);
router.post("/add", locationController.addLocation);
router.put("/edit", locationController.editLocationById);
router.delete("/:id", locationController.deleteLocationById);
router.get("/:id", locationController.getLocationById);


export const locationRouter = router;
