"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Package, User, MethodType } from "@/model/interface";

export default function AdminDashboard() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [shippingMethods, setShippingMethods] = useState<MethodType[]>([]);
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, packages, users, settings
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
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
    checkAdmin();
    fetchData();
  }, []);

  const checkAdmin = async () => {
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) throw authError;
      
      if (!session?.user?.email) {
        router.push('/login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('User')
        .select('*')
        .eq('email', session.user.email)
        .single();

      if (userError) throw userError;
      
      if (userData.priv !== 2) { // Assuming 2 is admin privilege
        router.push('/user');
        return;
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch all packages
      const { data: packagesData, error: packagesError } = await supabase
        .from('Packages')
        .select('*, User(name, email)')
        .order('created_at', { ascending: false });

      if (packagesError) throw packagesError;
      setPackages(packagesData || []);

      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('User')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch shipping methods
      const { data: methodsData, error: methodsError } = await supabase
        .from('MethodType')
        .select('*');

      if (methodsError) throw methodsError;
      setShippingMethods(methodsData || []);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (packageId: number, newStatus: number) => {
    try {
      const { error } = await supabase
        .from('Packages')
        .update({ status: newStatus })
        .eq('id', packageId);

      if (error) throw error;

      setPackages(prev => prev.map(pkg =>
        pkg.id === packageId ? { ...pkg, status: newStatus } : pkg
      ));

      // Close the modal if the package is currently selected
      if (selectedPackage?.id === packageId) {
        setSelectedPackage(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateShippingMethod = async (methodId: number, updates: Partial<MethodType>) => {
    try {
      const { error } = await supabase
        .from('MethodType')
        .update(updates)
        .eq('id', methodId);

      if (error) throw error;

      setShippingMethods(prev => prev.map(method =>
        method.id === methodId ? { ...method, ...updates } : method
      ));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredPackages = packages.filter(pkg => {
    let matches = true;

    // Status filter
    if (statusFilter !== null) {
      matches = matches && pkg.status === statusFilter;
    }

    // Search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      matches = matches && (
        pkg.id.toString().includes(searchLower) ||
        pkg.rname.toLowerCase().includes(searchLower) ||
        pkg.raddress.toLowerCase().includes(searchLower) ||
        (pkg.User?.email || "").toLowerCase().includes(searchLower)
      );
    }

    // Date range
    if (dateRange.start && dateRange.end) {
      const pkgDate = new Date(pkg.created_at);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      matches = matches && (pkgDate >= startDate && pkgDate <= endDate);
    }

    return matches;
  });

  const getDashboardStats = () => {
    return {
      totalPackages: packages.length,
      pendingPackages: packages.filter(pkg => pkg.status === 1).length,
      inTransitPackages: packages.filter(pkg => pkg.status === 3).length,
      deliveredPackages: packages.filter(pkg => pkg.status === 5).length,
      totalUsers: users.length,
      totalRevenue: packages.reduce((sum, pkg) => sum + (pkg.cpw || 0), 0)
    };
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800">Admin Dashboard</h2>
        </div>
        <nav className="mt-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full px-6 py-3 text-left ${activeTab === 'dashboard' ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Dashboard Overview
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={`w-full px-6 py-3 text-left ${activeTab === 'packages' ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Manage Packages
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full px-6 py-3 text-left ${activeTab === 'users' ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Manage Users
          </button>
          <button
            onClick={() => setActiveTab('shipping')}
            className={`w-full px-6 py-3 text-left ${activeTab === 'shipping' ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Shipping Methods
          </button>
          <button
            onClick={() => router.push('/admin/settings')}
            className="w-full px-6 py-3 text-left text-gray-600 hover:bg-gray-50"
          >
            Settings
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-2">Package Statistics</h3>
                <div className="space-y-2">
                  <p>Total Packages: {getDashboardStats().totalPackages}</p>
                  <p>Pending: {getDashboardStats().pendingPackages}</p>
                  <p>In Transit: {getDashboardStats().inTransitPackages}</p>
                  <p>Delivered: {getDashboardStats().deliveredPackages}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-2">User Statistics</h3>
                <p>Total Users: {getDashboardStats().totalUsers}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-2">Revenue</h3>
                <p>Total Revenue: ${getDashboardStats().totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'packages' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status Filter</label>
                  <select
                    value={statusFilter || ""}
                    onChange={(e) => setStatusFilter(e.target.value ? Number(e.target.value) : null)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">All Statuses</option>
                    {Object.entries(statusMap).map(([id, { label }]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Search</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by ID, name, or address..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date Range</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Packages Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPackages.map((pkg) => (
                    <tr key={pkg.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {pkg.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{pkg.User?.name}</div>
                        <div className="text-xs">{pkg.User?.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{pkg.rname}</div>
                        <div className="text-xs">{pkg.raddress}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={pkg.status}
                          onChange={(e) => handleUpdateStatus(pkg.id, Number(e.target.value))}
                          className={`text-sm rounded-full px-3 py-1 ${statusMap[pkg.status]?.style}`}
                        >
                          {Object.entries(statusMap).map(([id, { label }]) => (
                            <option key={id} value={id}>{label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => setSelectedPackage(pkg)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'shipping' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Shipping Methods</h3>
            <div className="space-y-4">
              {shippingMethods.map((method) => (
                <div key={method.id} className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <h4 className="font-medium">{method.type}</h4>
                    <p className="text-sm text-gray-500">Current Rate: ${method.fee}/kg</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={method.fee}
                      onChange={(e) => handleUpdateShippingMethod(method.id, { fee: parseFloat(e.target.value) })}
                      className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleUpdateShippingMethod(method.id, { fee: method.fee })}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                      Update
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Package Details Modal */}
        {selectedPackage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Package Details</h2>
                <button
                  onClick={() => setSelectedPackage(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Package ID</p>
                    <p className="mt-1">{selectedPackage.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Created At</p>
                    <p className="mt-1">{new Date(selectedPackage.created_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Sender</p>
                    <p className="mt-1">{selectedPackage.User?.name}</p>
                    <p className="text-sm text-gray-500">{selectedPackage.User?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Recipient</p>
                    <p className="mt-1">{selectedPackage.rname}</p>
                    <p className="text-sm text-gray-500">{selectedPackage.raddress}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Weight</p>
                    <p className="mt-1">{selectedPackage.weight} kg</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Shipping Cost</p>
                    <p className="mt-1">${selectedPackage.cpw?.toFixed(2)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <select
                    value={selectedPackage.status}
                    onChange={(e) => handleUpdateStatus(selectedPackage.id, Number(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {Object.entries(statusMap).map(([id, { label }]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={() => window.print()}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Print Label
                  </button>
                  <button
                    onClick={() => setSelectedPackage(null)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}