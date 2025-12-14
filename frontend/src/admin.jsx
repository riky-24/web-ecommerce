import React from 'react';

export default function Admin() {
  const [token, setToken] = React.useState(null);
  const [orders, setOrders] = React.useState([]);
  const [licenses, setLicenses] = React.useState([]);

  async function login(e) {
    e.preventDefault();
    const form = e.target;
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.username.value,
        password: form.password.value,
      }),
    });
    const data = await res.json();
    if (data.token) setToken(data.token);
    else alert('Login failed');
  }

  async function loadData() {
    const hdr = token ? { Authorization: `Bearer ${token}` } : {};
    const o = await fetch('/orders', { headers: hdr }).then((r) => r.json());
    const l = await fetch('/licenses', { headers: hdr }).then((r) => r.json());
    setOrders(o || []);
    setLicenses(l || []);
  }

  return (
    <div>
      {!token ? (
        <form onSubmit={login}>
          <div>
            <input name="username" placeholder="admin" />
          </div>
          <div>
            <input name="password" type="password" placeholder="password" />
          </div>
          <button type="submit">Login</button>
        </form>
      ) : (
        <div>
          <div style={{ marginBottom: 10 }}>
            <button onClick={loadData}>Load Orders & Licenses</button>
          </div>
          <h3>Orders</h3>
          <pre>{JSON.stringify(orders, null, 2)}</pre>
          <h3>Licenses</h3>
          <pre>{JSON.stringify(licenses, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
