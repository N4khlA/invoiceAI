// src/routes/client.routes.ts
import { Router } from "express";
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
} from "../controllers/client.controller";

const router = Router();

router.get("/",       listClients);
router.post("/",      createClient);
router.get("/:id",    getClient);
router.patch("/:id",  updateClient);
router.delete("/:id", deleteClient);

export default router;
