const express = require('express');
const router = express.Router();
const hustleHeroesController = require('../controllers/hustleHeroesController');

// GET all employees (Hustle Heroes)
router.get('/', hustleHeroesController.getAllEmployees);

// GET employee by ID
router.get('/:id', hustleHeroesController.getEmployeeById);

//Update employee by ID
router.put('/:id', hustleHeroesController.updateEmployee);

//block employee by ID
router.patch('/:id', hustleHeroesController.blockEmployee);

module.exports = router;
