import { StrictMode, lazy, Suspense, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import "./index.css";
import { AuthProvider, useAuth } from "./lib/auth";
import { ApiError } from "./lib/api";
import { LogoMark } from "./components/Logo";
import { LoginPage } from "./pages/Login";
import { RegisterPage } from "./pages/Register";
import { ForgotPasswordPage, ResetPasswordPage } from "./pages/PasswordRecovery";
import { initNative } from "./lib/native";

// Las pantallas con gráficas se cargan bajo demanda (Recharts es el bloque más pesado).
const DashboardPage = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.DashboardPage })));
const HistoryPage = lazy(() => import("./pages/History").then((m) => ({ default: m.HistoryPage })));
const ProfilePage = lazy(() => import("./pages/Profile").then((m) => ({ default: m.ProfilePage })));
const NotFoundPage = lazy(() => import("./pages/NotFound").then((m) => ({ default: m.NotFoundPage })));
const SciencePage = lazy(() => import("./pages/Science").then((m) => ({ default: m.SciencePage })));
const AppShell = lazy(() => import("./components/AppShell").then((m) => ({ default: m.AppShell })));
const NewSimulationPage = lazy(() => import("./pages/NewSimulation").then((m) => ({ default: m.NewSimulationPage })));
const SimulationDetailPage = lazy(() => import("./pages/SimulationDetail").then((m) => ({ default: m.SimulationDetailPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
      refetchOnWindowFocus: false,
    },
  },
});

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Cargando">
      <LogoMark className="size-12 animate-pulse" />
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <Splash />;
  if (status === "anonymous") return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === "loading") return <Splash />;
  if (status === "authenticated") return <Navigate to="/" replace />;
  return children;
}

initNative();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<Splash />}>
            <Routes>
              <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
              <Route path="/registro" element={<PublicOnly><RegisterPage /></PublicOnly>} />
              <Route path="/recuperar" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
              <Route path="/restablecer" element={<ResetPasswordPage />} />
              <Route path="/ciencia/publica" element={<SciencePage standalone />} />
              <Route element={<RequireAuth><AppShell /></RequireAuth>}>
                <Route index element={<DashboardPage />} />
                <Route path="simulaciones/nueva" element={<NewSimulationPage />} />
                <Route path="simulaciones/:id" element={<SimulationDetailPage />} />
                <Route path="historial" element={<HistoryPage />} />
                <Route path="perfil" element={<ProfilePage />} />
                <Route path="ciencia" element={<SciencePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
          <Toaster position="top-center" richColors closeButton />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
