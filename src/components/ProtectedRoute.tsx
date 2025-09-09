import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user || !session) {
        navigate("/auth");
        return;
      }
      
      // TODO: Add role checking when profiles are implemented
      // if (requiredRole && userRole !== requiredRole) {
      //   navigate("/unauthorized");
      //   return;
      // }
    }
  }, [user, session, loading, navigate, requiredRole]);

  if (loading) {
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