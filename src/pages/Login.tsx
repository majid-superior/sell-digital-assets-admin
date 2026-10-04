import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth.ts";
import { useTheme } from "@/hooks/useTheme.ts";
import { Icons } from "@/lib/icons/index.ts";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  Checkbox,
} from "@/components/ui/index.ts";
import { authService, AuthError } from "@/services/authService.ts";
import { loginSchema } from "@/schemas/loginSchema.ts";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const rememberedEmail = authService.getRememberedEmail() || "";
  const [email, setEmail] = useState(rememberedEmail);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedEmail));
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const validateField = (field: "email" | "password", value: string) => {
    const singleFieldSchema = loginSchema.shape[field];
    const result = singleFieldSchema.safeParse(value);
    if (!result.success) {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: result.error.issues[0]?.message,
      }));
    } else {
      setFieldErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Zod Validation
    const validationResult = loginSchema.safeParse({
      email,
      password,
      rememberMe,
    });
    if (!validationResult.success) {
      const errors: { email?: string; password?: string } = {};
      for (const issue of validationResult.error.issues) {
        const field = issue.path[0] as "email" | "password";
        if (field && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    try {
      await login(
        validationResult.data.email,
        validationResult.data.password,
        validationResult.data.rememberMe
      );
      toast.success("Welcome back!", {
        description: "Authenticated successfully.",
      });
    } catch (err: unknown) {
      const message =
        err instanceof AuthError
          ? err.message
          : err instanceof Error
          ? err.message
          : "An unexpected error occurred during sign in. Please try again.";

      setErrorMessage(message);
      toast.error("Authentication Failed", {
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center p-4 sm:p-6 transition-colors duration-200">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <Card className="relative shadow-lg border-outline-variant/40 bg-surface-container-low overflow-hidden">
          {/* Theme Switcher in top right of login popup */}
          <div className="absolute top-4 right-4 z-10">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {theme === "dark" ? (
                <Icons.ThemeLight size={20} className="text-amber-400" />
              ) : (
                <Icons.ThemeDark
                  size={20}
                  className="text-on-surface-variant"
                />
              )}
            </button>
          </div>

          <CardHeader className="text-center pb-4 pt-6">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 border border-primary/20 shadow-xs">
              <Icons.Lock size={22} />
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight">
              Authentication
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-on-surface-variant max-w-xs mx-auto mt-1">
              Enter your credentials to access the platform.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* General Backend Error Banner */}
              {errorMessage && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-error/10 text-error border border-error/20 flex items-start gap-2.5 text-xs animate-in fade-in"
                >
                  <Icons.ServerError size={16} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">
                    {errorMessage}
                  </span>
                </div>
              )}

              {/* Email Address with Zod Error */}
              <div className="space-y-1">
                <Label htmlFor="login-email" required>
                  Email Address
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        email: undefined,
                      }));
                    }
                  }}
                  onBlur={() => validateField("email", email)}
                  error={fieldErrors.email}
                  leftIcon={<Icons.Mail size={16} />}
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>

              {/* Password with Zod Error */}
              <div className="space-y-1">
                <Label htmlFor="login-password" required>
                  Password
                </Label>
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        password: undefined,
                      }));
                    }
                  }}
                  onBlur={() => validateField("password", password)}
                  error={fieldErrors.password}
                  leftIcon={<Icons.Lock size={16} />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="pointer-events-auto p-1 text-on-surface-variant hover:text-on-surface cursor-pointer"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <Icons.EyeOff size={16} />
                      ) : (
                        <Icons.Eye size={16} />
                      )}
                    </button>
                  }
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-0.5">
                <Checkbox
                  id="login-remember-me"
                  label={
                    <span className="text-xs text-on-surface-variant font-medium">
                      Remember me
                    </span>
                  }
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
              </div>

              {/* Submit Button */}
              <Button
                variant="primary"
                size="lg"
                type="submit"
                isLoading={isLoading}
                className="w-full mt-2 font-semibold shadow-sm"
              >
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
