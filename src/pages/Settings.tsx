import React, { useState, useEffect } from 'react';
import { Mail, Plus, Trash2, ToggleLeft, ToggleRight, Save, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { settingsService } from '../services/settings';
import { NotificationEmail } from '../types';

const Settings: React.FC = () => {
  const [emails, setEmails] = useState<NotificationEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    try {
      setLoading(true);
      const data = await settingsService.getNotificationEmails();
      setEmails(data);
    } catch (err: any) {
      setError('Error al cargar los correos de notificación');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    try {
      setSaving(true);
      setError('');
      const added = await settingsService.addNotificationEmail(newEmail, newName);
      setEmails([added, ...emails]);
      setNewEmail('');
      setNewName('');
      setSuccess('Correo agregado correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Error al agregar el correo');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (id: string, currentStatus: boolean) => {
    try {
      const updated = await settingsService.updateNotificationEmail(id, { enabled: !currentStatus });
      setEmails(emails.map(e => e.id === id ? updated : e));
    } catch (err: any) {
      setError('Error al actualizar el estado del correo');
    }
  };

  const handleDeleteEmail = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este correo?')) return;

    try {
      await settingsService.deleteNotificationEmail(id);
      setEmails(emails.filter(e => e.id !== id));
      setSuccess('Correo eliminado');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError('Error al eliminar el correo');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
          <p className="text-slate-500">Gestiona las preferencias del sistema y notificaciones.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-600 rounded-xl flex items-center gap-3 border border-rose-100">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl flex items-center gap-3 border border-emerald-100">
          <CheckCircle2 size={20} />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario para agregar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="text-primary-500" size={20} />
              Agregar Correo
            </h2>
            <form onSubmit={handleAddEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  placeholder="ejemplo@correo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre (Opcional)
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  placeholder="Admin / Dueño"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Guardar Correo
              </button>
            </form>
          </div>
        </div>

        {/* Lista de correos */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Mail className="text-primary-500" size={20} />
                Correos de Notificación de Corte
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Los correos activos recibirán un reporte detallado cada vez que se cierre un turno.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="p-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-primary-500" size={32} />
                  <p className="text-slate-500 text-sm">Cargando correos...</p>
                </div>
              ) : emails.length === 0 ? (
                <div className="p-12 text-center">
                  <Mail className="mx-auto text-slate-300 mb-3" size={48} />
                  <p className="text-slate-500">No hay correos configurados.</p>
                </div>
              ) : (
                emails.map((email) => (
                  <div key={email.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${email.enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Mail size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{email.email}</p>
                        {email.name && <p className="text-xs text-slate-500">{email.name}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleEnabled(email.id, email.enabled)}
                        className={`p-2 rounded-lg transition-colors ${email.enabled ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                        title={email.enabled ? 'Desactivar' : 'Activar'}
                      >
                        {email.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      </button>
                      <button
                        onClick={() => handleDeleteEmail(email.id)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
