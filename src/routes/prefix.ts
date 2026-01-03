import express from "express";
import { prefixController } from "../controllers";

const router = express.Router();

router.get("/all", prefixController.getAllPrefix);
router.get("/module/:module", prefixController.getPrefixByModule);
router.post("/add", prefixController.addPrefix);
router.put("/edit", prefixController.editPrefix);
router.delete("/:id", prefixController.deletePrefix);
router.get("/:id", prefixController.getOnePrefix);

export const prefixRouter = router;

