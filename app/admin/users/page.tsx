"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<any | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch all users
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    const { data, error } = await supabase.from("User").select("id, email, priv, address");
    
    if (error) {
      setError(error.message);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  // Open Edit Modal
  const handleEdit = (user: any) => {
    setEditUser(user);
  };

  // Delete User
  const handleDelete = async (userId: string) => {
    const { error } = await supabase.from("User").delete().eq("id", userId);

    if (error) {
      setError(error.message);
    } else {
      setUsers(users.filter((user) => user.id !== userId));
    }
  };

  // Save Edited User
  const handleSave = async () => {
    if (!editUser) return;

    const { error } = await supabase
      .from("User")
      .update({ email: editUser.email, priv: editUser.priv, address: editUser.address })
      .eq("id", editUser.id);

    if (error) {
      setError(error.message);
    } else {
      setUsers(users.map((user) => (user.id === editUser.id ? editUser : user)));
      setEditUser(null);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Admin Panel</h1>

      <button type="button" onClick={() => router.push("/admin")}>
       GO TO DASH
      </button>
      {error && <p className="text-red-500">{error}</p>}
      {loading ? (
        <p>Loading users...</p>
      ) : (
        <table className="min-w-full border-collapse border border-gray-200 mt-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">ID</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Privilege</th>
              <th className="border p-2">Address</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border">
                <td className="border p-2">{user.id}</td>
                <td className="border p-2">{user.email}</td>
                <td className="border p-2">{user.priv}</td>
                <td className="border p-2">{user.address || "N/A"}</td>
                <td className="border p-2 space-x-2">
                  <button
                    className="bg-blue-500 text-white px-3 py-1 rounded"
                    onClick={() => handleEdit(user)}
                  >
                    Edit
                  </button>
                  <button
                    className="bg-red-500 text-white px-3 py-1 rounded"
                    onClick={() => handleDelete(user.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-xl font-bold mb-4">Edit User</h2>
            <label className="block">
              Email:
              <input
                type="email"
                className="border p-2 w-full"
                value={editUser.email}
                onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
              />
            </label>
            <label className="block mt-3">
              Privilege:
              <select
                className="border p-2 w-full"
                value={editUser.priv}
                onChange={(e) => setEditUser({ ...editUser, priv: Number(e.target.value) })}
              >
                <option value="1">User</option>
                <option value="2">Admin</option>
              </select>
            </label>
            <label className="block mt-3">
              Address:
              <input
                type="text"
                className="border p-2 w-full"
                value={editUser.address || ""}
                onChange={(e) => setEditUser({ ...editUser, address: e.target.value })}
              />
            </label>
            <div className="mt-4 space-x-2">
              <button className="bg-green-500 text-white px-3 py-1 rounded" onClick={handleSave}>
                Save
              </button>
              <button className="bg-gray-500 text-white px-3 py-1 rounded" onClick={() => setEditUser(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
