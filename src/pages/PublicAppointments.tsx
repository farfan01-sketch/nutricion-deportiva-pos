import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  MessageSquare,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { appointmentService } from '../services/appointments';
import { AppointmentService, AppointmentSettings } from '../types/appointments';

// Utility for formatting currencies
const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(val);
};

const PublicAppointments: React.FC = () => {
  const [services, setServices] = useState<AppointmentService[]>([]);
  const [settings, setSettings] = useState<AppointmentSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Selector states
  const [selectedService, setSelectedService] = useState<AppointmentService | null>(null);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<{ time: string; available: boolean; bookedCount: number }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Form states
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  
  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [successAppointment, setSuccessAppointment] = useState<any>(null);
  const [step, setStep] = useState<number>(1); // 1 = Servicio, 2 = Fecha y Hora, 3 = Datos, 4 = Éxito

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedServices = await appointmentService.getServices();
        const activeServices = storedServices.filter(s => s.is_active);
        setServices(activeServices);

        const loadedSettings = await appointmentService.getSettings();
        setSettings(loadedSettings);
      } catch (err) {
        console.error('Error loading public schedule setup:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Fetch slots whenever the selected date string changes
  useEffect(() => {
    if (!selectedDateStr) return;

    const loadSlots = async () => {
      setLoadingSlots(true);
      try {
        const slots = await appointmentService.getAvailableSlots(selectedDateStr);
        setAvailableSlots(slots);
        setSelectedTime(''); // Reset selected time
      } catch (err) {
        console.error('Error loading available times:', err);
      } finally {
        setLoadingSlots(false);
      }
    };
    loadSlots();
  }, [selectedDateStr]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => {
    const day = new Date(y, m, 1).getDay();
    return day === 0 ? 7 : day; // Translate Monday=1 ... Sunday=7
  };

  const daysInMonth = getDaysInMonth(year, month);
  const startDayOfWeek = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    // Prevent navigating to past months
    const today = new Date();
    if (year === today.getFullYear() && month <= today.getMonth()) return;
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const selectDate = (day: number) => {
    const selectedDate = new Date(year, month, day);
    // Formato YYYY-MM-DD local
    const yStr = selectedDate.getFullYear();
    const mStr = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const dStr = selectedDate.getDate().toString().padStart(2, '0');
    setSelectedDateStr(`${yStr}-${mStr}-${dStr}`);
  };

  const handleServiceSelect = (service: AppointmentService) => {
    setSelectedService(service);
    setStep(2);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDateStr || !selectedTime || !clientName || !clientPhone) return;

    setSubmitting(true);
    try {
      const created = await appointmentService.createAppointment({
        service_id: selectedService.id,
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail || undefined,
        appointment_date: selectedDateStr,
        appointment_time: selectedTime,
        status: 'pending', // Creadas públicamente quedan pendientes para que el POS las apruebe/confirme
        notes: notes || undefined
      });
      
      setSuccessAppointment(created);
      setStep(4);
    } catch (err) {
      console.error('Error submitting appointment booking:', err);
      alert('Hubo un error al agendar tu cita. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper arrays for calendar headers
  const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Cargando agenda de servicios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="appointments-portal">
      {/* Dynamic Header */}
      <header className="bg-white border-b border-slate-100 py-5 px-6 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-primary-600 rounded-2xl flex items-center justify-center text-white shadow-md">
              <Calendar size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">ND AGENDA</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Nutrición & Entrenamiento</p>
            </div>
          </div>
          <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3.5 py-1.5 rounded-full">
            Portal de Citas
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8">
        
        {/* Step Indicator (Not visible on step 4) */}
        {step < 4 && (
          <div className="mb-6 flex justify-between items-center bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm">
            {[1, 2, 3].map((num) => {
              let label = '';
              if (num === 1) label = 'Servicio';
              else if (num === 2) label = 'Horario';
              else if (num === 3) label = 'Tus Datos';

              const active = step >= num;
              const current = step === num;

              return (
                <div key={num} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    current 
                      ? 'bg-primary-600 text-white shadow-md scale-105' 
                      : active 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-slate-100 text-slate-400'
                  }`}>
                    {active && num < step ? '✓' : num}
                  </div>
                  <span className={`text-xs font-semibold hidden md:block ${
                    current ? 'text-primary-600 font-bold' : active ? 'text-slate-700' : 'text-slate-400'
                  }`}>{label}</span>
                </div>
              );
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="services-pick"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Selecciona tu servicio</h2>
                <p className="text-slate-500 text-sm max-w-lg mx-auto">Selecciona la sesión de asesoría o entrenamiento que deseas agendar con nuestros especialistas.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((srv) => (
                  <button
                    key={srv.id}
                    onClick={() => handleServiceSelect(srv)}
                    className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-primary-500 transition-all text-left group flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="w-10 h-10 bg-slate-50 border border-slate-100 group-hover:bg-primary-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-primary-600 transition-all">
                        <Package size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg uppercase tracking-tight group-hover:text-primary-600 transition-colors">{srv.name}</h3>
                        <p className="text-slate-500 text-xs mt-1.5 leading-relaxed">{srv.description}</p>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between w-full">
                      <div className="flex items-center gap-1 text-slate-500 text-xs font-bold">
                        <Clock size={14} />
                        <span>{srv.duration_minutes} min</span>
                      </div>
                      <span className="text-xl font-black text-slate-900">{formatCurrency(srv.price)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="schedule-pick"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6 animate-in fade-in"
            >
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setStep(1)} 
                  className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Paso anterior</p>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Fecha y Hora</h2>
                </div>
              </div>

              {selectedService && (
                <div className="bg-primary-50 border border-primary-100 rounded-3xl p-4 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center">
                      <Package size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-primary-500 uppercase tracking-wider">Servicio Seleccionado</p>
                      <h4 className="font-bold text-slate-900 leading-tight">{selectedService.name}</h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 font-medium">{selectedService.duration_minutes} minutos</p>
                    <p className="font-bold text-primary-700">{formatCurrency(selectedService.price)}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Calendario */}
                <div className="bg-white md:col-span-7 rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-md uppercase tracking-tight">
                      {MONTHS[month]} {year}
                    </h3>
                    <div className="flex gap-1">
                      <button 
                        onClick={prevMonth}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent"
                        disabled={year === new Date().getFullYear() && month <= new Date().getMonth()}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button 
                        onClick={nextMonth}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Dias de la semana headers */}
                  <div className="grid grid-cols-7 gap-2 text-center">
                    {WEEK_DAYS.map(wd => (
                      <span key={wd} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{wd}</span>
                    ))}
                  </div>

                  {/* Grid de dias */}
                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {/* Vacios al inicio */}
                    {Array.from({ length: startDayOfWeek - 1 }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="aspect-square" />
                    ))}

                    {/* Días del mes */}
                    {Array.from({ length: daysInMonth }).map((_, idx) => {
                      const dayNumber = idx + 1;
                      const thisDate = new Date(year, month, dayNumber);
                      
                      // Check if in the past
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const isPast = thisDate < today;

                      // Check if working day
                      const jsDayOfThis = thisDate.getDay();
                      const weekDayOfThis = jsDayOfThis === 0 ? 7 : jsDayOfThis;
                      const isWorkingDay = settings?.working_days.includes(weekDayOfThis);

                      const isSelected = selectedDateStr === `${year}-${(month + 1).toString().padStart(2, '0')}-${dayNumber.toString().padStart(2, '0')}`;

                      return (
                        <button
                          key={`day-${dayNumber}`}
                          onClick={() => selectDate(dayNumber)}
                          disabled={isPast || !isWorkingDay}
                          className={`aspect-square text-xs font-bold rounded-xl flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-primary-600 text-white shadow-md scale-105'
                              : isPast || !isWorkingDay
                                ? 'text-slate-300 cursor-not-allowed bg-transparent'
                                : 'text-slate-700 bg-slate-50 hover:bg-primary-50 hover:text-primary-700'
                          }`}
                        >
                          {dayNumber}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Slots de Hora */}
                <div className="bg-white md:col-span-5 rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 text-md uppercase tracking-tight flex items-center gap-1.5">
                      <Clock size={16} className="text-slate-400" />
                      Horarios Disponibles
                    </h3>

                    {!selectedDateStr ? (
                      <div className="text-center py-10 text-slate-400 text-xs font-semibold">
                        Selecciona un día en el calendario para ver horas disponibles.
                      </div>
                    ) : loadingSlots ? (
                      <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
                        <span className="text-xs text-slate-400 font-medium">Cargando horas de mañana...</span>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="text-center py-10 text-rose-500 text-xs font-semibold">
                        Este día no tiene bloques horarios configurados o laborables.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1">
                        {availableSlots.map(slot => (
                          <button
                            key={slot.time}
                            disabled={!slot.available}
                            onClick={() => setSelectedTime(slot.time)}
                            className={`py-3 rounded-xl font-bold text-xs border transition-all text-center ${
                              selectedTime === slot.time
                                ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                                : slot.available
                                  ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-800'
                                  : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed line-through'
                            }`}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedDateStr && selectedTime && (
                    <div className="mt-6 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setStep(3)}
                        className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-xl shadow-primary-100 transition-all flex items-center justify-center gap-2"
                      >
                        Confirmar Horario
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="client-details"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setStep(2)} 
                  className="p-2 bg-white rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Paso anterior</p>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Completa tus Datos</h2>
                </div>
              </div>

              {selectedService && selectedDateStr && selectedTime && (
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                      <CheckCircle2 size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Servicio Elegido</p>
                      <h4 className="font-black text-slate-800 text-sm mt-1 uppercase tracking-tight">{selectedService.name}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Horario Seleccionado</p>
                      <h4 className="font-bold text-slate-800 text-sm mt-1">
                        {(() => {
                          const parts = selectedDateStr.split('-');
                          return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : selectedDateStr;
                        })()} a las {selectedTime} Hrs
                      </h4>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleBookingSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <User size={14} className="text-slate-400" />
                      Nombre Completo *
                    </label>
                    <input
                      required
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ej. María Jose García"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone size={14} className="text-slate-400" />
                      WhatsApp / Celular *
                    </label>
                    <input
                      required
                      type="text"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="Ej. 9711234567"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none">Recibirás confirmación por este medio.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail size={14} className="text-slate-400" />
                    Correo Electrónico (Opcional)
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="Ej. maria@correo.com"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={14} className="text-slate-400" />
                    Notas o Motivo de la Cita (Opcional)
                  </label>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Cuéntanos brevemente si tienes alguna lesión, experiencia o meta específica..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-2xl shadow-xl shadow-primary-100 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                        <span>Agendando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        <span>Agendar Cita en Línea</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 4 && successAppointment && (
            <motion.div
              key="booking-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                <CheckCircle2 size={44} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">¡Cita Agendada Exitosamente!</h2>
                <p className="text-slate-500 text-sm">Tu cita ha sido guardada en nuestro sistema. El equipo administrador confirmará en breve tu horario. ¡Te esperamos!</p>
              </div>

              {/* Recibo breve de la cita */}
              <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 text-left space-y-3.5">
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Servicio</span>
                  <span className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">
                    {successAppointment.service?.name || selectedService?.name}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fecha</span>
                  <span className="text-sm font-bold text-slate-800">
                    {(() => {
                      const parts = successAppointment.appointment_date.split('-');
                      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : successAppointment.appointment_date;
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Horario</span>
                  <span className="text-sm font-bold text-slate-800">{successAppointment.appointment_time} Hrs</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Paciente / Cliente</span>
                  <span className="text-sm font-bold text-slate-800">{successAppointment.client_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inversión aprox.</span>
                  <span className="text-lg font-black text-slate-950">
                    {formatCurrency(successAppointment.service?.price || selectedService?.price || 0)}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    // Resetear formulario y volver a paso 1
                    setSelectedService(null);
                    setSelectedDateStr('');
                    setSelectedTime('');
                    setClientName('');
                    setClientPhone('');
                    setClientEmail('');
                    setNotes('');
                    setSuccessAppointment(null);
                    setStep(1);
                  }}
                  className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all"
                >
                  Agendar otra cita
                </button>
                <a
                  href={`https://wa.me/${successAppointment.client_phone.replace(/\D/g, '')}}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare size={18} />
                  Contactar por WhatsApp
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400 font-bold uppercase tracking-wider">
        © {new Date().getFullYear()} Nutrición Deportiva Istmo - Todos los derechos reservados.
      </footer>
    </div>
  );
};

export default PublicAppointments;
