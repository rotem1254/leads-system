const express = require('express')
const rateLimit = require('express-rate-limit')
const router = express.Router()
const controller = require('../controllers/leadsController')
const { validateLeadBody } = require('../middleware/validate')
const { adminAuth } = require('../middleware/adminAuth')

const postLeadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — try again later' }
})

router.post('/', postLeadLimiter, validateLeadBody, controller.createLead)

router.get('/', adminAuth, controller.getLeads)
router.get('/:id', adminAuth, controller.getLead)
router.put('/:id', adminAuth, controller.updateLead)
router.delete('/:id', adminAuth, controller.deleteLead)

module.exports = router
