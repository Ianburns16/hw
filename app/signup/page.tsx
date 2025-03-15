"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const [name, setName] = useState(""); // Added name field
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [address, setAdress] = useState("");
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Sign up using Supabase auth
    const { user, error } = await signUp(email, password);
    if (error) {
      setError(error.message);
      return;
    }

    // Insert new user into our custom "User" table with default privilege (e.g., 2 for regular users)
    const { error: dbError } = await supabase.from("User").insert([
      { name, address, email, priv: 1 }
    ]);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    // Redirect to user dashboard for regular users
    router.push("/user");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold">Sign Up</h2>
      {error && <p className="text-red-500">{error}</p>}
      <form onSubmit={handleSignup} className="flex flex-col space-y-3">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
         <input
          type="address"
          placeholder="address"
          value={address}
          onChange={(e) => setAdress(e.target.value)}
          required
        />
        <button type="submit">Sign Up</button>
      </form>
      <button type="button" onClick={() => router.push("/login")}>
        login
      </button>
    </div>
  );
}
