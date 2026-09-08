import React, { useState } from 'react';
import './PantallaLogin.css';
import miFirma from '../assets/firma5.png';
import { supabase } from '../supabaseClient'; // Asegúrate de tener la configuración de Supabase en este archivo

// 🚀 Le agregamos el prop "onLogin" que manda App.jsx
export default function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');

  // 🚀 La función que habla con Supabase cuando tocan el botón rojo
  async function manejarSubmit(e) {
    e.preventDefault();
    setError('');

    if (!usuario || !contrasena) {
      setError('Completá todos los datos.');
      return;
    }

    // Buscamos en tu tabla de Supabase
    const { data, error: errorDb } = await supabase
      .from('usuarios')
      .select('*')
      .eq('usuario', usuario)
      .eq('contrasena', contrasena)
      .single();

    if (errorDb || !data) {
      setError('Usuario o contraseña incorrectos');
      return;
    }

    // Si todo está bien, le pasa el rol (pub o bodegon) al App.jsx
    onLogin(data.rol);
  }

  return (
    <div className="login-container">
      <div className="login-box">
        {/* Tu título, logo y diseño original van acá */}
        <h1 style={{ color: '#E50914', textAlign: 'center' }}>Gastreno  </h1>
        <p style={{ color: '#888', textAlign: 'center' }}>Sistema de Gestión Gastronómica</p>

        {/* 🚀 El form debe ejecutar manejarSubmit */}
        <form onSubmit={manejarSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
          
          <input 
            type="text" 
            placeholder="Usuario o Email" 
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="admin-input" // O la clase que le hayas puesto
          />
          
          <input 
            type="password" 
            placeholder="Contraseña" 
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            className="admin-input"
          />

          {/* Muestra un cartel de error si ponen mal la clave */}
          {error && <div style={{ color: '#E50914', textAlign: 'center', fontSize: '14px' }}>{error}</div>}

          <button type="submit" style={{ background: '#E50914', color: '#FFF', padding: '14px', borderRadius: '8px', border: 'none', fontWeight: 'bold' }}>
            INICIAR SESIÓN
          </button>

        </form>

        {/* Acá abajo iba tu firma y el desarrollador */}
{/* ✒️ FIRMA FLOTANTE ABAJO A LA DERECHA */}
      <div className="firma-footer">
        <div className="firma-texto">
          <div className="firma-rol">Desarrollado por</div>
          <div className="firma-nombre">Marcelo Acosta</div>
        </div>
        <img 
          src={miFirma} 
          alt="Firma" 
          className="firma-foto"
        />
      </div>
</div>
    </div>
  );
}