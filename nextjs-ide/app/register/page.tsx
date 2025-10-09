"use client";
import { useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    // Basic client-side validation
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all required fields.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, teamName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      setMessage("✅ Registration successful! You can now log in.");
      // Clear fields after success (optional)
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setTeamName("");
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl w-96">
        <h1 className="text-3xl font-bold text-center mb-6">Create Account</h1>
        <form onSubmit={handleRegister} className="flex flex-col space-y-4">
          <input
            type="text"
            placeholder="Name"
            className="p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Email"
            className="p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            className="p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <input
            type="text"
            placeholder="Team Name (Optional)"
            className="p-3 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:border-green-500"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 transition-all p-3 rounded-lg font-semibold"
            disabled={loading}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-sm text-gray-300">{message}</p>
        )}
        <p className="mt-4 text-center text-gray-400 text-sm">
          Already have an account?{" "}
          <a href="/login" className="text-green-400 hover:underline">
            Login
          </a>
        </p>
      </div>
    </div>
  );
}
