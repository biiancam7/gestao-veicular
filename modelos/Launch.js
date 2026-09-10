import mongoose from 'mongoose';

const launchSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  type: { 
    type: String, 
    enum: ['fuel', 'maintenance', 'fixed'], // fuel = abastecimento, maintenance = manutenção, fixed = gasto fixo
    required: true 
  },
  description: { type: String, required: true }, // Ex: "Troca de Óleo", "Abastecimento Posto X", "IPVA 2026"
  cost: { type: Number, required: true }, // Valor pago em R$
  km: { type: Number, required: true }, // Quilometragem do painel no momento do gasto
  liters: { type: Number }, // Usado apenas se for abastecimento (para calcular média)
  date: { type: Date, default: Date.now },
  notes: { type: String } // Observações, garantia da peça, etc.
});

export default mongoose.model('Launch', launchSchema);