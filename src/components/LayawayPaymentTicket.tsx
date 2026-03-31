import React from 'react';
import { formatCurrency, formatDate } from '../utils/format';

interface LayawayPaymentTicketProps {
  payment: any;
  layaway: any;
  businessName?: string;
}

const LayawayPaymentTicket = React.forwardRef<HTMLDivElement, LayawayPaymentTicketProps>(({ 
  payment, 
  layaway, 
  businessName = 'NUTRICIÓN DEPORTIVA' 
}, ref) => {
  if (!payment || !layaway) return null;

  return (
    <div ref={ref} className="p-8 bg-white text-black font-mono text-sm w-[80mm] mx-auto" style={{ fontFamily: 'monospace' }}>
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold">{businessName}</h2>
        <p className="text-xs font-bold mt-1">RECIBO DE ABONO</p>
        <p className="text-xs">¡Gracias por su pago!</p>
      </div>

      <div className="border-b border-dashed border-black pb-4 mb-4 space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Folio Abono:</span>
          <span className="font-bold">
            {payment.receipt_number 
              ? `AB-${String(payment.receipt_number).padStart(6, '0')}`
              : `AB-${payment.id.slice(0, 6).toUpperCase()}`
            }
          </span>
        </div>
        <div className="flex justify-between">
          <span>Ticket Original:</span>
          <span>#{layaway.sales?.ticket_number || layaway.sale_id.slice(0, 8)}</span>
        </div>
        <div className="flex justify-between">
          <span>Fecha:</span>
          <span>{formatDate(payment.created_at)}</span>
        </div>
        <div className="flex justify-between">
          <span>Atendió:</span>
          <span>{payment.user_name || 'Cajero'}</span>
        </div>
        <div className="flex justify-between">
          <span>Cliente:</span>
          <span>{layaway.sales?.customer?.name || 'Cliente General'}</span>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-base font-black border-y border-dashed border-black py-2">
          <span>MONTO ABONADO:</span>
          <span>{formatCurrency(payment.amount)}</span>
        </div>
        <div className="flex justify-between text-xs pt-2">
          <span>Método de Pago:</span>
          <span className="capitalize">{payment.payment_method}</span>
        </div>
      </div>

      <div className="space-y-1 text-xs border-t border-dashed border-black pt-4">
        <div className="flex justify-between">
          <span>Total de la Venta:</span>
          <span>{formatCurrency(layaway.sales?.total || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>Saldo Anterior:</span>
          <span>{formatCurrency(payment.previous_balance || (layaway.balance + payment.amount))}</span>
        </div>
        <div className="flex justify-between font-bold text-sm pt-2">
          <span>NUEVO SALDO:</span>
          <span>{formatCurrency(payment.new_balance ?? layaway.balance)}</span>
        </div>
      </div>

      {payment.notes && (
        <div className="mt-4 text-[10px] italic">
          <p>Notas: {payment.notes}</p>
        </div>
      )}

      <div className="text-center mt-8 text-[10px]">
        <p>Estado del Apartado: {(payment.new_balance ?? layaway.balance) <= 0 ? 'COMPLETADO' : 'PENDIENTE'}</p>
        <p className="mt-2">Conserve este recibo para su control de pagos</p>
      </div>
    </div>
  );
});

LayawayPaymentTicket.displayName = 'LayawayPaymentTicket';

export default LayawayPaymentTicket;
