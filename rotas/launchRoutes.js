import express from 'express';
import Launch from '../modelos/Launch.js';
import Vehicle from '../modelos/Vehicle.js';

const router = express.Router();

// ROTA: Criar um novo lançamento (Abastecimento, Manutenção ou Gasto Fixo)
router.post('/', async (req, res) => {
  try {
    const { vehicleId, type, description, cost, km, liters, date, notes } = req.body;

    // Criar o lançamento
    const newLaunch = new Launch({
      vehicleId,
      type,
      description,
      cost,
      km,
      liters,
      date: date || Date.now(),
      notes
    });

    const savedLaunch = await newLaunch.save();

    // Atualiza automaticamente a quilometragem atual do veículo se o KM informado for maior
    const vehicle = await Vehicle.findById(vehicleId);
    if (vehicle && km > vehicle.currentKm) {
      vehicle.currentKm = km;
      await vehicle.save();
    }

    res.status(201).json(savedLaunch);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar lançamento: ' + error.message });
  }
});

// ROTA: Listar todos os lançamentos de um veículo específico
router.get('/vehicle/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const launches = await Launch.find({ vehicleId }).sort({ km: -1, date: -1 });
    res.json(launches);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar lançamentos: ' + error.message });
  }
});

export default router;