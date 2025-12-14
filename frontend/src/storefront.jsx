import React from 'react';

export default function Storefront() {
  const [products, setProducts] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [creating, setCreating] = React.useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE || '';

  React.useEffect(() => {
    fetch(API_BASE + '/products')
      .then((r) => r.json())
      .then((data) => setProducts(data || []))
      .finally(() => setLoading(false));
  }, []);

  async function checkout(product) {
    setError(null);
    setCreating(product.id);
    const success = window.location.origin + window.location.pathname + '?success=1';
    const cancel = window.location.href + '?cancel=1';
    try {
      const res = await fetch(API_BASE + '/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          successUrl: success,
          cancelUrl: cancel,
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'no url returned');
      }
    } catch (err) {
      console.error('Checkout error', err);
      setError('Failed to create checkout session. Try again later.');
    } finally {
      setCreating(null);
    }
  }

  const params = new URLSearchParams(window.location.search);
  const successParam = params.get('success');

  if (loading) return <div>Loading products...</div>;
  return (
    <div>
      {successParam === '1' && (
        <div style={{ padding: 10, background: '#e6ffed', marginBottom: 10 }}>
          Payment successful — check your email for license if applicable.
        </div>
      )}
      {error && (
        <div style={{ padding: 10, background: '#ffe6e6', marginBottom: 10 }}>
          {error}
        </div>
      )}
      {products.length === 0 && <div>No products available</div>}
      <ul>
        {products.map((p) => {
          const currency = (p.currency || 'usd').toUpperCase();
          const price = new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
          }).format(Number(p.price));
          return (
            <li key={p.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <strong>{p.name}</strong>
                <span style={{ color: '#333' }}>{price}</span>
                {p.license && (
                  <span style={{ background: '#ffd', padding: '2px 6px', borderRadius: 4 }}>
                    License
                  </span>
                )}
                <span style={{ color: '#666', fontSize: 12 }}>{p.type || 'one-time'}</span>
                {p.type === 'subscription' && p.interval && (
                  <span style={{ color: '#666', fontSize: 12 }}> · {p.interval}</span>
                )}
              </div>
              <div>{p.description}</div>
              <div style={{ marginTop: 6 }}>
                <button onClick={() => checkout(p)} disabled={creating === p.id}>
                  {creating === p.id ? 'Creating...' : 'Buy'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
