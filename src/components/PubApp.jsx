import React, { useState, useEffect } from 'react';
import { Minus, Printer, Trash2, ShieldCheck, LogOut, ArrowLeft, Search, Star, AlertTriangle, X, Plus, DollarSign, ListChecks, Download, Pencil, Check } from 'lucide-react';
import { supabase } from '../supabaseClient'; 
import './PubApp.css';

function formatMoney(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0);
}

export default function PubApp({ onSalir }) {
  // --- ESTADOS DEL PUNTO DE VENTA ---
  const [ticket, setTicket] = useState([]);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [catalogo, setCatalogo] = useState([]); 
  const [vistaActual, setVistaActual] = useState('favoritos'); 
  const [filtroTexto, setFiltroTexto] = useState('');

  // --- ESTADOS DE UI Y MODALES ---
  const [alerta, setAlerta] = useState('');
  const [modalAdminAbierto, setModalAdminAbierto] = useState(false);
  const [adminTab, setAdminTab] = useState('carta'); 
  const [intentoSalir, setIntentoSalir] = useState(false); 
  const [ventaAEliminar, setVentaAEliminar] = useState(null); // Ahora guarda el objeto completo (venta o gasto)

  // --- ESTADOS DE CONTABILIDAD Y GASTOS ---
  const [ventasDiarias, setVentasDiarias] = useState([]); 
  const [mesFiltro, setMesFiltro] = useState(new Date().toISOString().slice(0, 7)); 
  const [listaGastos, setListaGastos] = useState([]); 
  const [modalGastoAbierto, setModalGastoAbierto] = useState(false);
  const [formGastoDesc, setFormGastoDesc] = useState('');
  const [formGastoMonto, setFormGastoMonto] = useState('');

  // --- ESTADOS DEL FORMULARIO CRUD ---
  const [formNombre, setFormNombre] = useState('');
  const [formPrecio, setFormPrecio] = useState('');
  const [formCategoria, setFormCategoria] = useState('trago');
  const [productoEditando, setProductoEditando] = useState(null);

  function mostrarAlerta(mensaje) {
    setAlerta(mensaje);
    setTimeout(() => setAlerta(''), 3000);
  }

  // ==========================================
  // 🚀 CARGAR TODO DESDE SUPABASE AL ABRIR
  // ==========================================
  useEffect(() => {
    obtenerDatos();
  }, []);

  async function obtenerDatos() {
    const { data: prodData } = await supabase.from('productos_pub').select('*').order('id', { ascending: true });
    if (prodData) setCatalogo(prodData);

    const { data: ventData } = await supabase.from('ventas_pub').select('*').order('id', { ascending: false });
    if (ventData) setVentasDiarias(ventData);

    const { data: gastData } = await supabase.from('gastos_pub').select('*').order('id', { ascending: false });
    if (gastData) setListaGastos(gastData);
  }

  // --- FUNCIONES DEL CAJERO ---
  const favoritos = catalogo.filter(p => p.esFavorito);

  function agregarAlTicket(producto) {
    setTicket(prev => {
      const existe = prev.find(item => item.id === producto.id);
      if (existe) {
        return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  }

  function seleccionarProducto(producto) {
    agregarAlTicket(producto);
    setVistaActual('favoritos'); 
    setFiltroTexto('');
  }

  async function toggleFavorito(e, id) {
    e.stopPropagation(); 
    const producto = catalogo.find(p => p.id === id);
    if (!producto.esFavorito && favoritos.length >= 9) {
      mostrarAlerta('Máximo 9 botones destacados permitidos.');
      return;
    }

    const { data, error } = await supabase
      .from('productos_pub')
      .update({ esFavorito: !producto.esFavorito })
      .eq('id', id)
      .select();

    if (!error && data) {
      setCatalogo(prev => prev.map(p => p.id === id ? data[0] : p));
    }
  }

  function restarDelTicket(productoId) {
    setTicket(prev => {
      const existe = prev.find(item => item.id === productoId);
      if (existe && existe.cantidad > 1) {
        return prev.map(item => item.id === productoId ? { ...item, cantidad: item.cantidad - 1 } : item);
      }
      return prev.filter(item => item.id !== productoId);
    });
  }

  function vaciarTicket() { setTicket([]); }

  const total = ticket.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  // ==========================================
  // 🚀 COBRAR Y MANDAR VENTA A LA NUBE
  // ==========================================
  async function cobrarTicket() {
    if (ticket.length === 0) return;
    
    const nuevaVenta = {
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      total: total,
      metodo: metodoPago,
      resumen: ticket.map(t => `${t.cantidad}x ${t.nombre}`).join(', ') 
    };

    const { data, error } = await supabase
      .from('ventas_pub')
      .insert([nuevaVenta])
      .select();

    if (!error && data) {
      setVentasDiarias(prev => [data[0], ...prev]);
      mostrarAlerta(`¡Venta cobrada! Ingreso: ${formatMoney(total)} en ${metodoPago}`);
      vaciarTicket();
    } else {
      mostrarAlerta('Error al guardar la venta en la nube.');
    }
  }

 function imprimirTicket() {
    if (ticket.length === 0) {
      mostrarAlerta('Agregá un producto antes de imprimir.');
      return;
    }
    const fecha = new Date().toLocaleDateString();
    const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let filasHTML = '';
    ticket.forEach(item => {
      filasHTML += `
        <tr>
          <td style="width: 30px; font-weight: bold; padding-bottom: 8px;">${item.cantidad}x</td>
          <td style="padding-bottom: 8px;">${item.nombre}</td>
          <td style="text-align: right; padding-bottom: 8px;">${formatMoney(item.precio * item.cantidad)}</td>
        </tr>
      `;
    });

    const ticketHTML = `
      <html>
        <head>
          <title>Imprimir Ticket</title>
          <style>
            /* 🚀 ESTO ARREGLA EL CORTE AUTOMÁTICO */
            @page {
              margin: 0;
              size: auto; 
            }
            /* 🚀 padding-bottom: 50px deja los centímetros en blanco que pidió el cliente */
            body { 
              font-family: 'Courier New', Courier, monospace; 
              color: #000; 
              margin: 0; 
              padding: 10px 10px 50px 10px; 
              width: 300px; 
            }
            h2 { text-align: center; margin: 0 0 10px 0; text-transform: uppercase; font-size: 22px; }
            p { text-align: center; margin: 0 0 10px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 14px; }
            hr { border: none; border-top: 1px dashed #000; margin: 10px 0; }
            h3 { text-align: right; margin: 10px 0; font-size: 18px; }
          </style>
        </head>
        <body>
          <h2>The Puchi's Club</h2>
          <p>Fecha: ${fecha} - ${hora}</p>
          <hr />
          <table>
            <tbody>
              ${filasHTML}
            </tbody>
          </table>
          <hr />
          <h3>TOTAL: ${formatMoney(total)}</h3>
          <p style="margin-top: 15px;">¡Gracias por tu visita!</p>
        </body>
      </html>
    `;

    let iframe = document.getElementById('iframe-impresora');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'iframe-impresora';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }
    iframe.contentDocument.open();
    iframe.contentDocument.write(ticketHTML);
    iframe.contentDocument.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 250);
  }

  // --- FUNCIONES ADMIN DE CARTA ---
  async function agregarAlCatalogo(e) {
    e.preventDefault();
    if (!formNombre || !formPrecio) {
      mostrarAlerta('Completá el nombre y el precio del producto.');
      return;
    }
    
    const nuevoProducto = {
      nombre: formNombre.toUpperCase(),
      precio: parseFloat(formPrecio),
      categoria: formCategoria,
      esFavorito: false
    };

    const { data, error } = await supabase.from('productos_pub').insert([nuevoProducto]).select();

    if (!error && data) {
      setCatalogo([...catalogo, data[0]]);
      setFormNombre('');
      setFormPrecio('');
      mostrarAlerta('¡Producto agregado con éxito!');
    }
  }

  async function eliminarDelCatalogo(id) {
    const confirmar = window.confirm('¿Seguro que deseás eliminar este producto definitivamente de la carta?');
    if (!confirmar) return;

    const { error } = await supabase.from('productos_pub').delete().eq('id', id);
    if (!error) {
      setCatalogo(prev => prev.filter(p => p.id !== id));
      mostrarAlerta('Producto eliminado de la carta.');
    }
  }

  async function guardarEdicionProducto(e) {
    e.preventDefault();
    if (!productoEditando.nombre || !productoEditando.precio) return;

    const { data, error } = await supabase
      .from('productos_pub')
      .update({
        nombre: productoEditando.nombre.toUpperCase(),
        precio: parseFloat(productoEditando.precio),
        categoria: productoEditando.categoria
      })
      .eq('id', productoEditando.id)
      .select();

    if (!error && data) {
      setCatalogo(prev => prev.map(p => p.id === productoEditando.id ? data[0] : p));
      setProductoEditando(null);
      mostrarAlerta('¡Producto actualizado correctamente!');
    }
  }

  // ==========================================
  // 🚀 ELIMINAR VENTA O GASTO DE LA NUBE
  // ==========================================
  async function confirmarEliminacionVenta() {
    if (!ventaAEliminar) return;
    
    const { id, tipo } = ventaAEliminar;

    if (tipo === 'gasto') {
      const { error } = await supabase.from('gastos_pub').delete().eq('id', id);
      if (!error) {
        setListaGastos(prev => prev.filter(g => g.id !== id));
        mostrarAlerta('Gasto eliminado. El monto vuelve a la caja.');
      } else {
        mostrarAlerta('Error al intentar borrar el gasto.');
      }
    } else {
      const { error } = await supabase.from('ventas_pub').delete().eq('id', id);
      if (!error) {
        setVentasDiarias(prev => prev.filter(v => v.id !== id));
        mostrarAlerta('Transacción eliminada de la caja.');
      } else {
        mostrarAlerta('Error al intentar borrar la venta.');
      }
    }
    
    setVentaAEliminar(null); // Cierra el modal
  }

  // ==========================================
  // 🚀 REGISTRAR GASTO EN LA NUBE
  // ==========================================
  async function registrarGasto(e) {
    e.preventDefault();
    if (!formGastoDesc || !formGastoMonto) {
      mostrarAlerta('Completá la descripción y el monto del gasto.');
      return;
    }

    const nuevoGasto = {
      descripcion: formGastoDesc,
      monto: parseFloat(formGastoMonto)
    };

    const { data, error } = await supabase.from('gastos_pub').insert([nuevoGasto]).select();

    if (!error && data) {
      setListaGastos([data[0], ...listaGastos]);
      setFormGastoDesc('');
      setFormGastoMonto('');
      setModalGastoAbierto(false);
      mostrarAlerta('¡Gasto registrado en la caja!');
    } else {
      mostrarAlerta('Error al registrar el gasto.');
    }
  }

  function exportarAExcel() {
    if (ventasDiarias.length === 0 && listaGastos.length === 0) {
      mostrarAlerta('No hay movimientos en la caja para exportar.');
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Tipo de Movimiento;Hora;Método de Pago;Detalle;Monto\n";

    ventasDiarias.forEach(venta => {
      const detalleLimpio = venta.resumen ? venta.resumen.replace(/;/g, ' |') : ''; 
      const fila = `INGRESO;${venta.hora || '--'};${venta.metodo};${detalleLimpio};$${venta.total}`;
      csvContent += fila + "\n";
    });

    listaGastos.forEach(gasto => {
      const detalleLimpio = gasto.descripcion ? gasto.descripcion.replace(/;/g, ' |') : ''; 
      const fila = `EGRESO;--;Efectivo (Caja);Gastos: ${detalleLimpio};-$${gasto.monto}`;
      csvContent += fila + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Caja_Pub_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    mostrarAlerta('¡Historial exportado con éxito!');
  }

  const productosFiltrados = catalogo.filter(p => {
    const coincideTexto = p.nombre.toLowerCase().includes(filtroTexto.toLowerCase());
    if (vistaActual === 'carta') return p.categoria === 'trago' && coincideTexto;
    if (vistaActual === 'promos') return p.categoria === 'promo' && coincideTexto;
    return false;
  });

  const totalCaja = ventasDiarias.reduce((acc, v) => acc + v.total, 0);
  const cajaEfectivo = ventasDiarias.filter(v => v.metodo === 'Efectivo').reduce((acc, v) => acc + v.total, 0);
  const cajaTransferencia = ventasDiarias.filter(v => v.metodo === 'Transferencia').reduce((acc, v) => acc + v.total, 0);
  const totalGastos = listaGastos.reduce((acc, g) => acc + g.monto, 0);

  // 🚀 MEZCLAMOS VENTAS Y GASTOS PARA LA TABLA DEL HISTORIAL
  const historialMovimientos = [
    ...ventasDiarias.map(v => ({ ...v, tipo: 'venta' })),
    ...listaGastos.map(g => ({ ...g, tipo: 'gasto' }))
  ].sort((a, b) => b.id - a.id); // Los ordenamos por ID para que los más nuevos salgan arriba

  return (
    <div className="bc-app tema-pub">
      {/* HEADER */}
      <div className="bc-header" style={{ justifyContent: 'space-between', padding: '12px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* 🚀 TÍTULO ACTUALIZADO A THE PUCHI'S CLUB */}
          <div className="bc-script" style={{ fontSize: 28, color: 'var(--accent)', lineHeight: 1 }}>The Puchi's Club</div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn btn-outline" style={{ padding: '8px 16px' }} onClick={() => setModalAdminAbierto(true)}>
            <ShieldCheck size={18} style={{ marginRight: '6px' }} /> Admin
          </button>
          
          <button className="btn btn-outline" style={{ padding: '8px 16px', borderColor: 'var(--ocupada)', color: 'var(--ocupada)' }} onClick={() => setIntentoSalir(true)}>
            <LogOut size={18} style={{ marginRight: '6px' }} /> Cerrar Sesión
          </button>
        </div>
      </div>

      <div className="pub-container">
        {/* LADO IZQUIERDO */}
        <div className="pub-left">
          {vistaActual === 'favoritos' ? (
            <>
              <div className="pub-grid">
                {favoritos.map(p => (
                  <div key={p.id} className="pub-btn" onClick={() => agregarAlTicket(p)}>
                    <div className="pub-btn-name">{p.nombre}</div>
                    <div className="pub-btn-price">{formatMoney(p.precio)}</div>
                  </div>
                ))}
              </div>
              <div className="pub-actions">
                <button className="btn btn-outline" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', padding: '16px' }} onClick={() => setVistaActual('promos')}>
                  🎁 VER PROMOS
                </button>
                <button className="btn btn-outline" style={{ padding: '16px' }} onClick={() => setVistaActual('carta')}>
                  📋 TODA LA CARTA
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <button className="btn btn-outline" style={{ padding: '14px' }} onClick={() => setVistaActual('favoritos')}>
                  <ArrowLeft size={24} />
                </button>
                <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={20} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
                  <input type="text" autoFocus placeholder={`Buscar en ${vistaActual === 'promos' ? 'promociones' : 'toda la carta'}...`} value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} style={{ width: '100%', padding: '16px 16px 16px 44px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '16px', outline: 'none' }} />
                </div>
              </div>
              <div className="pub-grid">
                {productosFiltrados.length > 0 ? (
                  productosFiltrados.map(p => (
                    <div key={p.id} className="pub-btn" style={{ position: 'relative' }} onClick={() => seleccionarProducto(p)}>
                      <button onClick={(e) => toggleFavorito(e, p.id)} style={{ position: 'absolute', top: '8px', right: '8px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <Star size={20} fill={p.esFavorito ? 'var(--accent)' : 'none'} color={p.esFavorito ? 'var(--accent)' : 'var(--text-muted)'} />
                      </button>
                      <div className="pub-btn-name" style={{ marginTop: '12px' }}>{p.nombre}</div>
                      <div className="pub-btn-price">{formatMoney(p.precio)}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', gridColumn: '1 / -1', marginTop: '20px' }}>No se encontró nada con ese nombre</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* LADO DERECHO: TICKET EN PANTALLA */}
        <div className="pub-right">
          <div className="ticket-header">TICKET ACTUAL</div>
          <div className="ticket-items">
            {ticket.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px', fontSize: 14 }}>Tocá un producto para empezar</div>
            ) : (
              ticket.map(item => (
                <div key={item.id} className="pub-ticket-row">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="pub-ticket-qty">{item.cantidad}x</span>
                    <span>{item.nombre}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span>{formatMoney(item.precio * item.cantidad)}</span>
                    <button className="btn" style={{ backgroundColor: 'var(--ocupada)', color: '#FFF', padding: '6px 20px', border: 'none', borderRadius: '8px' }} onClick={() => restarDelTicket(item.id)}>
                      <Minus size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="pub-pay-section">
            <div className="pub-total">TOTAL: {formatMoney(total)}</div>
            
            <div className="pub-pay-grid">
              {['Efectivo', 'Transferencia'].map(metodo => (
                <div key={metodo} className={`pub-pay-btn ${metodoPago === metodo ? 'active' : ''}`} onClick={() => setMetodoPago(metodo)}>
                  {metodo}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" style={{ padding: '16px', color: 'var(--text-muted)', borderColor: 'var(--border)' }} onClick={vaciarTicket} title="Vaciar Ticket">
                <Trash2 size={24} />
              </button>

              <button 
                className="btn btn-outline" 
                style={{ padding: '16px', color: 'var(--text)', borderColor: 'var(--border)' }} 
                disabled={ticket.length === 0}
                onClick={imprimirTicket}
                title="Imprimir Ticket"
              >
                <Printer size={24} />
              </button>

              <button className="btn btn-primary" style={{ flex: 1, padding: '16px', fontSize: 20, fontWeight: 800 }} disabled={ticket.length === 0} onClick={cobrarTicket}>
                <Check size={24} style={{ marginRight: 8 }} /> COBRAR
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🔔 ALERTA FLOTANTE */}
      {alerta && (
        <div className="alerta-toast">
          <AlertTriangle size={20} />
          {alerta}
        </div>
      )}

      {/* 🛡️ MODAL DE ADMINISTRACIÓN */}
      {modalAdminAbierto && (
        <div className="modal-overlay">
          <div className="modal-content admin-modal">
            
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={24} />
                PANEL DE GESTIÓN
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button className={`btn ${adminTab === 'carta' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '8px 16px', border: adminTab === 'carta' ? 'none' : '1px solid var(--border)' }} onClick={() => setAdminTab('carta')}>
                  <ListChecks size={18} style={{ marginRight: '6px' }} /> Catálogo
                </button>
                <button className={`btn ${adminTab === 'ventas' ? 'btn-primary' : 'btn-outline'}`} style={{ padding: '8px 16px', border: adminTab === 'ventas' ? 'none' : '1px solid var(--border)' }} onClick={() => setAdminTab('ventas')}>
                  <DollarSign size={18} style={{ marginRight: '6px' }} /> Caja y Ventas
                </button>
                <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 8px' }}></div>
                <button className="icon-btn-ghost" onClick={() => setModalAdminAbierto(false)}>
                  <X size={24} color="var(--text)" />
                </button>
              </div>
            </div>

            <div className="modal-body">
              {/* === PESTAÑA CARTA === */}
              {adminTab === 'carta' && (
                <>
                  <form className="admin-grid" onSubmit={agregarAlCatalogo}>
                    <input className="admin-input" placeholder="Nombre del producto" value={formNombre} onChange={e => setFormNombre(e.target.value)} />
                    <input type="number" className="admin-input" placeholder="Precio ($)" value={formPrecio} onChange={e => setFormPrecio(e.target.value)} />
                    <select className="admin-input" value={formCategoria} onChange={e => setFormCategoria(e.target.value)}>
                      <option value="trago">Trago / Bebida</option>
                      <option value="promo">Promoción / Combo</option>
                      <option value="general">Entrada / General</option>
                    </select>
                    <button type="submit" className="btn btn-primary" style={{ padding: '14px', borderRadius: '8px' }}>
                      <Plus size={22} />
                    </button>
                  </form>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead><tr><th>Nombre</th><th>Categoría</th><th>Precio</th><th style={{ textAlign: 'center' }}>Acciones</th></tr></thead>
                      <tbody>
                        {catalogo.length === 0 ? (
                          <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Cargando carta o sin productos...</td></tr>
                        ) : (
                          catalogo.map(p => (
                            <tr key={p.id}>
                              <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                              <td><span style={{ background: 'var(--bg)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 800 }}>{p.categoria}</span></td>
                              <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{formatMoney(p.precio)}</td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                  <button className="icon-btn-ghost" style={{ color: '#3182CE' }} onClick={() => setProductoEditando(p)}>
                                    <Pencil size={18} />
                                  </button>
                                  <button className="icon-btn-ghost" style={{ color: 'var(--ocupada)' }} onClick={() => eliminarDelCatalogo(p.id)}>
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* === PESTAÑA VENTAS === */}
              {adminTab === 'ventas' && (
                <>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'center', background: 'var(--bg)', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Filtrar período:</div>
                    <input type="month" className="admin-input" style={{ width: 'auto', padding: '8px 12px', margin: 0 }} value={mesFiltro} onChange={(e) => setMesFiltro(e.target.value)} />
                    <div style={{ flex: 1 }}></div>
                    <button className="btn btn-outline" style={{ padding: '8px 16px', color: 'var(--ocupada)', borderColor: 'var(--ocupada)', background: 'var(--ocupada-bg)' }} onClick={() => setModalGastoAbierto(true)}>
                      <Minus size={18} style={{ marginRight: '6px' }} /> Registrar Gasto
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Efectivo</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--libre)' }}>{formatMoney(cajaEfectivo)}</div>
                    </div>
                    <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Transferencia</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#3182CE' }}>{formatMoney(cajaTransferencia)}</div>
                    </div>
                    <div style={{ background: 'var(--ocupada-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--ocupada)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--ocupada)', fontWeight: 700, textTransform: 'uppercase' }}>Gastos Totales</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ocupada)' }}>{formatMoney(totalGastos)}</div>
                    </div>
                    <div style={{ background: 'var(--accent)', padding: '16px', borderRadius: '12px', color: '#FFF' }}>
                      <div style={{ fontSize: '11px', opacity: 0.8, fontWeight: 700, textTransform: 'uppercase' }}>Ganancia Neta</div>
                      <div style={{ fontSize: '20px', fontWeight: 800 }}>{formatMoney(totalCaja - totalGastos)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-muted)' }}>Movimientos Registrados ({historialMovimientos.length})</h4>
                    <button className="btn btn-outline" style={{ padding: '8px 16px', borderColor: 'var(--libre)', color: 'var(--libre)' }} onClick={exportarAExcel}>
                      <Download size={18} style={{ marginRight: '8px' }} /> Exportar a Excel
                    </button>
                  </div>
                  <div className="admin-table-container">
                    <table className="admin-table">
                      <thead><tr><th>Hora</th><th>Detalle del Movimiento</th><th>Método</th><th>Monto</th><th style={{ textAlign: 'center' }}>Acciones</th></tr></thead>
                      <tbody>
                        {historialMovimientos.length === 0 ? (
                          <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Todavía no hay movimientos registrados en la nube.</td></tr>
                        ) : (
                          historialMovimientos.map(mov => {
                            const esGasto = mov.tipo === 'gasto';
                            return (
                              <tr key={`${mov.tipo}-${mov.id}`}>
                                <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{esGasto ? '--:--' : mov.hora}</td>
                                <td style={{ fontSize: '13px' }}>
                                  {esGasto ? <span style={{ color: 'var(--ocupada)', fontWeight: 600 }}>GASTO: {mov.descripcion}</span> : mov.resumen}
                                </td>
                                <td>
                                  <span style={{ background: 'var(--bg)', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, color: 'var(--text)' }}>
                                    {esGasto ? 'Efectivo' : mov.metodo}
                                  </span>
                                </td>
                                <td style={{ color: esGasto ? 'var(--ocupada)' : 'var(--accent)', fontWeight: 700 }}>
                                  {esGasto ? `-${formatMoney(mov.monto)}` : formatMoney(mov.total)}
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                  <button className="icon-btn-ghost" style={{ color: 'var(--ocupada)', margin: '0 auto' }} onClick={() => setVentaAEliminar(mov)}>
                                    <Trash2 size={18} />
                                  </button>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🚀 MODALES DE SISTEMA */}
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

      {/* 🚀 MODAL ACTUALIZADO PARA VENTAS O GASTOS */}
      {ventaAEliminar !== null && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <div className="modal-content" style={{ maxWidth: '350px', textAlign: 'center', padding: '24px' }}>
            <Trash2 size={48} color="var(--ocupada)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ marginTop: 0 }}>¿Eliminar {ventaAEliminar.tipo === 'gasto' ? 'Gasto' : 'Venta'}?</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              {ventaAEliminar.tipo === 'gasto' 
                ? 'Se anulará este gasto y el monto volverá a sumarse a la caja.' 
                : 'Se restará este monto del total de la caja.'} Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setVentaAEliminar(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex: 1, background: 'var(--ocupada)', border: 'none' }} onClick={confirmarEliminacionVenta}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalGastoAbierto && (
        <div className="modal-overlay" style={{ zIndex: 1005 }}>
          <div className="modal-content" style={{ maxWidth: '400px', background: 'var(--surface)' }}>
            <div className="modal-header" style={{ background: 'var(--ocupada-bg)', color: 'var(--ocupada)', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Minus size={20} /> Registrar Gasto
              </h3>
              <button className="icon-btn-ghost" onClick={() => setModalGastoAbierto(false)}>
                <X size={24} color="var(--ocupada)" />
              </button>
            </div>
            <form className="modal-body" onSubmit={registrarGasto}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Descripción</label>
                <input type="text" className="admin-input" placeholder="¿En qué se gastó?" value={formGastoDesc} onChange={(e) => setFormGastoDesc(e.target.value)} autoFocus />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Monto ($)</label>
                <input type="number" className="admin-input" placeholder="Monto en pesos" value={formGastoMonto} onChange={(e) => setFormGastoMonto(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', background: 'var(--ocupada)', fontSize: '16px' }}>
                Guardar Gasto
              </button>
            </form>
          </div>
        </div>
      )}

      {productoEditando && (
        <div className="modal-overlay" style={{ zIndex: 1010 }}>
          <div className="modal-content" style={{ maxWidth: '400px', background: 'var(--surface)' }}>
            <div className="modal-header" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Pencil size={20} color="#3182CE" /> Editar Producto
              </h3>
              <button className="icon-btn-ghost" onClick={() => setProductoEditando(null)}>
                <X size={24} color="var(--text)" />
              </button>
            </div>
            <form className="modal-body" onSubmit={guardarEdicionProducto}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Nombre del producto</label>
                <input type="text" className="admin-input" value={productoEditando.nombre} onChange={(e) => setProductoEditando({...productoEditando, nombre: e.target.value})} autoFocus />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Precio ($)</label>
                <input type="number" className="admin-input" value={productoEditando.precio} onChange={(e) => setProductoEditando({...productoEditando, precio: e.target.value})} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)' }}>Categoría</label>
                <select className="admin-input" value={productoEditando.categoria} onChange={(e) => setProductoEditando({...productoEditando, categoria: e.target.value})}>
                  <option value="trago">Trago / Bebida</option>
                  <option value="promo">Promoción / Combo</option>
                  <option value="general">Entrada / General</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '16px', background: '#3182CE' }}>
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}