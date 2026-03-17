import React from 'react';
import { formatCurrency, formatDate } from '../utils/format';

interface TicketProps {
  sale: any;
  items: any[];
  businessName?: string;
}

const Ticket = React.forwardRef<HTMLDivElement, TicketProps>(({ sale, items, businessName = 'NUTRICIÓN DEPORTIVA' }, ref) => {
  if (!sale) return null;

  return (
    <div ref={ref} className="p-8 bg-white text-black font-mono text-sm w-[80mm] mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-lg font-bold">{businessName}</h2>
        <p className="text-xs">¡Gracias por su preferencia!</p>
      </div>

      <div className="border-b border-dashed border-black pb-4 mb-4 space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Ticket:</span>
          <span>#{sale.ticket_number || (sale.id ? sale.id.slice(0, 8) : '...') }</span>
        </div>
        <div className="flex justify-between">
          <span>Fecha:</span>
          <span>{formatDate(sale.created_at)}</span>
        </div>
        <div className="flex justify-between">
          <span>Atendió:</span>
          <span>{sale.user_name || 'Cajero'}</span>
        </div>
        {sale.customer_name && (
          <div className="flex justify-between">
            <span>Cliente:</span>
            <span>{sale.customer_name}</span>
          </div>
        )}
      </div>

      <table className="w-full text-xs mb-4">
        <thead>
          <tr className="border-b border-dashed border-black">
            <th className="text-left py-1">Cant</th>
            <th className="text-left py-1">Prod</th>
            <th className="text-right py-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td className="py-1">{item.quantity}</td>
              <td className="py-1">{item.product?.name || item.name || item.product_name || 'Producto'}</td>
              <td className="py-1 text-right">{formatCurrency(item.price * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-dashed border-black pt-4 space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(sale.subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Descuento:</span>
          <span>-{formatCurrency(sale.discount)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL:</span>
          <span>{formatCurrency(sale.total)}</span>
        </div>
        <div className="flex justify-between pt-2">
          <span>Método:</span>
          <span className="capitalize">{sale.payment_method}</span>
        </div>
        <div className="flex justify-between">
          <span>Tipo:</span>
          <span className="capitalize">{sale.type}</span>
        </div>
      </div>

      <div className="text-center mt-8 text-[10px]">
        <p>No se aceptan devoluciones</p>
        <p>Conserve su ticket para cualquier aclaración</p>
      </div>
    </div>
  );
});

Ticket.displayName = 'Ticket';

export default Ticket;
