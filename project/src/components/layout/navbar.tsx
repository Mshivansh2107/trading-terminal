import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAtom } from 'jotai';
import { LayoutDashboard, TrendingUp, ShoppingBag, ShoppingCart, BarChart3, LogOut, ArrowLeftRight, Users, Banknote, DollarSign } from 'lucide-react';
import { authStateAtom, signOutAtom } from '../../store/supabaseAuth';
import { Button } from '../ui/button';

const Navbar = () => {
  const [authState] = useAtom(authStateAtom);
  const [, signOut] = useAtom(signOutAtom);

  // Don't render the navbar if user is not authenticated
  if (!authState.isAuthenticated) return null;

  // Check if user is an admin
  const isAdmin = authState.user?.app_metadata?.is_admin === true;

  return (
    <nav className="fixed top-0 left-0 h-full w-16 md:w-64 bg-gray-800 text-white">
      <div className="flex flex-col h-full">
        <div className="p-4 mb-6">
          <h1 className="text-xl font-bold hidden md:block">Trading Terminal</h1>
          <div className="md:hidden flex justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>
        
        <div className="flex-1 px-3">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              `flex items-center p-2 rounded-lg mb-1 transition-colors ${
                isActive ? 'bg-blue-700' : 'hover:bg-gray-700'
              }`
            }
            end
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="ml-3 hidden md:block">Dashboard</span>
          </NavLink>
          
          <NavLink 
            to="/sales" 
            className={({ isActive }) => 
              `flex items-center p-2 rounded-lg mb-1 transition-colors ${
                isActive ? 'bg-blue-700' : 'hover:bg-gray-700'
              }`
            }
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="ml-3 hidden md:block">Sales</span>
          </NavLink>
          
          <NavLink 
            to="/purchase" 
            className={({ isActive }) => 
              `flex items-center p-2 rounded-lg mb-1 transition-colors ${
                isActive ? 'bg-blue-700' : 'hover:bg-gray-700'
              }`
            }
          >
            <ShoppingBag className="h-5 w-5" />
            <span className="ml-3 hidden md:block">Purchase</span>
          </NavLink>
          
          <NavLink 
            to="/transfer" 
            className={({ isActive }) => 
              `flex items-center p-2 rounded-lg mb-1 transition-colors ${
                isActive ? 'bg-blue-700' : 'hover:bg-gray-700'
              }`
            }
          >
            <ArrowLeftRight className="h-5 w-5" />
            <span className="ml-3 hidden md:block">Platform Transfer</span>
          </NavLink>
          
          <NavLink 
            to="/bank-transfer" 
            className={({ isActive }) => 
              `flex items-center p-2 rounded-lg mb-1 transition-colors ${
                isActive ? 'bg-blue-700' : 'hover:bg-gray-700'
              }`
            }
          >
            <Banknote className="h-5 w-5" />
            <span className="ml-3 hidden md:block">Bank Transfer</span>
          </NavLink>
          
          <NavLink 
            to="/expenses" 
            className={({ isActive }) => 
              `flex items-center p-2 rounded-lg mb-1 transition-colors ${
                isActive ? 'bg-blue-700' : 'hover:bg-gray-700'
              }`
            }
          >
            <DollarSign className="h-5 w-5" />
            <span className="ml-3 hidden md:block">Expenses & Income</span>
          </NavLink>
          
          <NavLink 
            to="/stats" 
            className={({ isActive }) => 
              `flex items-center p-2 rounded-lg mb-1 transition-colors ${
                isActive ? 'bg-blue-700' : 'hover:bg-gray-700'
              }`
            }
          >
            <BarChart3 className="h-5 w-5" />
            <span className="ml-3 hidden md:block">Stats</span>
          </NavLink>
          
          {/* Admin links */}
          {isAdmin && (
            <NavLink 
              to="/admin/users" 
              className={({ isActive }) => 
                `flex items-center p-2 rounded-lg mb-1 transition-colors ${
                  isActive ? 'bg-blue-700' : 'hover:bg-gray-700'
                }`
              }
            >
              <Users className="h-5 w-5" />
              <span className="ml-3 hidden md:block">User Management</span>
            </NavLink>
          )}
        </div>
        
        <div className="p-4">
          <Button
            variant="ghost"
            className="w-full justify-start hover:bg-gray-700 text-white"
            onClick={() => signOut()}
          >
            <LogOut className="h-5 w-5 mr-2 md:mr-3" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;