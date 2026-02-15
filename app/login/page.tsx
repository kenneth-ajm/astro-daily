"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed");
        return;
      }

      router.push("/app");
    } catch (e: any) {
      setError(e?.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignin() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signin failed");
        return;
      }

      router.push("/app");
    } catch (e: any) {
      setError(e?.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1220] text-white">
      <div className="bg-[#111a2e] p-8 rounded-xl w-full max-w-md shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Create account</h1>

        <input
          className="w-full mb-3 p-2 rounded bg-[#0f172a] border border-gray-600"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full mb-4 p-2 rounded bg-[#0f172a] border border-gray-600"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <div className="mb-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 py-2 rounded mb-2"
        >
          {loading ? "Please wait..." : "Sign Up"}
        </button>

        <button
          onClick={handleSignin}
          disabled={loading}
          className="w-full bg-gray-700 hover:bg-gray-800 py-2 rounded"
        >
          {loading ? "Please wait..." : "Sign In"}
        </button>
      </div>
    </div>
  );
}
