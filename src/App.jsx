import React from 'react';
import { Home } from 'lucide-react';

const style = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Nunito', system-ui, sans-serif",
    background: '#FFFBF5',
    color: '#1C1917',
    padding: 24,
    textAlign: 'center',
  },
  icon: {
    background: '#F97316',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    display: 'inline-flex',
  },
  title: {
    fontSize: 36,
    fontWeight: 800,
    margin: '0 0 8px',
    color: '#F97316',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 400,
    color: '#78716C',
    margin: 0,
  },
};

export function App() {
  return (
    <div style={style.container}>
      <div style={style.icon}>
        <Home size={48} color="#fff" />
      </div>
      <h1 style={style.title}>FamTastic</h1>
      <p style={style.subtitle}>Familjens samlingsplats — snart här! 🎉</p>
    </div>
  );
}
