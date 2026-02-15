import React from 'react';
import ReactDOM from 'react-dom/client';
import { createSupabaseClient } from '@opp/data';
import { Placeholder } from '@opp/ui';
import App from './App';
import './index.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (supabaseUrl && supabaseAnonKey) {
  void createSupabaseClient({ url: supabaseUrl, anonKey: supabaseAnonKey });
}

console.log(Placeholder());

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
