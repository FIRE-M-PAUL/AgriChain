import { motion } from "framer-motion";

export default function Button({ children, className = "", ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.01 }}
      className={`rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg transition ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}
