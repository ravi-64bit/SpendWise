const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// GET all transactions
router.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new transaction
router.post('/', async (req, res) => {
  const { upiId, amount, category, purpose, date, notes, status } = req.body;

  const transaction = new Transaction({
    upiId,
    amount,
    category,
    purpose,
    date,
    notes,
    status,
  });

  try {
    const newTransaction = await transaction.save();
    res.status(201).json(newTransaction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET a single transaction by ID
router.get('/:id', getTransaction, (req, res) => {
  res.json(res.transaction);
});

// PUT (update) a transaction
router.put('/:id', getTransaction, async (req, res) => {
    const { upiId, amount, category, purpose, date, notes, status } = req.body;
    
    if (upiId != null) res.transaction.upiId = upiId;
    if (amount != null) res.transaction.amount = amount;
    if (category != null) res.transaction.category = category;
    if (purpose != null) res.transaction.purpose = purpose;
    if (date != null) res.transaction.date = date;
    if (notes != null) res.transaction.notes = notes;
    if (status != null) res.transaction.status = status;

    try {
        const updatedTransaction = await res.transaction.save();
        res.json(updatedTransaction);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});


// DELETE a transaction
router.delete('/:id', getTransaction, async (req, res) => {
  try {
    await res.transaction.remove();
    res.json({ message: 'Deleted Transaction' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Middleware to get a transaction by ID
async function getTransaction(req, res, next) {
  let transaction;
  try {
    transaction = await Transaction.findById(req.params.id);
    if (transaction == null) {
      return res.status(404).json({ message: 'Cannot find transaction' });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.transaction = transaction;
  next();
}

module.exports = router;
