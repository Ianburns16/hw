"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

// Status mapping configuration
const statusMap: { [key: number]: string } = {
  1: "Pending",
  2: "In Transit",
  3: "Delivered",
  4: "Returned"
};

const getStatusLabel = (statusId: number) => {
  return statusMap[statusId] || "Unknown";
};

const getStatusStyle = (statusId: number) => {
  switch(statusId) {
    case 1: return "bg-yellow-100 text-yellow-800";
    case 2: return "bg-blue-100 text-blue-800";
    case 3: return "bg-green-100 text-green-800";
    case 4: return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

export default function AdminDashboard() {
  const [packages, setPackages] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total: 0, statusOneCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetchSummary();
    fetchPackages();
  }, []);

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

  const fetchPackages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("Packages")
      .select("id, created_at, sid, rname, raddress, weight, method, cpw, status_id")
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

      {/* Package Details Modal */}
      {selectedPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Package Details</h2>
              <button
                onClick={() => setSelectedPackage(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              <p><strong>ID:</strong> {selectedPackage.id}</p>
              <p><strong>Created At:</strong> {new Date(selectedPackage.created_at).toLocaleString()}</p>
              <p><strong>Account ID:</strong> {selectedPackage.sid}</p>
              <p><strong>Recipient Name:</strong> {selectedPackage.rname}</p>
              <p><strong>Recipient Address:</strong> {selectedPackage.raddress}</p>
              <p><strong>Weight:</strong> {selectedPackage.weight?.toFixed(2)} kg</p>
              <p><strong>Shipping Method:</strong> {selectedPackage.method === 1 ? "Standard" : "Express"}</p>
              <p><strong>Cost Per Weight:</strong> ${selectedPackage.cpw?.toFixed(2)}</p>
              <p>
                <strong>Status:</strong>{" "}
                <span className={`${getStatusStyle(selectedPackage.status_id)} px-2 py-1 rounded`}>
                  {getStatusLabel(selectedPackage.status_id)}
                </span>
              </p>
              <button className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300">
  Print Label
</button>
            </div>
          </div>
        </div>
      )}

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
        <div className="bg-green-500 text-white p-4 rounded-lg shadow-md">
        <button type="button" onClick={() => router.push("/admin/users")}>
       GO TO CUSTOMERS
      </button>
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
              <th className="border p-2">Recipient</th>
              <th className="border p-2">Address</th>
              <th className="border p-2">Weight</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => (
              <tr 
                key={pkg.id} 
                className="border hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedPackage(pkg)}
              >
                <td className="border p-2">{pkg.id}</td>
                <td className="border p-2">{pkg.rname}</td>
                <td className="border p-2">{pkg.raddress}</td>
                <td className="border p-2">{pkg.weight?.toFixed(2)} kg</td>
                <td className="border p-2">
                  <span className={`${getStatusStyle(pkg.status_id)} px-2 py-1 rounded`}>
                    {getStatusLabel(pkg.status_id)}
                  </span>
                </td>
                <td className="border p-2">{new Date(pkg.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
       
      )}
    </div>
  );
}