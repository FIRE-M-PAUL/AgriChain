export default function Card({ children, className = "" }) {
  return <div className={`glass rounded-2xl p-5 shadow-glass ${className}`}>{children}</div>;
}
