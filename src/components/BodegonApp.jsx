import { supabase } from '../supabaseClient';
import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Lock, Plus, Minus, Trash2, Printer, X, Users, Check,
  Loader2, Pencil, ChefHat, Wine, UtensilsCrossed, ShieldCheck,
  HandCoins, CreditCard, QrCode, CalendarDays, TrendingUp, ClipboardList,
  Download, Clock, MessageSquare, ArrowDownRight, LogOut
} from 'lucide-react';

import './BodegonApp.css';

const ADMIN_PIN_HASH = import.meta.env.VITE_ADMIN_PIN_HASH;

function formatMoney(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
}

// 🚀 LA FUNCIÓN INFALIBLE DE IMPRESIÓN (SE USA PARA COCINA Y FINAL)
function imprimirIframeHTML(htmlContent) {
  let iframe = document.getElementById('iframe-impresora');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'iframe-impresora';
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }
  iframe.contentDocument.open();
  iframe.contentDocument.write(htmlContent);
  iframe.contentDocument.close();
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 250);
}

function formatearFecha(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatearMes(yyyy_mm) {
  const [year, month] = yyyy_mm.split('-');
  const date = new Date(year, month - 1, 1);
  const nombre = date.toLocaleString('es-AR', { month: 'long', year: 'numeric' });
  return nombre.charAt(0).toUpperCase() + nombre.slice(1);
}

function tiempoAbierta(abiertoEn) {
  if (!abiertoEn) return '';
  const mins = Math.max(0, Math.floor((Date.now() - abiertoEn) / 60000));
  if (mins < 1) return 'recién';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function agruparPorCategoria(productos) {
  return productos.reduce((acc, p) => {
    const cat = p.categoria || 'Sin categoría';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});
}

function getCategoryIcon(categoria) {
  const key = (categoria || '').toLowerCase();
  if (key.includes('comid') || key.includes('salsa')) return ChefHat;
  if (key.includes('bebid')) return Wine;
  return UtensilsCrossed;
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Loader2 size={26} className="animate-spin" style={{ color: 'var(--accent)' }} />
      <div style={{ fontFamily: 'Oswald', fontSize: 12.5, letterSpacing: '.06em', color: 'var(--text-muted)' }}>CARGANDO DATOS…</div>
    </div>
  );
}

function Header({ vista, mesa, rol, onBack, onAbrirLoginAdmin, onIrAdmin, onSalir }) {
  return (
    <div className="bc-header" style={{ justifyContent: 'space-between' }}>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
        {vista !== 'grid' && (
          <button className="icon-btn-ghost" onClick={onBack} aria-label="Volver">
            <ArrowLeft size={22} />
          </button>
        )}
        <button 
          onClick={onSalir} 
          className="btn btn-outline" 
          style={{ borderColor: '#B33A3A', color: '#B33A3A', padding: '8px 16px' }}
        >
          Cerrar Sesión
        </button>
      </div>
      
      <div style={{ flex: 2, textAlign: 'center', minWidth: 0 }}>
        {vista === 'grid' && (
          <>
            <div className="bc-script" style={{ fontSize: 27, lineHeight: 1, color: 'var(--accent)' }}>Bodegón Coco</div>
            <div className="bc-display" style={{ fontSize: 11.5, opacity: 0.75, letterSpacing: '.05em', textTransform: 'uppercase', marginTop: 2 }}>Mesas</div>
          </>
        )}
        {vista === 'mesa' && mesa && (
          <>
            <div className="bc-display" style={{ fontSize: 19, fontWeight: 600 }}>Mesa {mesa.numero}</div>
            <div style={{ fontSize: 12, opacity: 0.75, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Users size={12} /> {mesa.capacidad} · {mesa.estado === 'Ocupada' || mesa.estado === 'Reservada' ? tiempoAbierta(mesa.pedido && mesa.pedido.abiertoEn) : 'Libre'}
            </div>
          </>
        )}
        {vista === 'admin' && <div className="bc-display" style={{ fontSize: 19, fontWeight: 600 }}>Panel admin</div>}
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
        {rol === 'mozo' ? (
          <button className="role-btn" onClick={onAbrirLoginAdmin}>
            <Lock size={13} /> Admin
          </button>
        ) : vista !== 'admin' ? (
          <button className="role-btn role-btn-active" onClick={onIrAdmin}>
            <ShieldCheck size={13} /> Admin
          </button>
        ) : (
          <span className="role-badge-active">
            <ShieldCheck size={13} /> Admin
          </span>
        )}
      </div>
    </div>
  );
}

function TableCard({ mesa, onClick, justChanged }) {
  const esOcupada = mesa.estado === 'Ocupada';
  const esReservada = mesa.estado === 'Reservada';
  const total = mesa.pedido ? mesa.pedido.items.reduce((a, it) => a + it.precioUnit * it.cantidad, 0) : 0;
  
  const claseEstado = esOcupada ? 'ocupada' : esReservada ? 'reservada' : 'libre';
  const textoEstado = esOcupada ? 'OCUPADA' : esReservada ? 'RESERVADA' : 'LIBRE';

  return (
    <div
      className={`table-card ${claseEstado} ${justChanged ? 'status-changed' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="bc-display" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1 }}>{mesa.numero}</div>
        <span className={`status-pill ${claseEstado}`}>{textoEstado}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <Users size={12} /> {mesa.capacidad}
      </div>
      {esOcupada && (
        <div style={{ marginTop: 2 }}>
          <div className="bc-display" style={{ fontSize: 17, fontWeight: 600, color: 'var(--ocupada)' }}>{formatMoney(total)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tiempoAbierta(mesa.pedido && mesa.pedido.abiertoEn)}</div>
        </div>
      )}
      {esReservada && (
        <div style={{ marginTop: 2 }}>
          <div className="bc-display" style={{ fontSize: 17, fontWeight: 600, color: 'var(--reservada)' }}><Clock size={15} style={{display:'inline', marginBottom:-2}} /> Esperando</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tiempoAbierta(mesa.pedido && mesa.pedido.abiertoEn)}</div>
        </div>
      )}
    </div>
  );
}

function GridMesas({ mesas, onAbrirMesa, justChanged }) {
  const libres = mesas.filter((m) => m.estado === 'Libre').length;
  const reservadas = mesas.filter((m) => m.estado === 'Reservada').length;
  const ocupadas = mesas.filter((m) => m.estado === 'Ocupada').length;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
        {libres} libres · {ocupadas} ocupadas · {reservadas} reservadas
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 12 }}>
        {mesas.map((m) => (
          <TableCard key={m.id} mesa={m} onClick={() => onAbrirMesa(m.id)} justChanged={justChanged === m.id} />
        ))}
      </div>
      {mesas.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
          Todavía no hay mesas cargadas. Pedile al admin que agregue desde el panel.
        </div>
      )}
    </div>
  );
}

function DetalleMesa({ mesa, productos, categorias, categoriaFiltro, onFiltrar, onIniciarAgregarItem, onCambiarCantidad, onQuitarItem, onAbrirRecibo, onAbrirCobrar, onCambiarEstadoDirecto, onAbrirNota, onAbrirCancelarMesa }) {
  const items = mesa.pedido ? mesa.pedido.items : [];
  const total = items.reduce((a, it) => a + it.precioUnit * it.cantidad, 0);
  const productosFiltrados = categoriaFiltro === 'Todas' ? productos : productos.filter((p) => p.categoria === categoriaFiltro);

  const esLibre = mesa.estado === 'Libre';
  const esReservada = mesa.estado === 'Reservada';

  return (
    <div style={{ paddingBottom: 100 }}>
      {esLibre && items.length === 0 && (
        <div style={{ padding: '16px 16px 0' }}>
          <button className="btn btn-warning" style={{ width: '100%' }} onClick={() => onCambiarEstadoDirecto(mesa.id, 'Reservada')}>
            <Clock size={16} /> Reservar Mesa
          </button>
        </div>
      )}
      
      {esReservada && (
        <div style={{ padding: '16px 16px 0', display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => onCambiarEstadoDirecto(mesa.id, 'Libre')}>
            ❌ Cancelar Reserva
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onCambiarEstadoDirecto(mesa.id, 'Ocupada')}>
            ✅ Cliente Llegó
          </button>
        </div>
      )}

      <div className="chips-row">
        {categorias.map((c) => (
          <button key={c} className={`chip ${categoriaFiltro === c ? 'active' : ''}`} onClick={() => onFiltrar(c)}>
            {c}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>
        <div className="section-label">Carta</div>
        {productosFiltrados.length === 0 && (
          <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 14 }}>No hay productos en esta categoría.</div>
        )}
        {productosFiltrados.map((p) => {
          const Icon = getCategoryIcon(p.categoria);
          return (
            <div key={p.id} className="menu-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div className="menu-icon"><Icon size={16} /></div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>{p.nombre}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{formatMoney(p.precio)}</div>
                </div>
              </div>
              <button className="btn-add-round" onClick={() => onIniciarAgregarItem(p)} aria-label={`Agregar ${p.nombre}`}>
                <Plus size={18} />
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '4px 16px 0' }}>
        <div className="section-label">Pedido actual</div>
        {items.length === 0 ? (
          <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 14 }}>Todavía no agregaste nada de la carta.</div>
        ) : (
          items.map((it, idx) => (
            <div key={`${it.productId}-${idx}`} className="pedido-row">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{it.nombre}</div>
                {it.nota && <div style={{ fontSize: 12.5, color: 'var(--accent)', fontWeight: 600, lineHeight: 1.2, marginTop: 3 }}>» {it.nota}</div>}
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatMoney(it.precioUnit)} c/u</div>
              </div>
              
              <button className="icon-btn-ghost" onClick={() => onAbrirNota(idx, it.nota)} aria-label="Agregar nota" style={{ color: 'var(--text-muted)' }}>
                <MessageSquare size={16} />
              </button>

              <div className="stepper">
                <button onClick={() => onCambiarCantidad(idx, -1)} aria-label="Restar unidad"><Minus size={14} /></button>
                <span>{it.cantidad}</span>
                <button onClick={() => onCambiarCantidad(idx, 1)} aria-label="Sumar unidad"><Plus size={14} /></button>
              </div>
              <div className="bc-display" style={{ width: 60, textAlign: 'right', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
                {formatMoney(it.precioUnit * it.cantidad)}
              </div>
              <button className="icon-btn-ghost" onClick={() => onQuitarItem(idx)} aria-label={`Quitar ${it.nombre}`} style={{ color: 'var(--ocupada)' }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="bottom-bar">
        <div>
          <div style={{ fontSize: 10.5, color: 'var(--surface)', opacity: 0.7, letterSpacing: '.06em' }}>TOTAL</div>
          <div className="bc-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--surface)' }}>{formatMoney(total)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" style={{ padding: '12px 14px', borderColor: 'var(--ocupada)', color: 'var(--ocupada)' }} onClick={onAbrirCancelarMesa} title="Cancelar Mesa">
            <Trash2 size={16} />
          </button>

          <button className="btn btn-outline-dark" onClick={onAbrirRecibo} disabled={items.length === 0} aria-label="Imprimir Ticket Cocina">
            <Printer size={16} />
          </button>
          <button className="btn btn-primary" onClick={onAbrirCobrar} disabled={items.length === 0}>
            <Check size={16} /> Cobrar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalWrapper({ children, onClose, titulo }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="bc-display" style={{ fontSize: 16, fontWeight: 600 }}>{titulo}</div>
          <button className="icon-btn-ghost" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PinModal({ pinInput, setPinInput, pinError, onConfirmar, onClose }) {
  return (
    <ModalWrapper titulo="Acceso admin" onClose={onClose}>
      <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 14, marginTop: 0 }}>
        Ingresá el PIN de administrador para editar productos y ver historial de ventas.
      </p>
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        className="pin-input"
        value={pinInput}
        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
        onKeyDown={(e) => { if (e.key === 'Enter') onConfirmar(); }}
        placeholder="••••"
        autoFocus
      />
      {pinError && <div style={{ color: 'var(--ocupada)', fontSize: 12.5, marginTop: 8 }}>PIN incorrecto. Probá de nuevo.</div>}
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={onConfirmar}>Ingresar</button>
    </ModalWrapper>
  );
}

function EgresoModal({ onGuardar, onClose }) {
  const [motivo, setMotivo] = useState('');
  const [monto, setMonto] = useState('');
  const [metodo, setMetodo] = useState('Efectivo');
  const [error, setError] = useState('');

  function handleGuardar() {
    if (!motivo.trim()) { setError('Ingresá el motivo del egreso.'); return; }
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) { setError('Ingresá un monto válido mayor a 0.'); return; }
    onGuardar(motivo.trim(), montoNum, metodo);
  }

  return (
    <ModalWrapper titulo="Registrar Egreso (Salida de dinero)" onClose={onClose}>
      <div className="form-field">
        <label>Motivo del Egreso</label>
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej: Compra de hielo, pago a proveedor..." autoFocus />
      </div>
      <div className="form-field">
        <label>Monto ($)</label>
        <input type="number" inputMode="decimal" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0" />
      </div>
      <div className="form-field">
        <label>Método de salida</label>
        <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
          <option value="Efectivo">Efectivo (Caja física)</option>
          <option value="Transferencia">Transferencia (Cuenta banco)</option>
        </select>
      </div>
      {error && <div style={{ color: 'var(--ocupada)', fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" style={{ flex: 1, background: 'var(--ocupada)', color: '#fff' }} onClick={handleGuardar}>
          <ArrowDownRight size={16} /> Guardar Egreso
        </button>
      </div>
    </ModalWrapper>
  );
}

function NotaModal({ notaActual, onGuardar, onClose }) {
  const [nota, setNota] = useState(notaActual || '');
  return (
    <ModalWrapper titulo="Aclaración Libre" onClose={onClose}>
      <div className="form-field">
        <label>Escribí el detalle para la cocina</label>
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Ej: Sin cebolla, bien cocido..."
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') onGuardar(nota); }}
        />
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onGuardar(nota)}>Guardar</button>
      </div>
    </ModalWrapper>
  );
}

function SeleccionarSalsaModal({ producto, salsasDisponibles, onCancelar, onConfirmar }) {
  const [salsaElegida, setSalsaElegida] = useState('ninguna'); 

  return (
    <ModalWrapper titulo={`Salsa para: ${producto.nombre}`} onClose={onCancelar}>
      <div className="payment-grid">
        <button className={`payment-btn ${salsaElegida === 'ninguna' ? 'active' : ''}`} onClick={() => setSalsaElegida('ninguna')}>
          <span>Sin Salsa</span>
          <span style={{fontSize: 12}}>$0</span>
        </button>
        {salsasDisponibles.map(s => (
          <button key={s.id} className={`payment-btn ${salsaElegida === s.id ? 'active' : ''}`} onClick={() => setSalsaElegida(s.id)}>
            <span>{s.nombre}</span>
            <span style={{fontSize: 12}}>+{formatMoney(s.precio)}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={onCancelar}>Cancelar</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onConfirmar(salsasDisponibles.find(x => x.id === salsaElegida) || null)}>
          <Check size={16} /> Agregar al Pedido
        </button>
      </div>
    </ModalWrapper>
  );
}

// 🚀 TICKET DE COCINA ACTUALIZADO CON IFRAME
function TicketCocinaModal({ mesa, onClose }) {
  const itemsTodos = mesa.pedido ? mesa.pedido.items : [];
  const itemsCocina = itemsTodos.filter(it => {
    const categoriaMinuscula = (it.categoria || '').toLowerCase();
    return !categoriaMinuscula.includes('bebid');
  });

  const fecha = new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
  
  function manejarImpresionCocina() {
    let filasHTML = '';
    itemsCocina.forEach(it => {
      filasHTML += `
        <div style="margin-bottom: 4px;">
          <div style="display: flex; gap: 12px; justify-content: flex-start; font-size: 15px;">
            <span style="font-weight: 900;">${it.cantidad}x</span>
            <span style="font-weight: 600;">${it.nombre}</span>
          </div>
          ${it.nota ? `<div style="font-size: 14px; font-weight: 600; padding-left: 28px; color: #333;">» ${it.nota}</div>` : ''}
        </div>
      `;
    });

    const ticketHTML = `
      <html>
    <head>
          <style>
            @page { margin: 0; size: auto; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              color: #000; 
              margin: 0; 
              padding: 10px 10px 50px 10px; 
              width: 300px; 
            }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div style="text-align: center; margin-bottom: 6px;">
            <div style="font-size: 16px; font-weight: 700;">BODEGÓN COCO</div>
            <div style="font-size: 11px; font-family: Arial, sans-serif;">Mesa ${mesa.numero} · ${fecha}</div>
            <div style="font-size: 18px; margin-top: 6px; font-weight: bold;">PEDIDO A COCINA</div>
          </div>
          <div class="divider"></div>
          ${itemsCocina.length === 0 ? '<div style="text-align: center; font-size: 12px; font-style: italic;">No hay platos de cocina</div>' : filasHTML}
          <div class="divider"></div>
        </body>
      </html>
    `;
    imprimirIframeHTML(ticketHTML);
  }

  return (
    <ModalWrapper titulo="Generar Comanda" onClose={onClose}>
      <div className="ticket ticket-print-area">
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div className="bc-display" style={{ fontSize: 16, fontWeight: 700 }}>BODEGÓN COCO</div>
          <div style={{ fontSize: 11, fontFamily: 'Arial, sans-serif' }}>Mesa {mesa.numero} · {fecha}</div>
          <div className="bc-display" style={{ fontSize: 18, marginTop: 6 }}>PEDIDO A COCINA</div>
        </div>
        <div className="ticket-divider" />
        
        {itemsCocina.length === 0 ? (
          <div style={{ textAlign: 'center', fontSize: 12, padding: '10px 0', fontStyle: 'italic' }}>
            No hay platos de cocina en este pedido.
          </div>
        ) : (
          itemsCocina.map((it, idx) => (
            <div key={idx} style={{ marginBottom: '4px' }}>
              <div className="ticket-row" style={{ justifyContent: 'flex-start', gap: '12px', paddingBottom: 0 }}>
                <span style={{ fontWeight: 900, fontSize: '15px' }}>{it.cantidad}x</span>
                <span style={{ fontWeight: 600, fontSize: '15px' }}>{it.nombre}</span>
              </div>
              {it.nota && (
                <div style={{ fontSize: '14px', fontWeight: 600, paddingLeft: '28px', color: '#333' }}>
                  » {it.nota}
                </div>
              )}
            </div>
          ))
        )}
        
        <div className="ticket-divider" />
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={manejarImpresionCocina} disabled={itemsCocina.length === 0}>
          <Printer size={16} /> Imprimir a Cocina
        </button>
      </div>
    </ModalWrapper>
  );
}

// 🚀 TICKET FINAL ACTUALIZADO CON IFRAME
function ConfirmarCobroModal({ mesa, onCancelar, onConfirmar }) {
  const [metodo, setMetodo] = useState('Efectivo');
  
  const items = mesa.pedido ? mesa.pedido.items : [];
  const totalOrig = items.reduce((a, it) => a + it.precioUnit * it.cantidad, 0);
  
  let descuento = 0;
  let recargo = 0;
  
  if (metodo === 'Efectivo') descuento = totalOrig * 0.05;
  if (metodo === 'Crédito') recargo = totalOrig * 0.10;
  if (metodo === 'QR') recargo = totalOrig * 0.05;

  const totalFinal = totalOrig - descuento + recargo;
  const ajusteBD = descuento - recargo;
  
  const fecha = new Date().toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

  function manejarImpresionFinal() {
    let filasHTML = '';
    items.forEach(it => {
      filasHTML += `
        <div style="margin-bottom: 2px;">
          <div style="display: flex; justify-content: space-between;">
            <span>${it.cantidad} x ${it.nombre}</span>
            <span>${formatMoney(it.precioUnit * it.cantidad)}</span>
          </div>
          ${it.nota ? `<div style="font-size: 11px; padding-left: 14px; color: #555; font-style: italic;">» ${it.nota}</div>` : ''}
        </div>
      `;
    });

    const ticketHTML = `
      <html>
   <head>
          <style>
            @page { margin: 0; size: auto; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              color: #000; 
              margin: 0; 
              padding: 10px 10px 50px 10px; 
              width: 300px; 
            }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          </style>
        </head>
        <body>
          <div style="text-align: center; margin-bottom: 6px;">
            <div style="font-size: 16px; font-weight: 700;">BODEGÓN COCO</div>
            <div style="font-size: 11px; font-family: Arial, sans-serif;">Mesa ${mesa.numero} · ${fecha}</div>
          </div>
          <div class="divider"></div>
          ${filasHTML}
          <div class="divider"></div>
          <div class="row"><span>Subtotal:</span><span>${formatMoney(totalOrig)}</span></div>
          ${descuento > 0 ? `<div class="row"><span>Desc (Efectivo):</span><span>-${formatMoney(descuento)}</span></div>` : ''}
          ${recargo > 0 ? `<div class="row"><span>Recargo (${metodo}):</span><span>+${formatMoney(recargo)}</span></div>` : ''}
          <div class="divider"></div>
          <div class="row" style="font-weight: bold; font-size: 16px;">
            <span>TOTAL</span>
            <span>${formatMoney(totalFinal)}</span>
          </div>
          <div style="text-align: center; font-size: 11px; margin-top: 10px; color: #555; font-family: Arial, sans-serif;">¡Gracias por su visita!</div>
        </body>
      </html>
    `;
    imprimirIframeHTML(ticketHTML);
  }

  return (
    <ModalWrapper titulo="Método de pago y Ticket" onClose={onCancelar}>
      <div className="payment-grid">
        <button className={`payment-btn ${metodo === 'Efectivo' ? 'active' : ''}`} onClick={() => setMetodo('Efectivo')}>
          <HandCoins size={28} />
          <span>Efectivo (5% OFF)</span>
        </button>
        <button className={`payment-btn ${metodo === 'Débito' ? 'active' : ''}`} onClick={() => setMetodo('Débito')}>
          <CreditCard size={28} />
          <span>Débito</span>
        </button>
        <button className={`payment-btn ${metodo === 'Crédito' ? 'active' : ''}`} onClick={() => setMetodo('Crédito')}>
          <CreditCard size={28} />
          <span>Crédito (+10%)</span>
        </button>
        <button className={`payment-btn ${metodo === 'QR' ? 'active' : ''}`} onClick={() => setMetodo('QR')}>
          <QrCode size={28} />
          <span>QR (+5%)</span>
        </button>
      </div>

      <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 12, margin: '20px 0 16px' }}>
         {metodo !== 'Débito' && (
           <>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
               <span>Subtotal:</span>
               <span style={{ textDecoration: 'line-through' }}>{formatMoney(totalOrig)}</span>
             </div>
             
             {metodo === 'Efectivo' && (
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--libre)', marginBottom: 8, fontWeight: 600 }}>
                 <span>Descuento 5%:</span>
                 <span>-{formatMoney(descuento)}</span>
               </div>
             )}
             
             {metodo === 'Crédito' && (
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ocupada)', marginBottom: 8, fontWeight: 600 }}>
                 <span>Recargo 10%:</span>
                 <span>+{formatMoney(recargo)}</span>
               </div>
             )}
             
             {metodo === 'QR' && (
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ocupada)', marginBottom: 8, fontWeight: 600 }}>
                 <span>Recargo 5%:</span>
                 <span>+{formatMoney(recargo)}</span>
               </div>
             )}
           </>
         )}
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: metodo === 'Débito' ? 0 : 8 }}>
            <span style={{ fontFamily: 'Oswald', fontWeight: 600, fontSize: 16 }}>TOTAL A COBRAR:</span>
            <span className="bc-display" style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>{formatMoney(totalFinal)}</span>
         </div>
      </div>

      <div className="print-only ticket-print-area">
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div className="bc-display" style={{ fontSize: 16, fontWeight: 700 }}>BODEGÓN COCO</div>
          <div style={{ fontSize: 11, fontFamily: 'Arial, sans-serif' }}>Mesa {mesa.numero} · {fecha}</div>
        </div>
        <div className="ticket-divider" />
        {items.map((it, idx) => (
          <div key={idx} style={{ marginBottom: '2px' }}>
            <div className="ticket-row" style={{ paddingBottom: 0 }}>
              <span>{it.cantidad} x {it.nombre}</span>
              <span>{formatMoney(it.precioUnit * it.cantidad)}</span>
            </div>
            {it.nota && (
              <div style={{ fontSize: '11px', paddingLeft: '14px', color: '#555', fontStyle: 'italic' }}>
                » {it.nota}
              </div>
            )}
          </div>
        ))}
        <div className="ticket-divider" />
        <div className="ticket-row"><span>Subtotal:</span><span>{formatMoney(totalOrig)}</span></div>
        
        {descuento > 0 && <div className="ticket-row"><span>Desc (Efectivo):</span><span>-{formatMoney(descuento)}</span></div>}
        {recargo > 0 && <div className="ticket-row"><span>Recargo ({metodo}):</span><span>+{formatMoney(recargo)}</span></div>}
        
        <div className="ticket-divider" />
        <div className="ticket-row total-row">
          <span>TOTAL</span>
          <span>{formatMoney(totalFinal)}</span>
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, marginTop: 10, color: '#555', fontFamily: 'Arial, sans-serif' }}>¡Gracias por su visita!</div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-outline" style={{ flex: 1, padding: '12px 10px' }} onClick={onCancelar}>Cancelar</button>
        <button className="btn btn-outline" style={{ flex: 1, padding: '12px 10px', color: 'var(--ink)', borderColor: 'var(--ink)' }} onClick={manejarImpresionFinal}>
          <Printer size={16} /> Ticket Final
        </button>
        <button className="btn btn-success" style={{ flex: 1.5, padding: '12px 10px' }} onClick={() => onConfirmar(metodo, totalOrig, ajusteBD, totalFinal)}>
          <Check size={16} /> Cerrar Mesa
        </button>
      </div>
    </ModalWrapper>
  );
}

function ConfirmarCancelarMesaModal({ mesa, onCancelar, onConfirmar }) {
  if (!mesa) return null;
  return (
    <ModalWrapper titulo={`Cancelar Mesa ${mesa.numero}`} onClose={onCancelar}>
      <p style={{ fontSize: 14, marginBottom: 18, marginTop: 0 }}>
        ¿Estás seguro de que querés limpiar esta mesa sin cobrar? Se borrará todo el pedido actual y <strong>no se registrará en las ventas</strong>.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={onCancelar}>Volver</button>
        <button className="btn btn-primary" style={{ flex: 1, background: 'var(--ocupada)', color: '#fff' }} onClick={onConfirmar}>
          <Trash2 size={16} /> Limpiar Mesa
        </button>
      </div>
    </ModalWrapper>
  );
}

function ConfirmarEliminarVentaModal({ venta, onCancelar, onConfirmar }) {
  if (!venta) return null;
  return (
    <ModalWrapper titulo="Eliminar Registro" onClose={onCancelar}>
      <p style={{ fontSize: 14, marginBottom: 4, marginTop: 0 }}>
        ¿Estás seguro de que querés borrar este registro del sistema?
      </p>
      <div style={{ margin: '16px 0', padding: 14, background: 'var(--ocupada-bg)', borderRadius: 12, color: 'var(--ocupada)' }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{venta.metodo_pago}</div>
        <div className="bc-display" style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{formatMoney(venta.total_final)}</div>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 18 }}>
        Se va a descontar automáticamente de los reportes. Esta acción no se puede deshacer.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-outline" style={{ flex: 1 }} onClick={onCancelar}>Cancelar</button>
        <button className="btn btn-primary" style={{ flex: 1, background: 'var(--ocupada)', color: '#fff' }} onClick={onConfirmar}>
          <Trash2 size={16} /> Eliminar
        </button>
      </div>
    </ModalWrapper>
  );
}

function ProductoFormModal({ producto, categoriasExistentes, onGuardar, onClose }) {
  const [nombre, setNombre] = useState(producto ? producto.nombre : '');
  const [categoria, setCategoria] = useState(producto ? producto.categoria : '');
  const [precio, setPrecio] = useState(producto ? String(producto.precio) : '');
  const [error, setError] = useState('');

  function handleGuardar() {
    if (!nombre.trim()) { setError('Ponele un nombre al producto.'); return; }
    if (!categoria.trim()) { setError('Elegí o escribí una categoría.'); return; }
    const precioNum = parseFloat(precio);
    if (isNaN(precioNum) || precioNum < 0) { setError('El precio tiene que ser un número válido.'); return; }
    onGuardar({ nombre: nombre.trim(), categoria: categoria.trim(), precio: precioNum });
  }

  return (
    <ModalWrapper titulo={producto ? 'Editar producto' : 'Nuevo producto'} onClose={onClose}>
      <div className="form-field">
        <label>Nombre</label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Milanesa napolitana" autoFocus />
      </div>
      <div className="form-field">
        <label>Categoría</label>
        <input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ej: Comida" list="categorias-existentes" />
        <datalist id="categorias-existentes">
          {categoriasExistentes.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>
      <div className="form-field">
        <label>Precio</label>
        <input type="number" inputMode="decimal" min="0" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="0" />
      </div>
      {error && <div style={{ color: 'var(--ocupada)', fontSize: 12.5, marginBottom: 10 }}>{error}</div>}
      <button className="btn btn-primary" style={{ width: '100%', marginTop: 6 }} onClick={handleGuardar}>Guardar</button>
    </ModalWrapper>
  );
}

function PanelAdmin({ productos, mesas, ventas, onSalir, onNuevoProducto, onEditarProducto, onEliminarProducto, onAgregarMesa, onEliminarMesa, avisoMesas, onAbrirEliminarVenta, onAbrirEgreso }) {
  const [tab, setTab] = useState('menu'); 
  const grupos = agruparPorCategoria(productos);

  const [mesFiltro, setMesFiltro] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const mesesDisponibles = useMemo(() => {
    const setMeses = new Set(ventas.map(v => {
      const d = new Date(v.creado_en);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }));
    const d = new Date();
    setMeses.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    return Array.from(setMeses).sort().reverse();
  }, [ventas]);

  const ventasMes = ventas.filter(v => {
    const d = new Date(v.creado_en);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === mesFiltro;
  });

  const ahora = new Date();
  const ventasHoy = ventas.filter(v => new Date(v.creado_en).toDateString() === ahora.toDateString());

  const totalMes = ventasMes.reduce((acc, v) => acc + v.total_final, 0);
  const totalHoy = ventasHoy.reduce((acc, v) => acc + v.total_final, 0);

  const exportarExcel = () => {
    const cabeceras = ['Fecha', 'Hora', 'Metodo de Pago', 'Tipo', 'Monto Real', 'Total Base'];
    const filas = ventasMes.map(v => {
      const d = new Date(v.creado_en);
      const fecha = d.toLocaleDateString('es-AR');
      const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      const tipo = v.total_final < 0 ? 'EGRESO' : 'INGRESO';
      return [
        fecha,
        hora,
        v.metodo_pago,
        tipo,
        v.total_final, 
        v.total_original
      ].join(';'); 
    });

    const csvContent = "\uFEFF" + [cabeceras.join(';'), ...filas].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Caja_Bodegon_${mesFiltro}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: 16, paddingBottom: 40 }}>
      <button className="btn btn-outline" style={{ width: '100%', marginBottom: 16 }} onClick={onSalir}>Salir de modo admin</button>

      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'menu' ? 'active' : ''}`} onClick={() => setTab('menu')}>
          <ClipboardList size={16} style={{display:'inline', verticalAlign:'middle', marginRight:4, marginTop:-2}}/> Menú y Mesas
        </button>
        <button className={`admin-tab ${tab === 'historial' ? 'active' : ''}`} onClick={() => setTab('historial')}>
          <TrendingUp size={16} style={{display:'inline', verticalAlign:'middle', marginRight:4, marginTop:-2}}/> Caja
        </button>
      </div>

      {tab === 'menu' && (
        <div style={{ animation: 'slideUp .25s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div className="bc-display" style={{ fontSize: 15, fontWeight: 600 }}>Productos y precios</div>
            <button className="btn btn-primary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={onNuevoProducto}>
              <Plus size={14} /> Nuevo
            </button>
          </div>
          {Object.keys(grupos).length === 0 && <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 14 }}>No hay productos cargados todavía.</div>}
          {Object.entries(grupos).map(([cat, items]) => (
            <div key={cat}>
              <div className="section-label">{cat}</div>
              {items.map((p) => (
                <div key={p.id} className="admin-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.nombre}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{formatMoney(p.precio)}</div>
                  </div>
                  <button className="icon-btn" onClick={() => onEditarProducto(p)} aria-label={`Editar ${p.nombre}`}><Pencil size={15} /></button>
                  <button className="icon-btn icon-btn-danger" onClick={() => onEliminarProducto(p.id)} aria-label={`Eliminar ${p.nombre}`}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '26px 0 10px' }}>
            <div className="bc-display" style={{ fontSize: 15, fontWeight: 600 }}>Mesas</div>
            <button className="btn btn-primary" style={{ padding: '8px 12px', fontSize: 12 }} onClick={onAgregarMesa}>
              <Plus size={14} /> Agregar mesa
            </button>
          </div>
          {avisoMesas && <div className="aviso">{avisoMesas}</div>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {mesas.map((m) => (
              <div key={m.id} className="mesa-chip-admin">
                <span>Mesa {m.numero} · {m.capacidad}p</span>
                <button onClick={() => onEliminarMesa(m.id)} aria-label={`Eliminar mesa ${m.numero}`}><X size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'historial' && (
        <div style={{ animation: 'slideUp .25s ease' }}>
          <div className="form-field" style={{ marginBottom: 16 }}>
            <label>Filtrar historial por mes</label>
            <select value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)}>
              {mesesDisponibles.map(m => (
                <option key={m} value={m}>{formatearMes(m)}</option>
              ))}
            </select>
          </div>

          <div className="stats-grid">
            <div className="stat-card" style={{ background: 'var(--libre)'}}>
              <div className="stat-label">Caja Balance Hoy</div>
              <div className="bc-display stat-val">{formatMoney(totalHoy)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Caja Mes Selec.</div>
              <div className="bc-display stat-val">{formatMoney(totalMes)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
             <div className="section-label" style={{ margin: 0 }}>Registros</div>
             <div style={{ display: 'flex', gap: '8px'}}>
                <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: 11, borderColor: 'var(--ocupada)', color: 'var(--ocupada)' }} onClick={onAbrirEgreso}>
                  <Minus size={14} /> Egreso
                </button>
                <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: 11 }} onClick={exportarExcel} disabled={ventasMes.length === 0}>
                  <Download size={14} /> Excel
                </button>
             </div>
          </div>
          
          {ventasMes.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay movimientos en este mes.</div>
          ) : (
            ventasMes.slice(0, 30).map(v => {
              const esEgreso = v.total_final < 0;
              return (
                <div key={v.id} className="venta-card" style={{ borderLeft: esEgreso ? '4px solid var(--ocupada)' : '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {esEgreso ? `SALIDA (${v.metodo_pago})` : v.metodo_pago}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="bc-display" style={{ fontWeight: 600, fontSize: 16, color: esEgreso ? 'var(--ocupada)' : 'var(--ink)' }}>
                        {formatMoney(v.total_final)}
                      </div>
                      <button className="icon-btn-ghost" style={{ color: 'var(--ocupada)', padding: 4 }} onClick={() => onAbrirEliminarVenta(v)} aria-label="Eliminar registro">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
                    <div><CalendarDays size={11} style={{display:'inline', marginBottom:-2}}/> {formatearFecha(v.creado_en)}</div>
                    {!esEgreso && v.descuento > 0 && <div style={{color: 'var(--libre)', fontWeight: 500}}>Desc: {formatMoney(v.descuento)}</div>}
                    {!esEgreso && v.descuento < 0 && <div style={{color: 'var(--ocupada)', fontWeight: 500}}>Recargo: {formatMoney(Math.abs(v.descuento))}</div>}
                    {esEgreso && <div style={{color: 'var(--text-muted)', fontStyle: 'italic'}}>{v.items[0]?.nombre}</div>}
                  </div>
                </div>
              );
            })
          )}
          {ventasMes.length > 30 && <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>Mostrando los últimos 30 registros de este mes.</div>}
        </div>
      )}
    </div>
  );
}

export default function BodegonApp({ onSalir }) {
  const [intentoSalir, setIntentoSalir] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [productos, setProductos] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [ventas, setVentas] = useState([]); 
  const [rol, setRol] = useState('mozo');
  const [vista, setVista] = useState('grid');
  const [mesaActivaId, setMesaActivaId] = useState(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
  const [modal, setModal] = useState(null);
  const [productoEditando, setProductoEditando] = useState(null);
  const [ventaAEliminar, setVentaAEliminar] = useState(null); 
  const [itemNota, setItemNota] = useState(null); 
  
  const [productoParaSalsa, setProductoParaSalsa] = useState(null);
  const salsasDisponibles = useMemo(() => {
    return productos.filter(p => p.nombre.toLowerCase().includes('salsa'));
  }, [productos]);

  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [justChanged, setJustChanged] = useState(null);
  const [errorSync, setErrorSync] = useState(false);
  const [avisoMesas, setAvisoMesas] = useState('');
  const [, setTick] = useState(0);

  const guardarMesaDB = async (mesaId, nuevoEstado, nuevoPedido) => {
    try {
      const { error } = await supabase.from('mesas').update({ estado: nuevoEstado, pedido: nuevoPedido }).eq('id', mesaId);
      if (error) throw error;
      setErrorSync(false);
    } catch (e) {
      console.error("Error guardando mesa en Supabase:", e);
      setErrorSync(true);
    }
  };

  useEffect(() => {
    const cargarInicial = async () => {
      try {
        const { data: mesasDB } = await supabase.from('mesas').select('*').order('id');
        if (mesasDB) setMesas(mesasDB);

        const { data: productosDB } = await supabase.from('productos').select('*').order('id');
        if (productosDB) setProductos(productosDB);

        const { data: ventasDB } = await supabase.from('ventas').select('*').order('creado_en', { ascending: false });
        if (ventasDB) setVentas(ventasDB);

      } catch (err) {
        console.error("Error al cargar datos iniciales:", err);
      } finally {
        setCargando(false);
      }
    };

    cargarInicial();

    const canalMesas = supabase.channel('mesas-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'mesas' }, (payload) => {
      if (payload.eventType === 'INSERT') setMesas((prev) => [...prev, payload.new]);
      else if (payload.eventType === 'UPDATE') setMesas((prev) => prev.map((m) => (m.id === payload.new.id ? payload.new : m)));
      else if (payload.eventType === 'DELETE') setMesas((prev) => prev.filter((m) => m.id !== payload.old.id));
    }).subscribe();

    const canalProductos = supabase.channel('productos-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, (payload) => {
      if (payload.eventType === 'INSERT') setProductos((prev) => prev.some(p => p.id === payload.new.id) ? prev : [...prev, payload.new]);
      else if (payload.eventType === 'UPDATE') setProductos((prev) => prev.map((p) => (p.id === payload.new.id ? payload.new : p)));
      else if (payload.eventType === 'DELETE') setProductos((prev) => prev.filter((p) => p.id !== payload.old.id));
    }).subscribe();

    const canalVentas = supabase.channel('ventas-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, (payload) => {
      if (payload.eventType === 'INSERT') setVentas((prev) => [payload.new, ...prev]);
      else if (payload.eventType === 'DELETE') setVentas((prev) => prev.filter(v => v.id !== payload.old.id));
    }).subscribe();

    return () => {
      supabase.removeChannel(canalMesas);
      supabase.removeChannel(canalProductos);
      supabase.removeChannel(canalVentas);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const categorias = useMemo(() => {
    const set = new Set(productos.map((p) => p.categoria).filter(Boolean));
    return ['Todas', ...Array.from(set)];
  }, [productos]);

  const mesaActiva = useMemo(() => mesas.find((m) => m.id === mesaActivaId) || null, [mesas, mesaActivaId]);

  function abrirMesa(mesaId) { setMesaActivaId(mesaId); setCategoriaFiltro('Todas'); setVista('mesa'); }
  function volverAGrid() { setVista('grid'); setMesaActivaId(null); }

  function iniciarAgregarItem(producto) {
    const esPasta = /raviol|sorrentino|ñoqui|fideo|tallarin|espagueti|canelon|pasta|macarron/i.test(producto.nombre);
    const esSalsa = producto.nombre.toLowerCase().includes('salsa');
    
    if (esPasta && !esSalsa && salsasDisponibles.length > 0) {
       setProductoParaSalsa(producto);
       setModal('seleccionar_salsa');
    } else {
       agregarItemConfirmado(producto, null);
    }
  }

  function agregarItemConfirmado(producto, salsaSeleccionada) {
    const mesaActual = mesas.find((m) => m.id === mesaActivaId);
    if (!mesaActual) return;
    const eraLibreO_Reservada = mesaActual.estado === 'Libre' || mesaActual.estado === 'Reservada';
    
    let nombreFinal = producto.nombre;
    let precioFinal = producto.precio;
    let varianteKey = null;

    if (salsaSeleccionada) {
      nombreFinal = `${producto.nombre} con ${salsaSeleccionada.nombre}`;
      precioFinal = producto.precio + salsaSeleccionada.precio;
      varianteKey = salsaSeleccionada.id; 
    }

    let nuevoPedido;
    if (mesaActual.pedido) {
      nuevoPedido = { ...mesaActual.pedido, items: [...mesaActual.pedido.items] };
      const idx = nuevoPedido.items.findIndex((it) => it.productId === producto.id && it.variante === varianteKey && !it.nota);
      if (idx >= 0) {
        nuevoPedido.items[idx] = { ...nuevoPedido.items[idx], cantidad: nuevoPedido.items[idx].cantidad + 1 };
      } else {
        nuevoPedido.items.push({ productId: producto.id, nombre: nombreFinal, precioUnit: precioFinal, cantidad: 1, nota: '', categoria: producto.categoria, variante: varianteKey });
      }
    } else {
      nuevoPedido = { abiertoEn: Date.now(), items: [{ productId: producto.id, nombre: nombreFinal, precioUnit: precioFinal, cantidad: 1, nota: '', categoria: producto.categoria, variante: varianteKey }] };
    }

    setMesas((prev) => prev.map((m) => m.id === mesaActivaId ? { ...m, estado: 'Ocupada', pedido: nuevoPedido } : m));
    guardarMesaDB(mesaActivaId, 'Ocupada', nuevoPedido);
    if (eraLibreO_Reservada) { setJustChanged(mesaActivaId); setTimeout(() => setJustChanged(null), 450); }
    
    setModal(null);
    setProductoParaSalsa(null);
  }

  function cambiarCantidad(idxLinea, delta) {
    const mesaActual = mesas.find((m) => m.id === mesaActivaId);
    if (!mesaActual || !mesaActual.pedido) return;
    const itemsActualizados = [...mesaActual.pedido.items];
    itemsActualizados[idxLinea] = { ...itemsActualizados[idxLinea], cantidad: itemsActualizados[idxLinea].cantidad + delta };
    const filtrados = itemsActualizados.filter(it => it.cantidad > 0);
    const nuevoPedido = { ...mesaActual.pedido, items: filtrados };
    setMesas((prev) => prev.map((m) => m.id === mesaActivaId ? { ...m, pedido: nuevoPedido } : m));
    guardarMesaDB(mesaActivaId, 'Ocupada', nuevoPedido);
  }

  function quitarItem(idxLinea) {
    const mesaActual = mesas.find((m) => m.id === mesaActivaId);
    if (!mesaActual || !mesaActual.pedido) return;
    const itemsActualizados = mesaActual.pedido.items.filter((_, i) => i !== idxLinea);
    const nuevoPedido = { ...mesaActual.pedido, items: itemsActualizados };
    setMesas((prev) => prev.map((m) => m.id === mesaActivaId ? { ...m, pedido: nuevoPedido } : m));
    guardarMesaDB(mesaActivaId, 'Ocupada', nuevoPedido);
  }

  function guardarNotaItem(nuevaNota) {
    if (!itemNota) return;
    const mesaActual = mesas.find((m) => m.id === mesaActivaId);
    if (!mesaActual || !mesaActual.pedido) return;
    const itemsActualizados = [...mesaActual.pedido.items];
    itemsActualizados[itemNota.index] = { ...itemsActualizados[itemNota.index], nota: nuevaNota };
    const nuevoPedido = { ...mesaActual.pedido, items: itemsActualizados };
    
    setMesas((prev) => prev.map((m) => m.id === mesaActivaId ? { ...m, pedido: nuevoPedido } : m));
    guardarMesaDB(mesaActivaId, 'Ocupada', nuevoPedido);
    setItemNota(null);
  }

  function cambiarEstadoDirectoMesa(mesaId, nuevoEstado) {
    const mesaActual = mesas.find((m) => m.id === mesaId);
    if (!mesaActual) return;

    let nuevoPedido = mesaActual.pedido;
    if (nuevoEstado === 'Reservada' && !mesaActual.pedido) {
      nuevoPedido = { abiertoEn: Date.now(), items: [] }; 
    } else if (nuevoEstado === 'Libre') {
      nuevoPedido = null; 
    }

    setMesas((prev) => prev.map((m) => m.id === mesaId ? { ...m, estado: nuevoEstado, pedido: nuevoPedido } : m));
    guardarMesaDB(mesaId, nuevoEstado, nuevoPedido);
    volverAGrid();
  }

  async function cobrarYCerrar(metodoPago, totalOrig, descuentoApli, totalFin) {
    const mesaActual = mesas.find((m) => m.id === mesaActivaId);
    if (!mesaActual || !mesaActual.pedido) return;

    const nuevaVenta = {
      total_original: totalOrig,
      metodo_pago: metodoPago,
      descuento: descuentoApli,
      total_final: totalFin,
      items: mesaActual.pedido.items
    };

    setMesas((prev) => prev.map((m) => m.id === mesaActivaId ? { ...m, estado: 'Libre', pedido: null } : m));
    guardarMesaDB(mesaActivaId, 'Libre', null);
    
    setModal(null);
    volverAGrid();

    const { error } = await supabase.from('ventas').insert([nuevaVenta]);
    if (error) console.error("Error registrando la venta:", error);
  }

  function cancelarMesaSinCobrar() {
    const mesaActual = mesas.find((m) => m.id === mesaActivaId);
    if (!mesaActual) return;
    
    setMesas((prev) => prev.map((m) => m.id === mesaActivaId ? { ...m, estado: 'Libre', pedido: null } : m));
    guardarMesaDB(mesaActivaId, 'Libre', null);
    
    setModal(null);
    volverAGrid();
  }

  async function registrarEgreso(motivo, montoNum, metodo) {
    const nuevoEgreso = {
      total_original: -montoNum,
      metodo_pago: metodo,
      descuento: 0,
      total_final: -montoNum,
      items: [{ productId: 0, nombre: `EGRESO: ${motivo}`, precioUnit: -montoNum, cantidad: 1 }]
    };

    setModal(null);
    
    const { error } = await supabase.from('ventas').insert([nuevoEgreso]);
    if (error) console.error("Error registrando egreso:", error);
  }

  async function confirmarEliminacionVenta() {
    if (!ventaAEliminar) return;
    const idBorrar = ventaAEliminar.id;
    
    setVentas(prev => prev.filter(v => v.id !== idBorrar));
    setModal(null);
    setVentaAEliminar(null);

    const { error } = await supabase.from('ventas').delete().eq('id', idBorrar);
    if (error) console.error("Error al eliminar venta:", error);
  }

  async function intentarLoginAdmin() {
    try {
      const msgBuffer = new TextEncoder().encode(pinInput);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      if (hashHex === ADMIN_PIN_HASH) {
        setRol('admin'); setModal(null); setPinInput(''); setPinError(false);
      } else {
        setPinError(true); setPinInput('');
      }
    } catch (e) {
      console.error("Error encriptando PIN:", e);
    }
  }

  function salirDeAdmin() { setRol('mozo'); if (vista === 'admin') setVista('grid'); }

  async function guardarProducto(datos) {
    if (productoEditando) {
      setProductos((prev) => prev.map((p) => (p.id === productoEditando.id ? { ...p, ...datos } : p)));
      const { error } = await supabase.from('productos').update(datos).eq('id', productoEditando.id);
      if (error) console.error("Error al actualizar producto:", error);
    } else {
      const { data, error } = await supabase.from('productos').insert([datos]).select();
      if (data && data.length > 0) setProductos((prev) => [...prev, data[0]]);
      if (error) console.error("Error al agregar producto:", error);
    }
    setModal(null); setProductoEditando(null);
  }

  async function eliminarProducto(id) {
    setProductos((prev) => prev.filter((p) => p.id !== id));
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) console.error("Error al eliminar producto:", error);
  }

  async function agregarMesa() {
    const nuevoNumero = mesas.length > 0 ? Math.max(...mesas.map((m) => m.numero)) + 1 : 1;
    const nuevoId = mesas.length > 0 ? Math.max(...mesas.map((m) => m.id)) + 1 : 1;
    const nuevaMesa = { id: nuevoId, numero: nuevoNumero, capacidad: 4, estado: 'Libre', pedido: null };
    setMesas((prev) => [...prev, nuevaMesa]);
    const { error } = await supabase.from('mesas').insert([nuevaMesa]);
    if (error) { console.error("Error agregando mesa:", error); setErrorSync(true); }
  }

  async function eliminarMesa(id) {
    const m = mesas.find((x) => x.id === id);
    if (m && (m.estado === 'Ocupada' || m.estado === 'Reservada')) { setAvisoMesas('No se puede eliminar una mesa ocupada/reservada. Liberá la mesa primero.'); setTimeout(() => setAvisoMesas(''), 3000); return; }
    setMesas((prev) => prev.filter((x) => x.id !== id));
    const { error } = await supabase.from('mesas').delete().eq('id', id);
    if (error) { console.error("Error eliminando mesa:", error); setErrorSync(true); }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#DCD5C4', display: 'flex', justifyContent: 'center' }}>
      <div className="bc-app tema-bodegon">

        {cargando ? (
          <LoadingScreen />
        ) : (
          <>
          <Header vista={vista} mesa={mesaActiva} rol={rol} onBack={volverAGrid} onAbrirLoginAdmin={() => { setPinError(false); setPinInput(''); setModal('pin'); }} onIrAdmin={() => setVista('admin')} onSalir={() => setIntentoSalir(true)} />
            {errorSync && <div className="banner-error">No se pudo guardar el último cambio. Revisá tu conexión.</div>}
            
            {vista === 'grid' && <GridMesas mesas={mesas} onAbrirMesa={abrirMesa} justChanged={justChanged} />}
            
            {vista === 'mesa' && mesaActiva && (
              <DetalleMesa
                mesa={mesaActiva} productos={productos} categorias={categorias} categoriaFiltro={categoriaFiltro}
                onFiltrar={setCategoriaFiltro} onIniciarAgregarItem={iniciarAgregarItem} onCambiarCantidad={cambiarCantidad}
                onQuitarItem={quitarItem} onAbrirRecibo={() => setModal('recibo')} onAbrirCobrar={() => setModal('cobrar')}
                onCambiarEstadoDirecto={cambiarEstadoDirectoMesa}
                onAbrirNota={(index, notaActual) => setItemNota({ index, notaActual })}
                onAbrirCancelarMesa={() => setModal('cancelar_mesa')} 
              />
            )}
            
            {vista === 'admin' && rol === 'admin' && (
              <PanelAdmin
                productos={productos} mesas={mesas} ventas={ventas} onSalir={salirDeAdmin} onNuevoProducto={() => { setProductoEditando(null); setModal('producto'); }}
                onEditarProducto={(p) => { setProductoEditando(p); setModal('producto'); }} onEliminarProducto={eliminarProducto}
                onAgregarMesa={agregarMesa} onEliminarMesa={eliminarMesa} avisoMesas={avisoMesas}
                onAbrirEliminarVenta={(v) => { setVentaAEliminar(v); setModal('eliminar_venta'); }} 
                onAbrirEgreso={() => setModal('egreso')}
              />
            )}
          </>
        )}

        {modal === 'pin' && <PinModal pinInput={pinInput} setPinInput={setPinInput} pinError={pinError} onConfirmar={intentarLoginAdmin} onClose={() => setModal(null)} />}
        
        {/* 🚀 MODAL COCINA ACTUALIZADO CON IFRAME */}
        {modal === 'recibo' && mesaActiva && <TicketCocinaModal mesa={mesaActiva} onClose={() => setModal(null)} />}
        
        {/* 🚀 MODAL COBRO ACTUALIZADO CON IFRAME */}
        {modal === 'cobrar' && mesaActiva && <ConfirmarCobroModal mesa={mesaActiva} onCancelar={() => setModal(null)} onConfirmar={cobrarYCerrar} />}
        
        {modal === 'cancelar_mesa' && mesaActiva && <ConfirmarCancelarMesaModal mesa={mesaActiva} onCancelar={() => setModal(null)} onConfirmar={cancelarMesaSinCobrar} />}
        
        {modal === 'seleccionar_salsa' && productoParaSalsa && (
          <SeleccionarSalsaModal 
            producto={productoParaSalsa} 
            salsasDisponibles={salsasDisponibles} 
            onCancelar={() => { setModal(null); setProductoParaSalsa(null); }} 
            onConfirmar={(salsa) => agregarItemConfirmado(productoParaSalsa, salsa)} 
          />
        )}
        
        {modal === 'producto' && <ProductoFormModal producto={productoEditando} categoriasExistentes={categorias.filter((c) => c !== 'Todas')} onGuardar={guardarProducto} onClose={() => { setModal(null); setProductoEditando(null); }} />}
        
        {modal === 'egreso' && <EgresoModal onClose={() => setModal(null)} onGuardar={registrarEgreso} />}
        
        {itemNota && <NotaModal notaActual={itemNota.notaActual} onClose={() => setItemNota(null)} onGuardar={guardarNotaItem} />}
        {modal === 'eliminar_venta' && <ConfirmarEliminarVentaModal venta={ventaAEliminar} onCancelar={() => { setModal(null); setVentaAEliminar(null); }} onConfirmar={confirmarEliminacionVenta} />}
      </div>
      {/* 🚀 MODAL CERRAR SESIÓN */}
        {intentoSalir && (
          <div className="modal-overlay" style={{ zIndex: 3000 }}>
            <div className="modal-content" style={{ maxWidth: '350px', textAlign: 'center', padding: '24px' }}>
              <LogOut size={48} color="var(--ocupada)" style={{ margin: '0 auto 16px' }} />
              <h3 style={{ marginTop: 0 }}>¿Cerrar Sesión?</h3>
              <p style={{ color: 'var(--text-muted)' }}>Tendrás que volver a ingresar tu clave para entrar al sistema de gestión.</p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIntentoSalir(false)}>Cancelar</button>
                <button className="btn btn-primary" style={{ flex: 1, background: 'var(--ocupada)', border: 'none' }} onClick={() => { setIntentoSalir(false); onSalir(); }}>
                  Sí, salir
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}