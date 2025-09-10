import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'foreman' | 'worker';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, session, loading } = useAuth();
  const { hasRole, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !roleLoading) {
      if (!user || !session) {
        navigate("/auth");
        return;
      }
      
      if (requiredRole && !hasRole(requiredRole)) {
        navigate("/");
        return;
      }
    }
  }, [user, session, loading, roleLoading, navigate, requiredRole, hasRole]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  if (!user || !session) {
    return null; // Will redirect to auth
  }

  return <>{children}</>;
}