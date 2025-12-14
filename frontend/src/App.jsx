import React from 'react';
import Storefront from './storefront';
import Admin from './admin';

export default function App() {
  const [view, setView] = React.useState('store');
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 20 }}>
      <h1>Microservice Storefront</h1>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('store')}>Storefront</button>{' '}
        <button onClick={() => setView('admin')}>Admin</button>
      </div>
      {view === 'store' ? <Storefront /> : <Admin />}
    </div>
  );
}
