import { Router } from "express";
import { credentialController } from "../controllers";

const router = Router();

router.post("/add", credentialController.addCredential);
router.put("/edit", credentialController.editCredentialById);
router.delete("/:id", credentialController.deleteCredentialById);
router.get("/all", credentialController.getAllCredential);

export const credentialRouter = router;
