"use client";

import { FormEvent, useState } from "react";

import { login } from "@/lib/api";

const INPUT =
  "w-full px-3 py-2 text-sm rounded-lg bg-[#040806] border border-emerald-900/50 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500";

export default function LoginForm() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      await login(usuario, password);
      // Recarga completa: la barra superior y el panel se piden ya con la sesión.
      window.location.assign("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo iniciar sesión",
      );
      setSending(false);
    }
  };

  return (
    <form
      className="w-full max-w-sm p-6 rounded-xl border border-emerald-950/50 bg-[#060e0a] flex flex-col gap-4"
      onSubmit={submit}
    >
      <h1 className="text-lg font-bold text-white">Iniciar sesión</h1>
      <label className="flex flex-col gap-1.5 text-xs text-zinc-400">
        Usuario
        <input
          required
          autoComplete="username"
          className={INPUT}
          name="usuario"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-xs text-zinc-400">
        Contraseña
        <input
          required
          autoComplete="current-password"
          className={INPUT}
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        className="px-3 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-60"
        disabled={sending}
        type="submit"
      >
        {sending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
