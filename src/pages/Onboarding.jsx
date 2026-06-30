import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  RefreshCw,
  Phone,
  ShieldCheck,
  User,
  ArrowRight,
  LogOut,
} from "lucide-react";
import toast from "react-hot-toast";

const countryCodes = [
  { code: "+91", label: "India (+91)" },
  { code: "+1", label: "US/Canada (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+81", label: "Japan (+81)" },
  { code: "+49", label: "Germany (+49)" },
  { code: "+33", label: "France (+33)" },
];

const Onboarding = () => {
  const { currentUser, userProfile, setupRecaptcha, linkPhone, logout, setUserProfile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Phone state
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Profile state
  const [displayName, setDisplayName] = useState("");
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    // Determine which step to show based on user state
    if (!currentUser.emailVerified) {
      setStep(1); // Email verify
    } else if (!userProfile?.phone) {
      setStep(2); // Phone verify
    } else if (!userProfile?.displayName) {
      setStep(3); // Profile details
    } else {
      // All set
      navigate("/dashboard");
    }
  }, [currentUser, userProfile, navigate]);

  // Clean up recaptcha
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const checkEmailVerified = async () => {
    setLoading(true);
    await currentUser.reload();
    if (currentUser.emailVerified) {
      toast.success("Email verified!");
      setStep(2);
    } else {
      toast.error("Email not yet verified. Please check your inbox.");
    }
    setLoading(false);
  };

  const handleSavePhone = async (e) => {
    e.preventDefault();
    if (phoneNumber.length < 5) {
      toast.error("Please enter a valid phone number");
      return;
    }
    setLoading(true);
    try {
      const fullPhone = countryCode + phoneNumber;
      await updateDoc(doc(db, "users", currentUser.uid), {
        phone: fullPhone,
      });
      setUserProfile((prev) => ({ ...prev, phone: fullPhone }));
      toast.success("Phone number saved!");
      if (!userProfile?.displayName) {
        setStep(3);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save phone number");
    }
    setLoading(false);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!displayName) {
      toast.error("Name is required");
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        displayName,
        currency,
      });
      setUserProfile((prev) => ({ ...prev, displayName, currency }));
      toast.success("Profile completed!");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save profile");
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12 overflow-hidden"
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Setup Account</h1>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div id="recaptcha-container"></div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="text-center"
            >
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-10 h-10 text-indigo-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Verify your email
              </h2>
              <p className="text-gray-500 mb-8">
                We've sent a verification link to <br />
                <span className="font-semibold text-gray-800">
                  {currentUser?.email}
                </span>
                <br />
                Please click the link in the email to continue.
              </p>
              <button
                onClick={checkEmailVerified}
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    I have verified my email
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSavePhone}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-10 h-10 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">
                  Add Phone Number
                </h2>
                <p className="text-gray-500 text-sm">
                  Required for account recovery
                </p>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-1/3 px-3 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 bg-white"
                  >
                    {countryCodes.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="9876543210"
                    className="w-2/3 px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
              >
                {loading ? "Saving..." : "Save & Continue"}
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.form>
          )}



          {step === 3 && (
            <motion.form
              key="step3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSaveProfile}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-10 h-10 text-purple-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-1">
                  Final Touches
                </h2>
                <p className="text-gray-500 text-sm">
                  Let's personalize your experience
                </p>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Preferred Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 bg-white"
                >
                  <option value="INR">Indian Rupee (₹)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="EUR">Euro (€)</option>
                  <option value="GBP">British Pound (£)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
              >
                {loading ? "Saving..." : "Go to Dashboard"}
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Onboarding;
