import { cn } from "@/lib/utils";

const baseInputClass =
  "h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

export function FormField({ label, htmlFor, required, hint, children }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-foreground">
        {label}
        {required && " *"}
        {hint && (
          <span className="text-muted-foreground font-normal"> ({hint})</span>
        )}
      </label>
      {children}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
};

export function FormInput({ className, ...props }: InputProps) {
  return <input className={cn(baseInputClass, className)} {...props} />;
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  className?: string;
};

export function FormSelect({ className, children, ...props }: SelectProps) {
  return (
    <select className={cn(baseInputClass, className)} {...props}>
      {children}
    </select>
  );
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  className?: string;
};

export function FormTextarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none outline-none focus:border-primary focus:ring-1 focus:ring-primary",
        className,
      )}
      {...props}
    />
  );
}
