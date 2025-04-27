import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { authStateAtom, signUpWithEmailAtom } from '../../store/supabaseAuth';
import { supabase } from '../../lib/supabase';
import { User } from '../../types/user';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { PlusCircle, Edit, Trash2, UserPlus } from 'lucide-react';

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    username: '',
    isAdmin: false,
  });
  const [authState] = useAtom(authStateAtom);
  const [, signUpWithEmail] = useAtom(signUpWithEmailAtom);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Using Supabase admin functions would require a server component or API route
      // For this client-side implementation, we'll use a custom endpoint
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      setError(null);

      // 1. Create the user through Supabase Auth using the atom
      const result = await signUpWithEmail({
        email: newUser.email,
        password: newUser.password,
      });

      if (!result.success) {
        throw new Error(result.error || 'User creation failed');
      }

      // 2. Update the user metadata with admin status and username
      // This will be handled automatically by the handle_new_user() trigger
      // but we need to update the is_admin status and username separately
      if (newUser.isAdmin || newUser.username) {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            username: newUser.username || null,
            is_admin: newUser.isAdmin,
            created_by: authState.user?.id,
          })
          .eq('email', newUser.email);

        if (updateError) throw updateError;
      }

      // Reset form and refresh users
      setNewUser({
        email: '',
        password: '',
        username: '',
        isAdmin: false,
      });
      setShowNewUserForm(false);
      await fetchUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      setError(`Failed to create user: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button 
          onClick={() => setShowNewUserForm(!showNewUserForm)}
          className="flex items-center gap-2"
        >
          <UserPlus size={18} />
          {showNewUserForm ? 'Cancel' : 'New User'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showNewUserForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New User</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username (optional)
                </label>
                <input
                  id="username"
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  required
                  minLength={8}
                />
              </div>

              <div className="flex items-center">
                <input
                  id="isAdmin"
                  type="checkbox"
                  checked={newUser.isAdmin}
                  onChange={(e) => setNewUser({ ...newUser, isAdmin: e.target.checked })}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor="isAdmin" className="ml-2 block text-sm text-gray-700">
                  Administrator privileges
                </label>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Creating...' : 'Create User'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
          {isLoading && <p className="col-span-full text-center py-4">Loading users...</p>}
          
          {!isLoading && users.length === 0 && (
            <p className="col-span-full text-center py-4">No users found.</p>
          )}

          {users.map((user) => (
            <Card key={user.id} className="overflow-hidden">
              <CardHeader className="bg-gray-50 pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{user.username || user.email.split('@')[0]}</CardTitle>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  {user.is_admin && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      Admin
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="text-sm text-gray-600 mb-4">
                  <div>Created: {new Date(user.created_at).toLocaleDateString()}</div>
                  {user.last_sign_in_at && (
                    <div>Last sign in: {new Date(user.last_sign_in_at).toLocaleDateString()}</div>
                  )}
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Edit size={14} />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex items-center gap-1 text-red-600 hover:text-red-700">
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminUsers; 