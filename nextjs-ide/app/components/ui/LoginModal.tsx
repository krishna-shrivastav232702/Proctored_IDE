"use client";
import { useState, useEffect } from "react";

interface LoginModalProps {
  closeModal: () => void;
  onSwitchToRegister?: () => void;
  onLoginSuccess?: (userData: any) => void;
}

export default function LoginModal({
  closeModal,
  onSwitchToRegister,
  onLoginSuccess,
}: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => setShow(true), []);

  const handleClose = () => {
    setShow(false);
    setTimeout(closeModal, 300);
  };

  const handleSwitchToRegister = () => {
    setShow(false);
    setTimeout(() => {
      closeModal();
      if (onSwitchToRegister) {
        onSwitchToRegister();
      }
    }, 300);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      if (onLoginSuccess) {
        onLoginSuccess(data.user); // Assuming your API returns user data
      }
      alert("✅ Login successful!");
      handleClose();
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError("An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Transparent backdrop with blur effect */}
      <div
        onClick={handleClose}
        className={`absolute inset-0 bg-black/20 backdrop-blur-md transition-all duration-300 ${
          show ? "opacity-100" : "opacity-0"
        }`}
      ></div>

      {/* Modal */}
      <div
        className={`relative bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 p-8 rounded-2xl shadow-2xl w-96 z-10 transform transition-all duration-300 ${
          show
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 -translate-y-10 scale-95"
        }`}
      >
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
        >
          ✕
        </button>

        <h1 className="text-3xl font-bold text-center mb-6 text-white">
          Hey there!
        </h1>

        <form onSubmit={handleLogin} className="flex flex-col space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="p-3 rounded-lg bg-gray-800/80 border border-gray-600 focus:outline-none focus:border-emerald-500 text-white placeholder-gray-400 transition-colors"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="p-3 rounded-lg bg-gray-800/80 border border-gray-600 focus:outline-none focus:border-emerald-500 text-white placeholder-gray-400 transition-colors"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 transition-all p-3 rounded-lg font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-400 text-sm">
          Don&apos;t have an account?{" "}
          <button
            onClick={handleSwitchToRegister}
            className="text-emerald-400 hover:underline transition-colors"
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
}
