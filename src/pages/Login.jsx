import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash, FaExclamationCircle, FaSpinner } from "react-icons/fa";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { authService } from "../services/authService";
import logo from "../assets/logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleGoogleLogin = async (credentialResponse) => {
    setErrorMessage("");
    setIsLoading(true);
    try {
      const userData = await authService.loginWithGoogle(credentialResponse);
      login(userData);
      navigate("/");
    } catch (err) {
      setErrorMessage(err.message || "Login Google gagal, silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormLogin = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const userData = await authService.loginWithEmail(email, password);
      login(userData);
      navigate("/");
    } catch (err) {
      setErrorMessage(err.message || "Gagal masuk. Periksa kembali email dan password akun HR.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-3 sm:p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl sm:rounded-3xl shadow-lg p-5 sm:p-8 md:p-10 border border-gray-100">
        <div className="flex justify-center mb-5 sm:mb-6">
          <img src={logo} alt="Assist.id" className="h-9 sm:h-10 w-auto object-contain" />
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700">
            <FaExclamationCircle className="text-red-500 text-sm shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleFormLogin} className="flex flex-col gap-3.5 sm:gap-4">
          <div>
            <label className="text-xs font-bold text-gray-800 mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hr@assist.com"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-800">
                Password
              </label>
              <a href="#" className="text-xs font-semibold text-primary hover:underline">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-1 bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <FaSpinner className="animate-spin" size={14} /> Memverifikasi...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>

        <div className="flex items-center gap-3 my-4 sm:my-5">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-xs font-semibold text-gray-400 tracking-wider">ATAU</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        <div className="flex flex-col items-center gap-2 w-full max-w-full overflow-hidden">
          <div className="w-full flex justify-center max-w-[280px] sm:max-w-[320px] overflow-hidden">
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => setErrorMessage("Login Google gagal. Pastikan koneksi internet aktif.")}
              theme="outline"
              size="large"
              width="280"
              text="continue_with"
              shape="rectangular"
            />
          </div>
          <p className="text-[11px] text-gray-400 text-center mt-1">
            Masuk dengan akun Google Assist.id
          </p>
        </div>
      </div>
    </div>
  );
}