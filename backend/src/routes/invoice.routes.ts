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
} from "../controllers/invoice.controller";

const router = Router();

// ─── Authenticated ───────────────────────────────────────────────
// (The public /:token view lives in publicView.routes.ts — mounting
// this whole router at /v1/invoices/view used to shadow /:id over it.)
router.get("/",              listInvoices);
router.post("/",             createInvoice);
router.get("/:id",           getInvoice);
router.patch("/:id",         updateInvoice);
router.delete("/:id",        deleteInvoice);
router.post("/:id/send",     sendInvoice);
router.get("/:id/pdf",       downloadPdf);
router.post("/:id/mark-paid", markPaid);

export default router;
