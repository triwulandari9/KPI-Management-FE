import { useState } from "react";
import {
  FaHome,
  FaTasks,
  FaUsers,
  FaRegCalendarAlt,
  FaChartBar,
  FaSignOutAlt,
  FaChevronDown,
  FaChevronRight,
  FaTimes,
} from "react-icons/fa";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";

const KPI_SUBMENU = [
  { id: "kpi-1", name: "On Time Delivery", no: 1 },
  { id: "kpi-2", name: "SLA Ticket Bug", no: 2 },
  { id: "kpi-3", name: "Production Bug Density", no: 3 },
  { id: "kpi-4", name: "Continuous Improvement", no: 4 },
  { id: "kpi-5", name: "Tech Debt Completion", no: 5 },
  { id: "kpi-6", name: "Task Completion Rate", no: 6 },
  { id: "kpi-7", name: "Task Backward Rate", no: 7 },
  { id: "kpi-8", name: "Sprint Point (SP)", no: 8 },
];

export default function Sidebar() {
  const { collapsed, mobileOpen, closeMobile } = useSidebar();
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isKpiActive = location.pathname.startsWith("/kpi");
  const [kpiExpanded, setKpiExpanded] = useState(true);

  const handleLogout = () => {
    closeMobile();
    logout();
    navigate("/login");
  };

  const handleNavClick = () => {
    closeMobile();
  };

  const scrollToKpi = (kpiId) => {
    closeMobile();
    if (!isKpiActive) {
      navigate(`/kpi#${kpiId}`);
    } else {
      const element = document.getElementById(kpiId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("bg-blue-100/70");
        setTimeout(() => element.classList.remove("bg-blue-100/70"), 1500);
      }
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          aria-label="Tutup menu navigasi"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 bg-white flex flex-col justify-between transition-all duration-300 z-50 overflow-y-auto ${
          /* Responsive positioning and width: */
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        } w-72 lg:top-16 lg:h-[calc(100vh-4rem)] lg:border-r lg:border-gray-100 lg:shadow-none ${
          collapsed ? "lg:w-20" : "lg:w-64"
        }`}
      >
        <div>
          {/* Header Khusus Mobile di dalam Drawer */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 lg:hidden">
            <div className="flex items-center gap-2.5">
              <img src={logo} alt="Assist.id" className="h-8 w-auto object-contain" />
              <span className="text-xs font-bold text-gray-800">KPI Management</span>
            </div>
            <button
              onClick={closeMobile}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Tutup Menu"
            >
              <FaTimes size={16} />
            </button>
          </div>

          <nav className="mt-3 lg:mt-4 px-3 flex flex-col gap-1">
            {/* Dashboard */}
            <NavLink
              to="/"
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all duration-200 active:scale-[0.98] ${
                  isActive
                    ? "bg-primary-light text-primary font-semibold shadow-xs"
                    : "text-gray-700 hover:bg-primary-light/40 hover:text-primary"
                } ${collapsed ? "lg:justify-center lg:px-2" : ""}`
              }
              title={collapsed ? "Dashboard" : ""}
            >
              <span className="text-lg shrink-0">
                <FaHome />
              </span>
              <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>
                Dashboard
              </span>
            </NavLink>

            {/* Task Management */}
            <NavLink
              to="/tasks"
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all duration-200 active:scale-[0.98] ${
                  isActive
                    ? "bg-primary-light text-primary font-semibold shadow-xs"
                    : "text-gray-700 hover:bg-primary-light/40 hover:text-primary"
                } ${collapsed ? "lg:justify-center lg:px-2" : ""}`
              }
              title={collapsed ? "Task Management" : ""}
            >
              <span className="text-lg shrink-0">
                <FaTasks />
              </span>
              <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>
                Task Management
              </span>
            </NavLink>

            {/* Employee Directory */}
            <NavLink
              to="/employees"
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all duration-200 active:scale-[0.98] ${
                  isActive
                    ? "bg-primary-light text-primary font-semibold shadow-xs"
                    : "text-gray-700 hover:bg-primary-light/40 hover:text-primary"
                } ${collapsed ? "lg:justify-center lg:px-2" : ""}`
              }
              title={collapsed ? "Employee Directory" : ""}
            >
              <span className="text-lg shrink-0">
                <FaUsers />
              </span>
              <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>
                Employee Directory
              </span>
            </NavLink>

            {/* Calendar */}
            <NavLink
              to="/calendar"
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-3 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all duration-200 active:scale-[0.98] ${
                  isActive
                    ? "bg-primary-light text-primary font-semibold shadow-xs"
                    : "text-gray-700 hover:bg-primary-light/40 hover:text-primary"
                } ${collapsed ? "lg:justify-center lg:px-2" : ""}`
              }
              title={collapsed ? "Calendar" : ""}
            >
              <span className="text-lg shrink-0">
                <FaRegCalendarAlt />
              </span>
              <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>
                Calendar
              </span>
            </NavLink>

            {/* KPI Tracking (dengan Submenu List 8 KPI Name) */}
            <div>
              <div
                onClick={() => {
                  if (!isKpiActive) navigate("/kpi");
                  setKpiExpanded(!kpiExpanded);
                }}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  isKpiActive
                    ? "bg-primary-light text-primary font-semibold shadow-xs"
                    : "text-gray-700 hover:bg-primary-light/40 hover:text-primary"
                } ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
                title={collapsed ? "KPI Tracking" : ""}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg shrink-0">
                    <FaChartBar />
                  </span>
                  <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>
                    KPI Tracking
                  </span>
                </div>
                <span className={`text-xs text-gray-400 ${collapsed ? "lg:hidden" : ""}`}>
                  {kpiExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                </span>
              </div>

              {/* Submenu List 8 KPI Names */}
              {kpiExpanded && (
                <div
                  className={`ml-4 pl-3.5 my-1.5 border-l-2 border-primary/20 flex flex-col gap-1 ${
                    collapsed ? "lg:hidden" : ""
                  }`}
                >
                  {KPI_SUBMENU.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => scrollToKpi(sub.id)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-gray-600 hover:bg-primary-light/60 hover:text-primary transition-all text-left group cursor-pointer"
                    >
                      <span className="w-4 h-4 rounded-full bg-gray-100 group-hover:bg-primary group-hover:text-white flex items-center justify-center text-[9px] font-bold text-gray-500 shrink-0 transition-colors">
                        {sub.no}
                      </span>
                      <span className="truncate">{sub.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Footer Sidebar: Logout */}
        <div className="px-3 pb-6 pt-4 flex flex-col gap-3 border-t border-gray-100 bg-white">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold text-red-500 hover:bg-red-50 hover:text-red-600 active:bg-red-100 active:scale-[0.98] whitespace-nowrap transition-all duration-200 cursor-pointer ${
              collapsed ? "lg:justify-center lg:px-2" : ""
            }`}
            title={collapsed ? "Logout" : ""}
          >
            <FaSignOutAlt className="text-base text-red-500 shrink-0" />
            <span className={collapsed ? "lg:hidden" : ""}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}