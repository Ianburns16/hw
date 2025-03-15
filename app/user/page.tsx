"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Package, User, MethodType } from "@/model/interface";

export default function UserDashboard() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [shippingMethods, setShippingMethods] = useState<MethodType[]>([]);
  const [activeTab, setActiveTab] = useState("active"); // active, history, canceled
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [packageToCancel, setPackageToCancel] = useState<Package | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [newPackage, setNewPackage] = useState({
    rname: "",
    raddress: "",
    weight: 0,
    method: 1
  });
  const router = useRouter();

  type StatusMapType = {
    [key: number]: { label: string; style: string; }
  };

  // Enhanced status definitions
  const statusMap: StatusMapType = {
    1: { label: "Pending", style: "bg-yellow-100 text-yellow-800" },
    2: { label: "Picked Up", style: "bg-blue-100 text-blue-800" },
    3: { label: "In Transit", style: "bg-purple-100 text-purple-800" },
    4: { label: "Out for Delivery", style: "bg-indigo-100 text-indigo-800" },
    5: { label: "Delivered", style: "bg-green-100 text-green-800" },
    6: { label: "Failed Delivery", style: "bg-orange-100 text-orange-800" },
    7: { label: "Returned", style: "bg-red-100 text-red-800" },
    8: { label: "Cancelled", style: "bg-gray-100 text-gray-800" }
  };

  useEffect(() => {
    checkUser();
    fetchShippingMethods();
    subscribeToPackageUpdates();
  }, []);

  const subscribeToPackageUpdates = () => {
    const subscription = supabase
      .channel('package_updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'Packages',
        filter: `sid=eq.${user?.id}`
      }, (payload) => {
        const updatedPackage = payload.new as Package;
        setNotifications(prev => [`Package #${updatedPackage.id} status updated to ${getStatusLabel(updatedPackage.status)}`, ...prev]);
        setPackages(prev => prev.map(pkg => 
          pkg.id === updatedPackage.id ? updatedPackage : pkg
        ));
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const fetchShippingMethods = async () => {
    const { data, error } = await supabase
      .from('MethodType')
      .select('*')
      .order('id');
    
    if (error) {
      console.error('Error fetching shipping methods:', error);
      return;
    }
    
    setShippingMethods(data || []);
  };

  const calculateShippingCost = (weight: number, methodId: number) => {
    const method = shippingMethods.find(m => m.id === methodId);
    if (!method) return 0;
    return weight * method.fee;
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!user) return;

      const cpw = calculateShippingCost(newPackage.weight, newPackage.method);
      
      const { data, error } = await supabase
        .from('Packages')
        .insert([{
          sid: user.id,
          rname: newPackage.rname,
          raddress: newPackage.raddress,
          weight: newPackage.weight,
          method: newPackage.method,
          cpw: cpw,
          status: 1, // Pending
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setPackages([data, ...packages]);
      setShowCreateModal(false);
      setNewPackage({ rname: "", raddress: "", weight: 0, method: 1 });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTrackPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('Packages')
        .select('*')
        .eq('id', trackingId)
        .single();

      if (error) throw error;

      setSelectedPackage(data);
      setShowTrackModal(false);
      setTrackingId("");
    } catch (err: any) {
      setError("Package not found");
    }
  };

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
    if (!statusId) return "Unknown";
    return statusMap[statusId]?.label || "Unknown";
  };

  const getStatusStyle = (statusId: number | undefined) => {
    if (!statusId) return "bg-gray-100 text-gray-800";
    return statusMap[statusId]?.style || "bg-gray-100 text-gray-800";
  };

  const handleCancelPackage = async () => {
    if (!packageToCancel) return;

    try {
      const { error } = await supabase
        .from('Packages')
        .update({ status: 8 }) // 8 = Cancelled
        .eq('id', packageToCancel.id)
        .eq('sid', user?.id); // Security: ensure user owns the package

      if (error) throw error;

      setPackages(prev => prev.map(pkg =>
        pkg.id === packageToCancel.id ? { ...pkg, status: 8 } : pkg
      ));
      setShowCancelConfirm(false);
      setPackageToCancel(null);
      setNotifications(prev => [`Package #${packageToCancel.id} has been cancelled`, ...prev]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredPackages = packages.filter(pkg => {
    switch (activeTab) {
      case 'active':
        return pkg.status !== 8 && pkg.status !== 5; // Not cancelled or delivered
      case 'history':
        return pkg.status === 5; // Delivered
      case 'canceled':
        return pkg.status === 8; // Cancelled
      default:
        return true;
    }
  });

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
          <div className="mt-2">
            <p className="text-gray-600">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>
        <nav className="mt-6">
          <button
            onClick={() => setActiveTab('active')}
            className={`w-full px-6 py-3 text-left ${activeTab === 'active' ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Active Packages
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`w-full px-6 py-3 text-left ${activeTab === 'history' ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Delivery History
          </button>
          <button
            onClick={() => setActiveTab('canceled')}
            className={`w-full px-6 py-3 text-left ${activeTab === 'canceled' ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Cancelled Packages
          </button>
          <button
            onClick={() => router.push('/user/settings')}
            className="w-full px-6 py-3 text-left text-gray-600 hover:bg-gray-50"
          >
            Settings
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-2">Notifications</h3>
              <div className="space-y-2">
                {notifications.map((notification, index) => (
                  <div key={index} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                    <p className="text-sm text-blue-600">{notification}</p>
                    <button
                      onClick={() => setNotifications(prev => prev.filter((_, i) => i !== index))}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <span>+</span> Create Package
          </button>
          <button
            onClick={() => setShowTrackModal(true)}
            className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 flex items-center gap-2"
          >
            <span>🔍</span> Track Package
          </button>
        </div>

        {/* Packages Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">
              {activeTab === 'active' && 'Active Packages'}
              {activeTab === 'history' && 'Delivery History'}
              {activeTab === 'canceled' && 'Cancelled Packages'}
            </h2>
            {filteredPackages.length === 0 ? (
              <p className="text-center text-gray-500 my-8">No packages found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                      <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                      <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (kg)</th>
                      <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                      <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredPackages.map((pkg) => (
                      <tr key={pkg.id} className="hover:bg-gray-50">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedPackage(pkg)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              View
                            </button>
                            {pkg.status === 1 && (
                              <button
                                onClick={() => {
                                  setPackageToCancel(pkg);
                                  setShowCancelConfirm(true);
                                }}
                                className="text-red-600 hover:text-red-800"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Create Package Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Create New Package</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleCreatePackage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recipient Name</label>
                  <input
                    type="text"
                    value={newPackage.rname}
                    onChange={(e) => setNewPackage({ ...newPackage, rname: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recipient Address</label>
                  <textarea
                    value={newPackage.raddress}
                    onChange={(e) => setNewPackage({ ...newPackage, raddress: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPackage.weight}
                    onChange={(e) => setNewPackage({ ...newPackage, weight: parseFloat(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Shipping Method</label>
                  <select
                    value={newPackage.method}
                    onChange={(e) => setNewPackage({ ...newPackage, method: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {shippingMethods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.type} (${method.fee}/kg)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-2">
                    Estimated Cost: ${calculateShippingCost(newPackage.weight, newPackage.method).toFixed(2)}
                  </p>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Create Package
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Track Package Modal */}
        {showTrackModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Track Package</h2>
                <button
                  onClick={() => setShowTrackModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleTrackPackage} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tracking Number</label>
                  <input
                    type="text"
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="text-right">
                  <button
                    type="submit"
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Track
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Existing Package Details Modal */}
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

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Cancel Package</h2>
              <p className="text-gray-600 mb-4">
                Are you sure you want to cancel package #{packageToCancel?.id}? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowCancelConfirm(false);
                    setPackageToCancel(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  No, Keep Package
                </button>
                <button
                  onClick={handleCancelPackage}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Yes, Cancel Package
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 