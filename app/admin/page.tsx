"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminDashboard() {
  const [packages, setPackages] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total: 0, statusOneCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
    fetchPackages();
  }, []);

  // Fetch Summary Data (last 7 days & status_id = 1 count)
  const fetchSummary = async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("Packages")
      .select("id, status_id, created_at")
      .gte("created_at", sevenDaysAgo.toISOString());

    if (error) {
      setError(error.message);
    } else {
      const total = data.length;
      const statusOneCount = data.filter((pkg) => pkg.status_id === 1).length;
      setSummary({ total, statusOneCount });
    }
  };

  // Fetch All Packages
  const fetchPackages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("Packages")
      .select("id, name, status_id, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setPackages(data || []);
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      {error && <p className="text-red-500">{error}</p>}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-500 text-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold">Packages (Last 7 Days)</h2>
          <p className="text-3xl font-bold">{summary.total}</p>
        </div>
        <div className="bg-green-500 text-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold">Status ID = 1</h2>
          <p className="text-3xl font-bold">{summary.statusOneCount}</p>
        </div>
      </div>

      {/* Packages Table */}
      {loading ? (
        <p>Loading packages...</p>
      ) : (
        <table className="min-w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">ID</th>
              <th className="border p-2">Package Name</th>
              <th className="border p-2">Status ID</th>
              <th className="border p-2">Created At</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => (
              <tr key={pkg.id} className="border">
                <td className="border p-2">{pkg.id}</td>
                <td className="border p-2">{pkg.name}</td>
                <td className="border p-2">{pkg.status_id}</td>
                <td className="border p-2">{new Date(pkg.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
