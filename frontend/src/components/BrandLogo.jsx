import { motion } from "framer-motion";
import agrichainLogo from "../assets/logo/agrichain-logo.png";

const PRIMARY_LOGO_SRC = agrichainLogo;
const FALLBACK_LOGO_SRC = "/favicon.svg";

export default function BrandLogo({
  size = "md",
  showTagline = false,
  animated = false,
  className = "",
  compact = false,
}) {
  const dimensions = {
    sm: "h-12 w-12",
    md: "h-16 w-16",
    lg: "h-24 w-24",
    xl: "h-32 w-32",
  };

  const imageNode = (
    <img
      src={PRIMARY_LOGO_SRC}
      alt="AGRICHAIN Logo"
      className={`${dimensions[size] || dimensions.md} rounded-full object-cover shadow-[0_0_25px_rgba(34,197,94,0.35)] ring-1 ring-emerald-300/25`}
      onError={(event) => {
        event.currentTarget.src = FALLBACK_LOGO_SRC;
      }}
      loading="lazy"
      decoding="async"
    />
  );

  const logoImage = animated ? (
    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>
      {imageNode}
    </motion.div>
  ) : (
    imageNode
  );

  return (
    <div className={`flex flex-col items-center justify-center gap-2 p-1 text-center ${className}`}>
      {logoImage}
      {!compact && (
        <div className="space-y-0.5">
          <p className="text-xl font-extrabold tracking-wide text-white sm:text-2xl">
            AGRI<span className="text-primary">CHAIN</span>
          </p>
          {showTagline && <p className="text-xs text-emerald-200/75">Blockchain • Farming • Trust</p>}
        </div>
      )}
    </div>
  );
}
