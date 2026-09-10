
import express from 'express';
import Vehicle from '../modelos/Vehicle.js';

const router = express.Router();

// ROTA: Cadastrar um novo veículo (POST /api/vehicles)
router.post('/', async (req, res) => {
  try {
    const { name, brand, model, year, plate, currentKm } = req.body;
    
    const newVehicle = new Vehicle({
      name,
      brand,
      model,
      year,
      plate,
      currentKm
    });

    const savedVehicle = await newVehicle.save();
    res.status(201).json(savedVehicle);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao cadastrar veículo: ' + error.message });
  }
});

// ROTA: Listar todos os veículos (GET /api/vehicles)
router.get('/', async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar veículos: ' + error.message });
  }
});

export default router;