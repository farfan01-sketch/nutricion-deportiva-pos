import React, { useState, useEffect, useRef } from 'react';
import { 
  CreditCard, 
  Receipt, 
  Printer, 
  CheckCircle2, 
  AlertCircle,
  DollarSign,
  Wallet,
  ArrowRight
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { CatalogOrder, User, Shift, CashRegister } from '../../types';
import { saleService } from '../../services/sales';
import { catalogService } from '../../services/catalog';
import { shiftService } from '../../services/shifts';
import { formatCurrency } from '../../utils/format';
import Modal from '../Modal';
import Ticket from '../Ticket';

interface ProcessWebOrderToSaleModalProps {
  order: CatalogOrder;
  user: User;
  register: CashRegister;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ProcessWebOrderToSaleModal: React.FC<ProcessWebOrderToSaleModalProps> = ({ 
  order, 
  user, 
  register,
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [loading, setLoading] = useState(false);
  const [openShift, setOpenShift] = useState<Shift | null>(null);
  const [showTicket, setShowTicket] = useState(false);
  const [saleData, setSaleData] = useState<any>(null);
  
  const ticketRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => ticketRef.current,
    documentTitle: `Ticket-ND-WebOrder-${order.id.slice(0, 8)}`,
    removeAfterPrint: true,
  });

  useEffect(() => {
    if (isOpen) {
      shiftService.getOpenShift(user.id, register.id).then(setOpenShift);
    }
  }, [isOpen, user.id, register.id]);

  const handleProcess = async () => {
    if (!openShift) {
      alert('Debes tener un turno abierto para procesar ventas.');
      return;
    }

    setLoading(true);
    try {
      // 1. Procesar la venta real
      const saleId = await saleService.processSale({
        p_customer_id: null, // Podríamos buscar el cliente por teléfono si quisiéramos
        p_deposit: order.total,
        p_discount: 0,
        p_items: order.items?.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          cost: item.product?.cost || 0
        })) || [],
        p_payment_method: paymentMethod,
        p_subtotal: order.total,
        p_total: order.total,
        p_type: 'sale',
        p_user_id: user.id,
        p_shift_id: openShift.id,
        p_register_id: register.id
      });

      // 2. Actualizar el pedido web
      await catalogService.updateOrderStatus(order.id, 'completed', saleId);

      // 3. Obtener datos de la venta para el ticket
      const saleRecord = await saleService.getSaleById(saleId);
      setSaleData({
        ...saleRecord,
        items: order.items?.map(item => ({
          ...item,
          name: item.product?.name
        })) || []
      });

      setShowTicket(true);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error al procesar la venta');
    } finally {
      setLoading(false);
    }
  };

  if (showTicket) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Venta Procesada con Éxito"
        size="sm"
      >
        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900">¡Venta Completada!</h3>
            <p className="text-sm text-slate-500">El pedido ha sido convertido en una venta real.</p>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 overflow-hidden border border-slate-100">
            <Ticket ref={ticketRef} sale={saleData} items={saleData?.items || []} />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 bg-primary-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary-100"
            >
              <Printer size={20} />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl"
            >
              Cerrar
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Procesar Pedido como Venta"
      size="md"
    >
      <div className="space-y-6">
        <div className="bg-primary-50 border border-primary-100 rounded-2xl p-4 flex items-start gap-4">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary-600 shadow-sm">
            <Receipt size={20} />
          </div>
          <div>
            <h4 className="font-bold text-primary-900">Resumen del Pedido</h4>
            <p className="text-sm text-primary-700">{order.customer_name} • {order.items?.length} productos</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] font-bold text-primary-400 uppercase tracking-widest">Total a Cobrar</p>
            <p className="text-xl font-black text-primary-600">{formatCurrency(order.total)}</p>
          </div>
        </div>

        {!openShift && (
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-3 text-amber-700">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">No hay un turno abierto. Abre uno para procesar la venta.</p>
          </div>
        )}

        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Método de Pago Obligatorio</label>
          <div className="grid grid-cols-3 gap-3">
            <PaymentMethodButton
              active={paymentMethod === 'cash'}
              onClick={() => setPaymentMethod('cash')}
              icon={<DollarSign size={20} />}
              label="Efectivo"
            />
            <PaymentMethodButton
              active={paymentMethod === 'card'}
              onClick={() => setPaymentMethod('card')}
              icon={<CreditCard size={20} />}
              label="Tarjeta"
            />
            <PaymentMethodButton
              active={paymentMethod === 'transfer'}
              onClick={() => setPaymentMethod('transfer')}
              icon={<Wallet size={20} />}
              label="Transf."
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleProcess}
            disabled={loading || !openShift}
            className="flex-[2] py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Confirmar y Cobrar
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

interface PaymentMethodButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const PaymentMethodButton: React.FC<PaymentMethodButtonProps> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
      active 
        ? 'border-primary-600 bg-primary-50 text-primary-600 shadow-md' 
        : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
    }`}
  >
    <div className={`mb-2 ${active ? 'text-primary-600' : 'text-slate-300'}`}>
      {icon}
    </div>
    <span className="text-xs font-bold uppercase tracking-tighter">{label}</span>
  </button>
);

export default ProcessWebOrderToSaleModal;
