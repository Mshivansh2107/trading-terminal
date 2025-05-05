import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { authStateAtom, signUpWithEmailAtom } from '../../store/supabaseAuth';
import { supabase } from '../../lib/supabase';
import { User } from '../../types/user';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { PlusCircle, Edit, Trash2, UserPlus, Mail, Calendar, Clock, Shield } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '../../components/ui/dialog';

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
  
  // Add states for edit mode
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({
    username: '',
    isAdmin: false
  });
  
  // Add states for delete confirmation
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Add state to track which email is being hovered/shown
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  
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
  
  // Handle opening the edit dialog
  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      username: user.username || '',
      isAdmin: user.is_admin || false
    });
  };
  
  // Handle editing a user
  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Update the user in the database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username: editFormData.username || null,
          is_admin: editFormData.isAdmin,
          updated_at: new Date()
        })
        .eq('id', editingUser.id);
      
      if (updateError) throw updateError;
      
      // If we're updating admin status, also update auth.users
      if (editingUser.is_admin !== editFormData.isAdmin) {
        try {
          // Call our RPC function to update admin status in auth.users
          const { error: adminUpdateError } = await supabase.rpc(
            'update_user_admin_status',
            {
              user_id: editingUser.id,
              is_admin: editFormData.isAdmin
            }
          );
          
          if (adminUpdateError) {
            console.error('Error updating admin status:', adminUpdateError);
          }
        } catch (adminErr) {
          console.error('Error in admin update:', adminErr);
          // Continue execution even if this fails
        }
      }
      
      // Close the edit dialog and refresh the user list
      setEditingUser(null);
      await fetchUsers();
      
    } catch (err) {
      console.error('Error updating user:', err);
      setError(`Failed to update user: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle opening the delete confirmation dialog
  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
  };
  
  // Handle deleting a user
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      setIsDeleting(true);
      setError(null);
      
      // Delete the user from our users table
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', userToDelete.id);
      
      if (deleteError) throw deleteError;
      
      // Note: Deleting from auth.users would require admin access
      // We can't do this directly from the client for security reasons
      // This would typically be handled by a secure server-side function
      
      // Close the delete dialog and refresh the user list
      setUserToDelete(null);
      await fetchUsers();
      
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(`Failed to delete user: ${(err as Error).message}`);
    } finally {
      setIsDeleting(false);
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

      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isLoading && (
              <div className="col-span-full flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}
            
            {!isLoading && users.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16">
                <UserPlus size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg font-medium">No users found</p>
                <p className="text-gray-400 text-sm">Create a new user to get started</p>
              </div>
            )}

            {users.map((user) => (
              <div 
                key={user.id} 
                className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 flex flex-col h-full transform hover:-translate-y-1"
              >
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-800 truncate">
                        {user.username || user.email.split('@')[0]}
                      </h3>
                      <div className="relative">
                        <div 
                          className="flex items-center mt-1 text-gray-500 overflow-hidden cursor-pointer group"
                          onMouseEnter={() => setExpandedEmail(user.email)}
                          onMouseLeave={() => setExpandedEmail(null)}
                          onClick={() => setExpandedEmail(expandedEmail === user.email ? null : user.email)}
                        >
                          <Mail size={14} className="flex-shrink-0 mr-1" />
                          <p className="text-sm truncate group-hover:text-blue-600 transition-colors">{user.email}</p>
                        </div>
                        
                        {/* Expanded email tooltip */}
                        {expandedEmail === user.email && (
                          <div className="absolute z-10 left-0 mt-1 px-3 py-2 bg-gray-800 text-white text-sm rounded shadow-lg max-w-xs break-all">
                            {user.email}
                          </div>
                        )}
                      </div>
                    </div>
                    {user.is_admin && (
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Shield size={12} className="mr-1" />
                          Admin
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar size={14} className="mr-2" />
                      <span>Created: {new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                    {user.last_sign_in_at && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock size={14} className="mr-2" />
                        <span>Last login: {new Date(user.last_sign_in_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-auto pt-4 border-t border-gray-100">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-1 transition-colors hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                      onClick={() => handleEditClick(user)}
                    >
                      <Edit size={14} />
                      <span>Edit</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex items-center gap-1 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                      onClick={() => handleDeleteClick(user)}
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Make changes to the user's information.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={editingUser?.email || ''}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={editFormData.username}
                onChange={(e) => setEditFormData({...editFormData, username: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="flex items-center">
              <input
                id="editIsAdmin"
                type="checkbox"
                checked={editFormData.isAdmin}
                onChange={(e) => setEditFormData({...editFormData, isAdmin: e.target.checked})}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="editIsAdmin" className="ml-2 block text-sm text-gray-700">
                Administrator privileges
              </label>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEditingUser(null)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateUser}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {userToDelete && (
            <div className="py-4">
              <p><strong>Email:</strong> {userToDelete.email}</p>
              {userToDelete.username && <p><strong>Username:</strong> {userToDelete.username}</p>}
              {userToDelete.is_admin && (
                <p className="text-amber-600 font-semibold mt-2">
                  Warning: This is an admin user!
                </p>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setUserToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers; 