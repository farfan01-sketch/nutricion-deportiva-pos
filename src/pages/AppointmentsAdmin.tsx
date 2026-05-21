import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Phone, 
  Mail, 
  Trash2, 
  Check, 
  X, 
  RefreshCw, 
  Smartphone,
  Plus, 
  Settings, 
  Sliders, 
  Search, 
  UserCheck, 
  MessageSquare, 
  AlertCircle
} from 'lucide-react';
import { appointmentService } from '../services/appointments';
import { Appointment, AppointmentService, AppointmentSettings } from '../types/appointments';

// Current currency formatter
const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(val);
};

const AppointmentsAdmin: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<AppointmentService[]>([]);
  const [settings, setSettings] = useState<AppointmentSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Search/Filters
  const [activeTab, setActiveTab] = useState<'appointments' | 'services' | 'settings'>('appointments');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals / Form states
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<AppointmentService | null>(null);
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    description: '',
    duration_minutes: 60,
    price: 0,
    is_active: true
  });

  const [savingService, setSavingService] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Load resources
  const loadData = async () => {
    setLoading(true);
    try {
      const allAppts = await appointmentService.getAllAppointments();
      setAppointments(allAppts);

      const allServs = await appointmentService.getServices();
      setServices(allServs);

      const generalSettings = await appointmentService.getSettings();
      setSettings(generalSettings);
    } catch (err) {
      console.error('Error loading admin scheduling data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Appointments
  const filteredAppointments = appointments.filter(appt => {
    // Status filter
    if (statusFilter !== 'all' && appt.status !== statusFilter) return false;
    
    // Date filter
    if (dateFilter && appt.appointment_date !== dateFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const nameMatch = appt.client_name.toLowerCase().includes(query);
      const phoneMatch = appt.client_phone.includes(query);
      const emailMatch = appt.client_email?.toLowerCase().includes(query) || false;
      const serviceMatch = appt.service?.name.toLowerCase().includes(query) || false;
      return nameMatch || phoneMatch || emailMatch || serviceMatch;
    }

    return true;
  });

  // Services admin actions
  const handleOpenServiceModal = (service: AppointmentService | null = null) => {
    if (service) {
      setEditingService(service);
      setServiceFormData({
        name: service.name,
        description: service.description,
        duration_minutes: service.duration_minutes,
        price: service.price,
        is_active: service.is_active
      });
    } else {
      setEditingService(null);
      setServiceFormData({
        name: '',
        description: '',
        duration_minutes: 60,
        price: 0,
        is_active: true
      });
    }
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceFormData.name) return;

    setSavingService(true);
    try {
      if (editingService) {
        await appointmentService.updateService(editingService.id, serviceFormData);
      } else {
        await appointmentService.createService(serviceFormData);
      }
      setIsServiceModalOpen(false);
      // Reload services
      const allServs = await appointmentService.getServices();
      setServices(allServs);
    } catch (err) {
      console.error('Error saving appointment service:', err);
      alert('Error al guardar el servicio de cita.');
    } finally {
      setSavingService(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este servicio de citas?')) return;
    try {
      await appointmentService.deleteService(id);
      const allServs = await appointmentService.getServices();
      setServices(allServs);
    } catch (err) {
      console.error('Failed to delete service:', err);
      alert('No se pudo eliminar el servicio.');
    }
  };

  // Appointment operational statuses
  const handleUpdateStatus = async (id: string, nextStatus: 'pending' | 'confirmed' | 'cancelled' | 'attended') => {
    try {
      await appointmentService.updateAppointmentStatus(id, nextStatus);
      // Refresh list
      const allAppts = await appointmentService.getAllAppointments();
      setAppointments(allAppts);
    } catch (err) {
      console.error('Error changing appointment status:', err);
      alert('No se pudo actualizar el estado de la cita.');
    }
  };

  // Dispatch reminder action
  const handleSendReminder = async (appt: Appointment) => {
    try {
      const res = await appointmentService.sendReminder(appt);
      if (res) {
        alert(`¡Recordatorio enviado exitosamente a ${appt.client_name}!`);
      } else {
        alert('No se pudo enviar el recordatorio. Verifica que WhatsApp esté habilitado en la pestaña Ajustes y las claves de Evolution API sean válidas.');
      }
    } catch (err) {
      console.error('Error dispatching WhatsApp reminder:', err);
      alert('Error al enviar el recordatorio.');
    }
  };

  // Update central settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSavingSettings(true);
    try {
      await appointmentService.updateSettings(settings);
      alert('¡Configuración de la Agenda guardada correctamente!');
    } catch (err) {
      console.error('Error updating general settings:', err);
      alert('Error de guardar la configuración.');
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleDayInSettings = (dayNum: number) => {
    if (!settings) return;
    let updatedDays = [...settings.working_days];
    if (updatedDays.includes(dayNum)) {
      updatedDays = updatedDays.filter(d => d !== dayNum);
    } else {
      updatedDays.push(dayNum);
    }
    setSettings({ ...settings, working_days: updatedDays });
  };

  // Safe weekday helper
  const DAYS_LIST = [
    { label: 'Lun', num: 1 },
    { label: 'Mar', num: 2 },
    { label: 'Mié', num: 3 },
    { label: 'Jue', num: 4 },
    { label: 'Vie', num: 5 },
    { label: 'Sáb', num: 6 },
    { label: 'Dom', num: 7 },
  ];

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Cargando panel de agenda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="appointments-admin-view">
      {/* Visual Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Calendar className="text-primary-600" />
            <span>Módulo de Agenda</span>
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Citas de Nutrición y Entrenamiento Deportivo</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            title="Recargar datos"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => handleOpenServiceModal()}
            className="px-4 py-2.5 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-100 hover:bg-primary-700 transition-all flex items-center gap-1.5 text-xs"
          >
            <Plus size={16} />
            Nuevo Servicio
          </button>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'appointments'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar size={16} />
          Citas Agendadas
          {appointments.filter(a => a.status === 'pending').length > 0 && (
            <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-black">
              {appointments.filter(a => a.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'services'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders size={16} />
          Catálogo Servicios ({services.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-5 py-3 border-b-2 font-bold text-sm transition-all flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings size={16} />
          Ajustes de Agenda
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'appointments' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por cliente, WhatsApp o servicio..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Filter Date */}
            <div className="w-full md:w-auto">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold"
              />
            </div>

            {/* Status Select */}
            <div className="w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold"
              >
                <option value="all">Todos los Estados</option>
                <option value="pending">⏳ Pendiente</option>
                <option value="confirmed">✅ Confirmada</option>
                <option value="attended">👤 Asistió</option>
                <option value="cancelled">❌ Cancelada</option>
              </select>
            </div>

            {dateFilter || searchQuery || statusFilter !== 'all' ? (
              <button
                onClick={() => {
                  setDateFilter('');
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-xs text-rose-500 font-bold uppercase tracking-wider"
              >
                Limpiar
              </button>
            ) : null}
          </div>

          {/* Bookings List Grid */}
          {filteredAppointments.length === 0 ? (
            <div className="bg-white py-16 text-center border border-slate-200 rounded-3xl space-y-4">
              <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-slate-300 mx-auto">
                <Calendar size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-slate-800 font-bold">No hay citas registradas</p>
                <p className="text-slate-400 text-xs">Alinea los filtros de búsqueda o registra una cita de prueba.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAppointments.map(appt => {
                const isPending = appt.status === 'pending';
                const isConfirmed = appt.status === 'confirmed';
                const isAttended = appt.status === 'attended';
                const isCancelled = appt.status === 'cancelled';

                // Format Appointment Date Legible
                let formattedDate = appt.appointment_date;
                try {
                  const parts = appt.appointment_date.split('-');
                  if (parts.length === 3) formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                } catch (_) {}

                return (
                  <div 
                    key={appt.id} 
                    className={`bg-white rounded-3xl border shadow-sm p-5 flex flex-col justify-between transition-all ${
                      isPending ? 'border-amber-200 bg-amber-50/5' : 
                      isConfirmed ? 'border-primary-100' : 
                      isAttended ? 'border-emerald-100 bg-emerald-50/5' : 'border-slate-100 grayscale-[30%] opacity-70'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Name / Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary-600">
                              {appt.service?.name || 'Servicio Desconocido'}
                            </span>
                          </div>
                          <h4 className="text-md font-black text-slate-900 mt-1 uppercase tracking-tight">{appt.client_name}</h4>
                        </div>
                        
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide leading-none ${
                          isPending ? 'bg-amber-100 text-amber-700' :
                          isConfirmed ? 'bg-blue-100 text-blue-700' :
                          isAttended ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isPending ? 'Pendiente' : isConfirmed ? 'Confirmada' : isAttended ? 'Asistió' : 'Cancelada'}
                        </span>
                      </div>

                      {/* Time / Contact details */}
                      <div className="space-y-2 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-400" />
                          <span className="font-bold text-slate-800">{formattedDate} a las {appt.appointment_time} Hrs</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-slate-400" />
                          <span className="font-medium text-slate-700">{appt.client_phone}</span>
                        </div>
                        {appt.client_email && (
                          <div className="flex items-center gap-2">
                            <Mail size={14} className="text-slate-400" />
                            <span className="truncate text-slate-700">{appt.client_email}</span>
                          </div>
                        )}
                        {appt.notes && (
                          <div className="mt-2.5 p-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] leading-relaxed italic text-slate-500">
                            <strong>Notas:</strong> {appt.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Operational Actions */}
                    <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap gap-1.5 justify-end">
                      {isPending && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(appt.id, 'confirmed')}
                            className="px-2.5 py-1.5 bg-primary-600 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1 hover:bg-primary-700 transition-all"
                            title="Confirmar cita y enviar WhatsApp"
                          >
                            <Check size={12} />
                            Confirmar
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                            className="px-2.5 py-1.5 bg-rose-100 text-rose-700 font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1 hover:bg-rose-200 transition-all"
                          >
                            <X size={12} />
                            Declinar / Cancelar
                          </button>
                        </>
                      )}

                      {isConfirmed && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(appt.id, 'attended')}
                            className="px-2.5 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1 hover:bg-emerald-700 transition-all"
                            title="Completar asistencia"
                          >
                            <UserCheck size={12} />
                            Marcar Asistencia
                          </button>
                          <button
                            onClick={() => handleSendReminder(appt)}
                            className="px-2.5 py-1.5 bg-teal-50 border border-teal-200 text-teal-700 font-bold rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1 hover:bg-teal-100 transition-all"
                            title="Enviar recordatorio automático por WhatsApp"
                          >
                            <MessageSquare size={12} />
                            Remind WA
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(appt.id, 'cancelled')}
                            className="px-2.5 py-1.5 bg-slate-100 text-slate-600 font-bold rounded-lg text-[10px] tracking-wider hover:bg-slate-200 transition-all"
                          >
                            Cancelar
                          </button>
                        </>
                      )}

                      {(isAttended || isCancelled) && (
                        <button
                          onClick={() => handleUpdateStatus(appt.id, 'pending')}
                          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-100 transition-all"
                        >
                          Reabrir Cita
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB SERVICES CRUD */}
      {activeTab === 'services' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-900 font-black text-md uppercase tracking-tight">Servicios de Citas Disponibles</h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">
              {services.length} Total
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Servicio</th>
                  <th className="py-3 px-4">Duración</th>
                  <th className="py-3 px-4">Inversión (Precio)</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {services.map(srv => (
                  <tr key={srv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4 font-bold text-slate-900 uppercase">
                      <div>{srv.name}</div>
                      <div className="text-[10px] font-medium text-slate-400 mt-1 leading-relaxed lowercase truncate max-w-sm">
                        {srv.description}
                      </div>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-500">{srv.duration_minutes} minutos</td>
                    <td className="py-4 px-4 font-bold text-slate-900">{formatCurrency(srv.price)}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        srv.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-150 text-slate-500'
                      }`}>
                        {srv.is_active ? 'Activo' : 'Pausado'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleOpenServiceModal(srv)}
                        className="p-1 px-2.5 rounded bg-slate-100 text-slate-600 hover:bg-primary-600 hover:text-white transition-all font-bold text-[10px] uppercase"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteService(srv.id)}
                        className="p-1 px-2 text-rose-500 hover:bg-rose-50 rounded transition-all"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB SETTINGS CONFIGURATION */}
      {activeTab === 'settings' && settings && (
        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Horarios Básicos */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-900 text-md uppercase tracking-tight pb-3 border-b border-slate-100">
              Horario de Atención
            </h3>

            {/* Días laborales select */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Días Laborales</label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS_LIST.map(day => {
                  const isChecked = settings.working_days.includes(day.num);
                  return (
                    <button
                      type="button"
                      key={day.num}
                      onClick={() => toggleDayInSettings(day.num)}
                      className={`px-3.5 py-2 font-black rounded-xl text-xs transition-all border ${
                        isChecked 
                          ? 'bg-primary-600 border-primary-600 text-white shadow-sm' 
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-800'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Config horas atención */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hora Inicio</label>
                <input
                  type="text"
                  value={settings.start_time}
                  onChange={(e) => setSettings({ ...settings, start_time: e.target.value })}
                  placeholder="08:00"
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-slate-700 text-xs font-bold outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hora Cierre</label>
                <input
                  type="text"
                  value={settings.end_time}
                  onChange={(e) => setSettings({ ...settings, end_time: e.target.value })}
                  placeholder="18:00"
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-slate-700 text-xs font-bold outline-none"
                />
              </div>
            </div>

            {/* Break / Comida */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Receso Inicia (Comida)</label>
                <input
                  type="text"
                  value={settings.break_start_time || ''}
                  onChange={(e) => setSettings({ ...settings, break_start_time: e.target.value || undefined })}
                  placeholder="14:00"
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-slate-700 text-xs font-bold outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Receso Termina</label>
                <input
                  type="text"
                  value={settings.break_end_time || ''}
                  onChange={(e) => setSettings({ ...settings, break_end_time: e.target.value || undefined })}
                  placeholder="15:00"
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-slate-700 text-xs font-bold outline-none"
                />
              </div>
            </div>

            {/* Slots config */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Frecuencia Citas</label>
                <select
                  value={settings.interval_minutes}
                  onChange={(e) => setSettings({ ...settings, interval_minutes: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-slate-700 text-xs font-bold outline-none"
                >
                  <option value={30}>Cada 30 min</option>
                  <option value={45}>Cada 45 min</option>
                  <option value={60}>Cada 60 min (1 Hora)</option>
                  <option value={90}>Cada 90 min</option>
                  <option value={120}>Cada 2 Horas</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cupos Simultáneos</label>
                <input
                  type="number"
                  min={1}
                  value={settings.simultaneous_slots}
                  onChange={(e) => setSettings({ ...settings, simultaneous_slots: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-slate-700 text-xs font-bold outline-none"
                />
              </div>
            </div>
          </div>

          {/* Notificaciones WhatsApp Evolution API */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-md uppercase tracking-tight flex items-center gap-2">
                  <Smartphone className="text-emerald-500" />
                  Notificaciones WhatsApp
                </h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.whatsapp_enabled}
                    onChange={(e) => setSettings({ ...settings, whatsapp_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                </label>
              </div>

              {settings.whatsapp_enabled ? (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-2 text-[10.5px] text-emerald-800 font-medium leading-relaxed mb-1">
                    <Check size={15} className="shrink-0 text-emerald-500 mt-0.5" />
                    <div>
                      <strong>¡Configuración Automática Integrada!</strong> El módulo de citas reutiliza automáticamente y de forma segura la misma instancia, número, URL y clave de <strong>Evolution API</strong> de tu tienda. No necesitas ingresar credenciales.
                    </div>
                  </div>

                  {/* WhatsApp Templates */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mensaje Confirmación</label>
                    <textarea
                      rows={2}
                      value={settings.whatsapp_template_confirmation || ''}
                      onChange={(e) => setSettings({ ...settings, whatsapp_template_confirmation: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-slate-700 text-xs outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mensaje Recordatorio</label>
                    <textarea
                      rows={2}
                      value={settings.whatsapp_template_reminder || ''}
                      onChange={(e) => setSettings({ ...settings, whatsapp_template_reminder: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-slate-700 text-xs outline-none resize-none"
                    />
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-2 text-[10px] text-amber-700 font-medium">
                    <AlertCircle size={14} className="shrink-0 text-amber-500 mt-0.5" />
                    <div>
                      <strong>Tip:</strong> Puedes usar variables: <code className="bg-amber-100 font-bold px-1 py-0.5 rounded">{"{{cliente}}"}</code>, <code className="bg-amber-100 font-bold px-1 py-0.5 rounded">{"{{servicio}}"}</code>, <code className="bg-amber-100 font-bold px-1 py-0.5 rounded">{"{{fecha}}"}</code> y <code className="bg-amber-100 font-bold px-1 py-0.5 rounded">{"{{hora}}"}</code> en las plantillas.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 font-medium text-xs">
                  Las notificaciones automáticas por WhatsApp están deshabilitadas temporariamente.
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-3 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition-all disabled:opacity-50"
              >
                {savingSettings ? 'Guardando...' : 'Guardar Ajustes'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* SERVICE MODAL WINDOW */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsServiceModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingService ? 'Editar Servicio' : 'Nuevo Servicio de Citas'}
              </h2>
              <button onClick={() => setIsServiceModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre del Servicio *</label>
                <input
                  required
                  type="text"
                  value={serviceFormData.name}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                  placeholder="Ej. Asesoría Nutricional Avanzada"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-xs text-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción del Servicio</label>
                <textarea
                  rows={3}
                  value={serviceFormData.description}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                  placeholder="Instrucciones, qué incluye, materiales necesarios, etc..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none resize-none text-xs text-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duración (Minutos)</label>
                  <input
                    required
                    type="number"
                    min={15}
                    value={serviceFormData.duration_minutes}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, duration_minutes: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-xs text-slate-700"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Precio ($ MXN)</label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={serviceFormData.price}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, price: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-xs text-slate-700"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="srv_is_active"
                  checked={serviceFormData.is_active}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300"
                />
                <label htmlFor="srv_is_active" className="text-xs font-bold text-slate-600 select-none cursor-pointer">
                  Habilitar servicio para agendar en línea
                </label>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingService}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-primary-100"
                >
                  {savingService ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsAdmin;
