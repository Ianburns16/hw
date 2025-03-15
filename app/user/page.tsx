"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Package, User } from "@/model/interface";

export default function UserDashboard() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      // Get the current authenticated user
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) throw authError;
      
      if (!session?.user?.email) {
        router.push('/login');
        return;
      }

      // Get user data from our custom User table
      const { data: userData, error: userError } = await supabase
        .from('User')
        .select('*')
        .eq('email', session.user.email)
        .single();

      if (userError) throw userError;
      
      setUser(userData);
      
      // Fetch packages for this user
      const { data: packagesData, error: packagesError } = await supabase
        .from('Packages')
        .select('*')
        .eq('sid', userData.id)
        .order('created_at', { ascending: false });

      if (packagesError) throw packagesError;
      
      setPackages(packagesData || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (statusId: number | undefined) => {
    switch(statusId) {
      case 1: return "Pending";
      case 2: return "In Transit";
      case 3: return "Delivered";
      case 4: return "Returned";
      default: return "Unknown";
    }
  };

  const getStatusStyle = (statusId: number | undefined) => {
    switch(statusId) {
      case 1: return "bg-yellow-100 text-yellow-800";
      case 2: return "bg-blue-100 text-blue-800";
      case 3: return "bg-green-100 text-green-800";
      case 4: return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Packages</h1>
        <div>
          <p className="text-gray-600">Welcome, {user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
      </div>

      {packages.length === 0 ? (
        <p className="text-center text-gray-500 mt-8">No packages found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (kg)</th>
                <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {packages.map((pkg) => (
                <tr 
                  key={pkg.id} 
                  className="hover:bg-gray-50 cursor-pointer" 
                  onClick={() => setSelectedPackage(pkg)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pkg.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(pkg.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div>{pkg.rname}</div>
                    <div className="text-xs text-gray-400">{pkg.raddress}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pkg.weight}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pkg.method === 1 ? "Standard" : "Express"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusStyle(pkg.status)}`}>
                      {getStatusLabel(pkg.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
              <p><strong>Recipient Name:</strong> {selectedPackage.rname}</p>
              <p><strong>Recipient Address:</strong> {selectedPackage.raddress}</p>
              <p><strong>Weight:</strong> {selectedPackage.weight?.toFixed(2)} kg</p>
              <p><strong>Shipping Method:</strong> {selectedPackage.method === 1 ? "Standard" : "Express"}</p>
              <p><strong>Cost Per Weight:</strong> ${selectedPackage.cpw?.toFixed(2)}</p>
              <p>
                <strong>Status:</strong>{" "}
                <span className={`${getStatusStyle(selectedPackage.status)} px-2 py-1 rounded`}>
                  {getStatusLabel(selectedPackage.status)}
                </span>
              </p>
              <button className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300">
                Print Label
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 