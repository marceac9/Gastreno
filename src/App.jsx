import React, { useState, useEffect } from 'react';
import PubApp from './components/PubApp';
import BodegonApp from './components/BodegonApp'; // 🚀 ¡Acá conectamos el Bodegón!
import Login from './components/PantallaLogin'; // 🚀 ¡Acá importamos tu diseño original!

export default function App() {
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Revisa la memoria al abrir la app
  useEffect(() => {
    const rolGuardado = localStorage.getItem('rolUsuario');
    if (rolGuardado) {
      setSesion(rolGuardado);
    }
    setCargando(false);
  }, []);

  // Esta función se la pasamos a tu Login para que nos avise cuando la clave esté bien
  function iniciarSesion(rol) {
    localStorage.setItem('rolUsuario', rol);
    setSesion(rol);
  }

  function cerrarSesion() {
    localStorage.removeItem('rolUsuario');
    setSesion(null);
  }

  if (cargando) return <div style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>Cargando sistema...</div>;

  // ==========================================
  // 🚦 EL SEMÁFORO DE PANTALLAS
  // ==========================================

  // 1. Si no hay sesión, cargamos TU componente Login original
  if (!sesion) {
    return <Login onLogin={iniciarSesion} />;
  }

  // 2. Si el rol es Pub, entra al Quick Service
  if (sesion === 'pub') {
    return <PubApp onSalir={cerrarSesion} />;
  }

  // 3. Si el rol es Bodegón, entra al sistema de Mesas
  if (sesion === 'bodegon') {
    return <BodegonApp onSalir={cerrarSesion} />;
  }

  return (
    <div style={{ color: 'white', textAlign: 'center', marginTop: '50px' }}>
      Error: Rol desconocido. <button onClick={cerrarSesion}>Volver</button>
    </div>
  );
}