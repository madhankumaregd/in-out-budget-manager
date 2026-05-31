import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  Mail,
  Lock,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { signup, login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (resetMode) {
        await resetPassword(email);
        toast.success("Password reset email sent! Check your inbox.");
        setResetMode(false);
      } else if (isLogin) {
        await login(email, password);
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters");
          setLoading(false);
          return;
        }
        await signup(email, password, displayName);
        toast.success("Account created successfully!");
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-lg"
      >
        {/* Decorative elements */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>

        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12">
          {/* Logo Section */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl mb-6 shadow-lg">
              <DollarSign className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              IN & OUT
            </h1>
            <p className="text-gray-500 text-lg">Personal Budget Manager</p>
          </motion.div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl mb-6 flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {!resetMode ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-gray-800 placeholder-gray-400"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </motion.div>

              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    Full Name
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-gray-800 placeholder-gray-400"
                      placeholder="Enter your full name"
                      required={!isLogin}
                    />
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-gray-800 placeholder-gray-400"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                    )}
                  </button>
                </div>
              </motion.div>

              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <label className="block text-gray-700 text-sm font-semibold mb-2">
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-gray-800 placeholder-gray-400"
                      placeholder="Confirm your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-4 top-1/2 transform -translate-y-1/2"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400 hover:text-gray-600 transition-colors" />
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3.5 px-4 rounded-xl hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg flex items-center justify-center gap-2 group"
              >
                <span>
                  {loading
                    ? "Processing..."
                    : isLogin
                      ? "Login"
                      : "Create Account"}
                </span>
                {!loading && (
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                )}
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-gray-800"
                    required
                  />
                </div>
              </motion.div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3.5 px-4 rounded-xl hover:shadow-xl transition-all duration-200 disabled:opacity-50 text-lg"
              >
                {loading ? "Sending..." : "Send Reset Email"}
              </motion.button>
            </form>
          )}

          <div className="mt-8 space-y-3 text-center">
            {!resetMode && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                onClick={() => setIsLogin(!isLogin)}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-semibold transition-colors"
              >
                {isLogin
                  ? "Don't have an account? Create one"
                  : "Already have an account? Login"}
              </motion.button>
            )}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              onClick={() => setResetMode(!resetMode)}
              className="text-gray-500 hover:text-gray-700 text-sm block w-full transition-colors"
            >
              {resetMode ? "Back to Login" : "Forgot Password?"}
            </motion.button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/80 text-sm mt-8">
          Secure financial management • Your data is safe with us
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
