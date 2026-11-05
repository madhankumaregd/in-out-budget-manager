import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

/**
 * ConfirmModal – a styled in-app confirmation dialog with swipe-down-to-close.
 */
const ConfirmModal = ({
  isOpen,
  onConfirm,
  onCancel,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Delete",
  confirmColor = "bg-red-600 hover:bg-red-700",
  icon: Icon = AlertTriangle,
}) => {
  const touchStartY = useRef(null);

  const handleTouchStart = (e) => {
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (deltaY > 60) {
      onCancel();
    }
    touchStartY.current = null;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
          />

          {/* Dialog */}
          <motion.div
            key="dialog"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Top swipe down handle */}
              <div className="w-full flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
              </div>

              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-red-500 to-rose-500" />

              <div className="p-6">
                {/* Header with X */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-red-500" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800">{title}</h2>
                  </div>
                  <button
                    onClick={onCancel}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Message */}
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  {message}
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={onCancel}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirm}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition ${confirmColor}`}
                  >
                    {confirmLabel}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmModal;
