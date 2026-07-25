/**
 * AI MODULE - Main Index (Entry Point)
 * =====================================
 * Barcha AI sub-modullarni birlashtiruvchi asosiy router.
 * backend/app.js da: app.use('/api/ai', require('./ai'))
 *
 * MODUL ARXITEKTURASI:
 * ┌─────────────────────────────────────────────────────────┐
 * │                    /api/ai (index.js)                    │
 * ├──────────────┬──────────────┬──────────────┬────────────┤
 * │  /chat/*     │ /education/* │  /finance/*  │  /keys/*   │
 * │  /sessions   │  /stats      │  /summary    │  /usage    │
 * ├──────────────┼──────────────┼──────────────┼────────────┤
 * │/management/* │/communication│  /sandbox/*  │            │
 * │  /staff      │  /stats      │  (qoidalar)  │            │
 * └──────────────┴──────────────┴──────────────┴────────────┘
 *
 * QOIDALAR:
 * - Har bir modul o'z router fayliga ega
 * - Barcha route'lar auth + admin ruxsatini talab qiladi
 * - Yangi modul qo'shish: require va use() orqali
 *
 * TO'LIQ ENDPOINT RO'YXATI:
 * POST   /api/ai/chat
 * GET    /api/ai/sessions
 * GET    /api/ai/sessions/:id
 * DELETE /api/ai/sessions          ← YANGI: barcha o'chirish
 * DELETE /api/ai/sessions/:id
 * GET    /api/ai/education/stats
 * GET    /api/ai/finance/summary
 * GET    /api/ai/finance/debtors
 * GET    /api/ai/management/staff
 * GET    /api/ai/communication/stats
 * GET    /api/ai/keys
 * POST   /api/ai/keys
 * PUT    /api/ai/keys/:id
 * DELETE /api/ai/keys/:id
 * GET    /api/ai/usage
 * GET    /api/ai/sandbox           ← YANGI: sandboxlar
 * GET    /api/ai/sandbox/:role     ← YANGI: rol sandbox
 * PUT    /api/ai/sandbox/:role     ← YANGI: yangilash
 * DELETE /api/ai/sandbox/:role     ← YANGI: reset
 */

const express = require('express');
const router  = express.Router();

// ─── Sub-modul routerlari ─────────────────────────────────────────────────────
const chatRoutes          = require('./chat/chatRoutes');
const educationRoutes     = require('./education/educationRoutes');
const financeRoutes       = require('./finance/financeRoutes');
const managementRoutes    = require('./management/managementRoutes');
const communicationRoutes = require('./communication/communicationRoutes');
const schedulingRoutes    = require('./scheduling/schedulingRoutes');
const reportsRoutes       = require('./reports/reportsRoutes');
const keysRoutes          = require('./keys/keysRoutes');
const sandboxRoutes       = require('./sandbox/sandboxRoutes');
const studentRoutes       = require('./student/studentRoutes');

// ─── Routerlarni ulash ────────────────────────────────────────────────────────
router.use('/',              chatRoutes);          // /api/ai/chat, /api/ai/sessions
router.use('/education',     educationRoutes);     // /api/ai/education/stats
router.use('/finance',       financeRoutes);       // /api/ai/finance/summary, /debtors
router.use('/management',    managementRoutes);    // /api/ai/management/staff
router.use('/communication', communicationRoutes); // /api/ai/communication/stats
router.use('/scheduling',    schedulingRoutes);    // /api/ai/scheduling/holidays, /upcoming
router.use('/reports',       reportsRoutes);       // /api/ai/reports/overview
router.use('/',              keysRoutes);          // /api/ai/keys, /api/ai/usage
router.use('/',              sandboxRoutes);       // /api/ai/sandbox
router.use('/student',       studentRoutes);       // /api/ai/student/chat, /sessions (o'quvchi)

module.exports = router;

