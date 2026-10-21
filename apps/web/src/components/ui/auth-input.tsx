import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  icon: ReactNode;
}

/** Campo de acceso con icono y, si es de contraseña, botón para mostrar/ocultar. */
export const AuthInput = forwardRef<HTMLInputElement, Props>(({ icon, type, className, ...props }, ref) => {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="group relative">
      <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-400 transition-colors group-focus-within:text-brand-600 [&_svg]:size-[18px]">
        {icon}
      </span>
      <input
        ref={ref}
        type={isPassword && visible ? "text" : type}
        className={cn(
          "h-[52px] w-full rounded-2xl border-0 bg-white pl-11 text-base text-ink shadow-card ring-1 ring-slate-900/[0.06] transition-all placeholder:text-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-brand-500",
          "aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-red-500",
          isPassword ? "pr-12" : "pr-4",
          className,
        )}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar caracteres" : "Mostrar caracteres"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-1.5 my-auto flex size-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
        >
          {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      )}
    </div>
  );
});
AuthInput.displayName = "AuthInput";

/** Botón principal de las pantallas de acceso: degradado, sombra de color y respuesta táctil. */
export const authPrimary =
  "h-[52px] w-full rounded-full bg-slate-900 text-[15px] font-semibold text-white shadow-[0_10px_24px_-10px_rgb(15_23_42/0.6)] transition-all hover:bg-slate-800 active:scale-[0.985]";
