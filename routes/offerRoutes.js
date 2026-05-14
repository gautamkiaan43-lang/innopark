const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', offerController.getAll);
router.post('/', offerController.create);
// router.post('/:id/convert-to-invoice', offerController.convertToInvoice);
// router.post('/:id/send-email', offerController.sendEmail);
router.get('/:id', offerController.getById);
// router.get('/:id/pdf', offerController.getPDF);
router.put('/:id', offerController.update);
router.delete('/:id', offerController.delete);

module.exports = router;
