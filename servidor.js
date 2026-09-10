import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Importando os modelos que já temos
import Vehicle from './modelos/Vehicle.js';
import Launch from './modelos/Launch.js';
import User from './modelos/User.js';
import { verifyToken } from './middleware/auth.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'segredo_super_secreto_carro';

// Conexão com o MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('🚀 Conectado ao MongoDB Atlas com sucesso!'))
  .catch((err) => console.error('Erro ao conectar ao MongoDB:', err));

// ================= AUTENTICAÇÃO (AUTH) =================

// Rota de Registro
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro no registro: ' + error.message });
  }
});

// Rota de Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'E-mail ou senha inválidos.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'E-mail ou senha inválidos.' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, email: user.email });
  } catch (error) {
    res.status(500).json({ error: 'Erro no login: ' + error.message });
  }
});

// ================= ROTAS DE VEÍCULOS (Protegidas por RLS) =================

app.post('/api/vehicles', verifyToken, async (req, res) => {
  try {
    const { name, brand, model, year, plate, currentKm } = req.body;
    const newVehicle = new Vehicle({
      userId: req.userId,
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

app.get('/api/vehicles', verifyToken, async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ userId: req.userId });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar veículos: ' + error.message });
  }
});

// ================= ROTAS DE LANÇAMENTOS (Protegidas) =================

app.post('/api/launches', verifyToken, async (req, res) => {
  try {
    let { vehicleId, type, description, cost, km, liters, date, notes } = req.body;

    const vehicle = await Vehicle.findOne({ _id: vehicleId, userId: req.userId });
    if (!vehicle) {
      return res.status(403).json({ error: 'Veículo não encontrado ou sem permissão.' });
    }

    const newLaunch = new Launch({
      vehicleId,
      type,
      description,
      cost: Number(cost),
      km: Number(km),
      liters: liters ? Number(liters) : undefined,
      date: date || Date.now(),
      notes
    });

    const savedLaunch = await newLaunch.save();

    if (Number(km) > vehicle.currentKm) {
      vehicle.currentKm = Number(km);
      await vehicle.save();
    }

    res.status(201).json(savedLaunch);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar lançamento: ' + error.message });
  }
});

app.get('/api/launches/vehicle/:vehicleId', verifyToken, async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findOne({ _id: vehicleId, userId: req.userId });
    if (!vehicle) {
      return res.status(403).json({ error: 'Acesso negado a este veículo.' });
    }

    const launches = await Launch.find({ vehicleId }).sort({ km: -1, date: -1 });
    res.json(launches);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar lançamentos: ' + error.message });
  }
});

// Rota de status
app.get('/api/status', (req, res) => {
  res.json({ status: 'API rodando perfeitamente!', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});