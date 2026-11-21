import { useState } from 'react';
import { login, register } from '../api/client.js';

export default function AuthPanel({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data =
        mode === 'login'
          ? await login(email, password)
          : await register(name, email, password);

      localStorage.setItem('medishield_token', data.token);
      localStorage.setItem('medishield_user', JSON.stringify(data.user));
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            mode === 'login' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Log In
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
            mode === 'register' ? 'bg-teal-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Register
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === 'register' && (
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-teal-500"
            required
          />
        )}
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-teal-500"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm outline-none focus:border-teal-500"
          required
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:opacity-50"
        >
          {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}
