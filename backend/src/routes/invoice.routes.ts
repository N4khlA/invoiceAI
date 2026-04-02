// src/routes/invoice.routes.ts
import { Router } from "express";
import {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoice,
  downloadPdf,
  markPaid,
  getPublicInvoice,
} from "../controllers/invoice.controller";

const router = Router();

// ─── Public (no auth) — mounted before authenticate in app.ts ───
router.get("/view/:token", getPublicInvoice);

// ─── Authenticated ───────────────────────────────────────────────
router.get("/",              listInvoices);
router.post("/",             createInvoice);
router.get("/:id",           getInvoice);
router.patch("/:id",         updateInvoice);
router.delete("/:id",        deleteInvoice);
router.post("/:id/send",     sendInvoice);
router.get("/:id/pdf",       downloadPdf);
router.post("/:id/mark-paid", markPaid);

export default router;
