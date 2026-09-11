import { FaBars } from "react-icons/fa";
import logo from "../assets/logo.png";
import foto from "../assets/foto.jpg";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { collapsed, setCollapsed, toggleMobile } = useSidebar();
  const { currentUser } = useAuth();

  const userName = currentUser?.name || "Sari";
  const userRole = currentUser?.role || "Karyawan";

  const handleToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      toggleMobile();
    } else {
      setCollapsed(!collapsed);
    }
  };

  return (
    <header className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-4 sm:px-6 lg:px-8 fixed top-0 left-0 right-0 z-30 shadow-2xs">
      {/* Sisi Kiri: Hamburger & Logo */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        <button
          onClick={handleToggle}
          className="text-gray-700 hover:text-primary cursor-pointer p-2 rounded-xl hover:bg-gray-100 active:scale-95 transition-all"
          title="Buka / Tutup Menu"
          aria-label="Toggle Menu"
        >
          <FaBars size={18} />
        </button>
        <img src={logo} alt="Assist.id" className="h-8 sm:h-9 w-auto object-contain" />
      </div>

      {/* Sisi Kanan: Profil Pengguna Saja */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <img
          src={foto}
          alt="avatar"
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-primary/15 shrink-0"
        />
        <div className="text-left">
          <p className="font-semibold text-gray-800 leading-tight text-xs sm:text-sm truncate max-w-[100px] sm:max-w-none">
            {userName}
          </p>
          <span
            className={`inline-block text-[9px] sm:text-[10px] font-bold px-2 py-0.5 mt-0.5 rounded-full ${
              userRole?.toUpperCase() === "HR"
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-primary"
            }`}
          >
            {userRole}
          </span>
        </div>
      </div>
    </header>
  );
}