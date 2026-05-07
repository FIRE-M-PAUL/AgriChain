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
    sm: "h-9 w-9",
    md: "h-12 w-12",
    lg: "h-20 w-20",
    xl: "h-28 w-28",
  };

  const imageNode = (
    <img
      src={PRIMARY_LOGO_SRC}
      alt="AGRICHAIN Logo"
      className={`${dimensions[size] || dimensions.md} rounded-xl object-cover shadow-[0_0_25px_rgba(34,197,94,0.35)] ring-1 ring-emerald-300/25`}
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
    <div className={`flex items-center gap-3 ${className}`}>
      {logoImage}
      {!compact && (
        <div>
          <p className="text-lg font-extrabold tracking-wide text-white">
            AGRI<span className="text-primary">CHAIN</span>
          </p>
          {showTagline && <p className="text-[11px] text-emerald-200/80">Blockchain • Farming • Trust</p>}
        </div>
      )}
    </div>
  );
}
