<script setup>
import { ref, onMounted } from 'vue';
import api from './services/api';

const token = ref(localStorage.getItem('token') || '');
const userEmail = ref(localStorage.getItem('userEmail') || '');

const isLoginMode = ref(true);
const authForm = ref({ email: '', password: '' });
const authError = ref('');

const vehicles = ref([]);
const selectedVehicle = ref(null);
const launches = ref([]);
const loading = ref(false);
const errorMessage = ref('');

const vehicleForm = ref({ name: '', brand: '', model: '', year: '', plate: '', currentKm: '' });
const launchForm = ref({ type: 'fuel', description: '', cost: '', km: '', liters: '', notes: '' });

// Ações de Autenticação
const handleAuth = async () => {
  try {
    authError.value = '';
    const endpoint = isLoginMode.value ? '/auth/login' : '/auth/register';
    const res = await api.post(endpoint, authForm.value);

    if (isLoginMode.value) {
      token.value = res.data.token;
      userEmail.value = res.data.email;
      localStorage.setItem('token', token.value);
      localStorage.setItem('userEmail', userEmail.value);
      fetchVehicles();
    } else {
      alert('Cadastro realizado com sucesso! Faça o login.');
      isLoginMode.value = true;
    }
  } catch (err) {
    authError.value = err.response?.data?.error || 'Erro na autenticação';
  }
};

const logout = () => {
  token.value = '';
  userEmail.value = '';
  localStorage.removeItem('token');
  localStorage.removeItem('userEmail');
  selectedVehicle.value = null;
  vehicles.value = [];
};

// Buscar veículos (com autenticação)
const fetchVehicles = async () => {
  try {
    const res = await api.get('/vehicles');
    vehicles.value = res.data;
  } catch (err) {
    console.error('Erro ao buscar veículos:', err);
  }
};

const registerVehicle = async () => {
  try {
    loading.value = true;
    await api.post('/vehicles', vehicleForm.value);
    vehicleForm.value = { name: '', brand: '', model: '', year: '', plate: '', currentKm: '' };
    await fetchVehicles();
  } catch (err) {
    errorMessage.value = err.response?.data?.error || 'Erro ao cadastrar veículo';
  } finally {
    loading.value = false;
  }
};

const selectVehicle = async (vehicle) => {
  selectedVehicle.value = vehicle;
  launchForm.value.km = vehicle.currentKm;
  await fetchLaunches(vehicle._id);
};

const fetchLaunches = async (vehicleId) => {
  try {
    const res = await api.get(`/launches/vehicle/${vehicleId}`);
    launches.value = res.data;
  } catch (err) {
    console.error('Erro ao buscar lançamentos:', err);
  }
};

const registerLaunch = async () => {
  if (!selectedVehicle.value) return;
  try {
    loading.value = true;
    await api.post('/launches', {
      vehicleId: selectedVehicle.value._id,
      ...launchForm.value
    });

    const tipoAtual = launchForm.value.type;
    launchForm.value = { type: tipoAtual, description: '', cost: '', km: selectedVehicle.value.currentKm, liters: '', notes: '' };

    await fetchVehicles();
    selectedVehicle.value = vehicles.value.find(v => v._id === selectedVehicle.value._id);
    await fetchLaunches(selectedVehicle.value._id);
  } catch (err) {
    errorMessage.value = err.response?.data?.error || 'Erro ao registrar lançamento';
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (token.value) fetchVehicles();
});
</script>

<template>
  <div class="container">
    <header class="header">
      <h1>🚗 Gestão Veicular Inteligente</h1>
      <p>Controle financeiro, consumo e histórico mecânico na nuvem</p>
    </header>

    <!-- TELA DE LOGIN / CADASTRO SE NÃO ESTIVER LOGADO -->
    <main v-if="!token" class="main-content">
      <section class="card auth-card">
        <h2>{{ isLoginMode ? 'Entrar no Sistema' : 'Criar Nova Conta' }}</h2>
        <form @submit.prevent="handleAuth">
          <div class="form-group">
            <label>E-mail</label>
            <input type="email" v-model="authForm.email" required placeholder="seu@email.com" />
          </div>
          <div class="form-group">
            <label>Senha</label>
            <input type="password" v-model="authForm.password" required placeholder="******" />
          </div>
          <p v-if="authError" class="error">{{ authError }}</p>
          <button type="submit" class="btn-primary">{{ isLoginMode ? 'Entrar' : 'Cadastrar' }}</button>
        </form>
        <p class="toggle-auth" @click="isLoginMode = !isLoginMode">
          {{ isLoginMode ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login' }}
        </p>
      </section>
    </main>

    <!-- TELA DO SISTEMA SE ESTIVER LOGADO -->
    <main v-else class="main-content">
      <div class="user-bar">
        <span>Logado como: <strong>{{ userEmail }}</strong></span>
        <button @click="logout" class="btn-logout">Sair</button>
      </div>

      <div v-if="!selectedVehicle">
        <section class="card">
          <h2>Cadastrar Novo Veículo</h2>
          <form @submit.prevent="registerVehicle">
            <div class="form-grid">
              <div class="form-group"><label>Apelido</label><input type="text" v-model="vehicleForm.name" required placeholder="Ex: Meu Civic" /></div>
              <div class="form-group"><label>Marca</label><input type="text" v-model="vehicleForm.brand" required placeholder="Ex: Honda" /></div>
              <div class="form-group"><label>Modelo</label><input type="text" v-model="vehicleForm.model" required placeholder="Ex: EXL" /></div>
              <div class="form-group"><label>Ano</label><input type="number" v-model="vehicleForm.year" required placeholder="Ex: 2021" /></div>
              <div class="form-group"><label>Placa</label><input type="text" v-model="vehicleForm.plate" required placeholder="Ex: ABC-1234" /></div>
              <div class="form-group"><label>KM Atual</label><input type="number" v-model="vehicleForm.currentKm" required placeholder="Ex: 45000" /></div>
            </div>
            <button type="submit" class="btn-primary" :disabled="loading">Cadastrar Veículo</button>
          </form>
        </section>

        <section class="card">
          <h2>Minha Garagem</h2>
          <div v-if="vehicles.length === 0" class="empty">Nenhum veículo cadastrado.</div>
          <div class="vehicles-grid" v-else>
            <div v-for="vehicle in vehicles" :key="vehicle._id" class="vehicle-card" @click="selectVehicle(vehicle)">
              <h3>{{ vehicle.name }}</h3>
              <p><strong>{{ vehicle.brand }} {{ vehicle.model }}</strong> ({{ vehicle.year }})</p>
              <p>Placa: {{ vehicle.plate }}</p>
              <p class="km-tag">🚗 Odômetro: <strong>{{ vehicle.currentKm }} km</strong></p>
              <button class="btn-secondary">Gerenciar Veículo →</button>
            </div>
          </div>
        </section>
      </div>

      <div v-else>
        <button @click="selectedVehicle = null" class="btn-back">← Voltar para a Garagem</button>
        
        <div class="vehicle-header-card">
          <h2>{{ selectedVehicle.name }} ({{ selectedVehicle.brand }} {{ selectedVehicle.model }})</h2>
          <p>Placa: {{ selectedVehicle.plate }} | Ano: {{ selectedVehicle.year }}</p>
          <p class="highlight-km">Quilometragem Atualizada: <strong>{{ selectedVehicle.currentKm }} km</strong></p>
        </div>

        <section class="card">
          <h2>Novo Lançamento / Gasto</h2>
          <form @submit.prevent="registerLaunch">
            <div class="form-grid">
              <div class="form-group">
                <label>Tipo de Lançamento</label>
                <select v-model="launchForm.type" class="select-input">
                  <option value="fuel">⛽ Abastecimento</option>
                  <option value="maintenance">🔧 Manutenção / Peça</option>
                  <option value="fixed">📄 Gasto Fixo (IPVA/Seguro)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Descrição</label>
                <input type="text" v-model="launchForm.description" required />
              </div>
              <div class="form-group">
                <label>Valor (R$)</label>
                <input type="number" step="0.01" v-model="launchForm.cost" required />
              </div>
              <div class="form-group">
                <label>Quilometragem Atual</label>
                <input type="number" v-model="launchForm.km" required />
              </div>
              <div class="form-group" v-if="launchForm.type === 'fuel'">
                <label>Litros Abastecidos</label>
                <input type="number" step="0.01" v-model="launchForm.liters" />
              </div>
              <div class="form-group">
                <label>Observações / Garantia</label>
                <input type="text" v-model="launchForm.notes" />
              </div>
            </div>
            <button type="submit" class="btn-primary" :disabled="loading">Salvar Lançamento</button>
          </form>
        </section>

        <section class="card">
          <h2>Linha do Tempo</h2>
          <div v-if="launches.length === 0" class="empty">Nenhum registro encontrado.</div>
          <div class="timeline" v-else>
            <div v-for="item in launches" :key="item._id" class="timeline-item" :class="item.type">
              <div class="timeline-badge">
                <span v-if="item.type === 'fuel'">⛽</span>
                <span v-else-if="item.type === 'maintenance'">🔧</span>
                <span v-else>📄</span>
              </div>
              <div class="timeline-content">
                <div class="timeline-header">
                  <strong>{{ item.description }}</strong>
                  <span class="cost">R$ {{ Number(item.cost).toFixed(2) }}</span>
                </div>
                <p class="details">KM: {{ item.km }} km <span v-if="item.liters">| {{ item.liters }}L</span></p>
                <span class="date">{{ new Date(item.date).toLocaleDateString() }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<style>
body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; color: #333; margin: 0; padding: 0; }
.container { max-width: 900px; margin: 0 auto; padding: 20px; }
.header { text-align: center; margin-bottom: 30px; }
.header h1 { color: #1e293b; margin-bottom: 5px; }
.header p { color: #64748b; }
.card { background: #ffffff; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-bottom: 25px; }
.auth-card { max-width: 400px; margin: 0 auto; }
.toggle-auth { text-align: center; color: #2563eb; cursor: pointer; margin-top: 15px; font-size: 0.9rem; }
.user-bar { display: flex; justify-content: space-between; align-items: center; background: #e2e8f0; padding: 10px 20px; border-radius: 8px; margin-bottom: 20px; }
.btn-logout { background: #dc2626; color: white; border: none; padding: 5px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.card h2 { margin-top: 0; font-size: 1.25rem; color: #1e293b; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 20px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
.form-group { display: flex; flex-direction: column; margin-bottom: 10px; }
.form-group label { font-size: 0.85rem; font-weight: 600; margin-bottom: 5px; color: #475569; }
.form-group input, .select-input { padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; }
.btn-primary { margin-top: 10px; background-color: #2563eb; color: white; border: none; padding: 12px 20px; font-size: 1rem; font-weight: bold; border-radius: 8px; cursor: pointer; width: 100%; }
.btn-primary:hover { background-color: #1d4ed8; }
.btn-secondary { margin-top: 10px; background-color: #f1f5f9; color: #2563eb; border: 1px solid #cbd5e1; padding: 8px; font-size: 0.9rem; font-weight: bold; border-radius: 6px; cursor: pointer; width: 100%; }
.btn-back { background: none; border: none; color: #2563eb; font-weight: bold; cursor: pointer; font-size: 1rem; margin-bottom: 15px; padding: 0; }
.error { color: #dc2626; margin-top: 10px; font-size: 0.9rem; }
.empty { color: #64748b; text-align: center; padding: 20px; }
.vehicles-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
.vehicle-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; cursor: pointer; }
.vehicle-header-card { background: #1e293b; color: white; padding: 20px; border-radius: 12px; margin-bottom: 25px; }
.vehicle-header-card h2 { margin: 0 0 5px 0; color: white; border: none; padding: 0; }
.highlight-km { color: #38bdf8 !important; font-size: 1.1rem; margin-top: 10px !important; }
.timeline { display: flex; flex-direction: column; gap: 12px; }
.timeline-item { display: flex; align-items: flex-start; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; border-left: 4px solid #64748b; }
.timeline-item.fuel { border-left-color: #10b981; }
.timeline-item.maintenance { border-left-color: #f59e0b; }
.timeline-item.fixed { border-left-color: #8b5cf6; }
.timeline-badge { font-size: 1.5rem; margin-right: 15px; }
.timeline-content { flex-grow: 1; }
.timeline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
.cost { font-weight: bold; color: #059669; font-size: 1.1rem; }
.details { margin: 0; font-size: 0.9rem; color: #475569; }
.date { font-size: 0.75rem; color: #94a3b8; margin-top: 5px; display: block; }
</style>