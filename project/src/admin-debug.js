// This file is deprecated and will be removed.
// Admin functionality has been properly integrated into the application.

// Simple debug script to verify code changes are applied
console.log('*************************************');
console.log('ADMIN DEBUG SCRIPT LOADED');
console.log('If you see this message in the console, the script was loaded successfully');
console.log('*************************************');

export const checkAdminStatus = (user) => {
  console.log('*************************************');
  console.log('ADMIN STATUS CHECK FUNCTION CALLED');
  console.log('User:', user);
  console.log('App metadata:', user?.app_metadata);
  console.log('User metadata:', user?.user_metadata);
  
  // Check for admin in multiple possible locations
  const isAdminInAppMetadata = user?.app_metadata?.is_admin === true || 
                               user?.app_metadata?.is_admin === "true";
  
  const isAdminInUserMetadata = user?.user_metadata?.is_admin === true || 
                                user?.user_metadata?.is_admin === "true";
  
  const isAdminInUserObject = user?.is_admin === true || 
                              user?.is_admin === "true";
  
  // Also check for any role that might indicate admin status
  const hasAdminRole = user?.role === "admin" || 
                      user?.role === "administrator" ||
                      user?.user_metadata?.role === "admin";
  
  const isAdmin = isAdminInAppMetadata || isAdminInUserMetadata || isAdminInUserObject || hasAdminRole;
  
  console.log('Admin check in app_metadata:', isAdminInAppMetadata);
  console.log('Admin check in user_metadata:', isAdminInUserMetadata);
  console.log('Admin check in user object:', isAdminInUserObject);
  console.log('Admin check for role:', hasAdminRole);
  console.log('Final admin check result:', isAdmin);
  console.log('*************************************');
  
  return isAdmin;
}; 