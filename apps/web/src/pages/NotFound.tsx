import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/Logo";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <LogoMark className="size-12" />
      <h1 className="mt-4 text-2xl font-semibold">Página no encontrada</h1>
      <p className="mt-1 text-slate-600">La dirección no existe o ya no está disponible.</p>
      <Button asChild className="mt-6">
        <Link to="/">Volver al inicio</Link>
      </Button>
    </div>
  );
}
