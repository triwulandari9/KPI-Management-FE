import { useState, useEffect } from "react";
import {
  FaUserPlus,
  FaEnvelope,
  FaTimes,
  FaCheckCircle,
  FaStar,
  FaAward,
  FaCode,
  FaFilter,
  FaTasks,
  FaChartLine,
} from "react-icons/fa";

import Header from "../layouts/Header";
import Sidebar from "../layouts/Sidebar";
import PageHeader from "../layouts/PageHeader";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { employeeService } from "../services/employeeService";

export default function Employees() {
  const { collapsed } = useSidebar();
  const { currentUser } = useAuth();
  const isHR = currentUser?.role?.toUpperCase() === "HR";

  const [employees, setEmployees] = useState([]);
  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State Form Tambah Karyawan Baru
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    role: "Frontend Developer",
    department: "Engineering",
    email: "",
  });

  useEffect(() => {
    let isMounted = true;
    async function loadEmployees() {
      try {
        const data = await employeeService.getEmployees();
        if (isMounted && data) {
          setEmployees(data);
        }
      } catch (err) {
        console.error("Gagal load data employees:", err);
      }
    }
    loadEmployees();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredEmployees = employees.filter((emp) => {
    return selectedRole === "All" || emp.role.includes(selectedRole) || emp.department === selectedRole;
  });

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployee.name.trim() || !newEmployee.email.trim()) return;

    try {
      const created = await employeeService.createEmployee(newEmployee);
      setEmployees((prev) => [...prev, created]);
      setIsModalOpen(false);
      setNewEmployee({
        name: "",
        role: "Frontend Developer",
        department: "Engineering",
        email: "",
      });
    } catch (err) {
      console.error("Gagal menambah karyawan:", err);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      <Sidebar />

      <main className={`transition-all duration-300 pt-16 p-4 sm:p-6 lg:p-8 ${collapsed ? "lg:ml-20" : "lg:ml-64"}`}>
        {/* Page Header */}
        <PageHeader title="Employee Directory" subtitle="Daftar profil pengembang dan ringkasan capaian performa KPI">
          {isHR && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer w-full sm:w-auto justify-center"
            >
              <FaUserPlus size={13} /> Tambah Karyawan
            </button>
          )}
        </PageHeader>

        {/* Filter Toolbar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 justify-between sm:justify-start">
            <span className="text-xs font-semibold text-gray-500 shrink-0">Filter Divisi / Role:</span>
            <div className="flex items-center gap-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-xl border border-gray-200 transition-colors flex-1 sm:flex-initial">
              <FaFilter className="text-gray-400 shrink-0" />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="bg-transparent focus:outline-none font-medium cursor-pointer w-full"
              >
                <option value="All">Semua Divisi & Role</option>
                <option value="Engineering">Engineering (Dev)</option>
                <option value="Frontend">Frontend Developer</option>
                <option value="Backend">Backend Developer</option>
                <option value="UI/UX">UI/UX Designer</option>
                <option value="Quality Assurance">Quality Assurance (QA)</option>
                <option value="Product Owner">Product Owner (PO)</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-right sm:text-left">
            Menampilkan <b>{filteredEmployees.length}</b> anggota tim
          </p>
        </div>

        {/* Employee Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredEmployees.map((emp) => (
            <div
              key={emp.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Card Top: Avatar & Badge */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={emp.avatar}
                      alt={emp.name}
                      className="w-13 h-13 rounded-2xl object-cover ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all"
                    />
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm">{emp.name}</h3>
                      <p className="text-xs text-primary font-medium">{emp.role}</p>
                      <span className="text-[10px] text-gray-400 font-mono">{emp.id}</span>
                    </div>
                  </div>

                  {/* Level Badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                      emp.stats.kpiLevel === 4
                        ? "bg-green-50 text-green-600 border-green-200"
                        : emp.stats.kpiLevel === 3
                        ? "bg-blue-50 text-blue-600 border-blue-200"
                        : "bg-amber-50 text-amber-600 border-amber-200"
                    }`}
                  >
                    <FaAward size={10} /> Level {emp.stats.kpiLevel}
                  </span>
                </div>

                {/* Email & Join Date */}
                <div className="text-xs text-gray-500 flex flex-col gap-1.5 py-3 border-y border-gray-50">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FaEnvelope className="text-gray-400 text-xs" />
                    <span>{emp.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>Divisi: {emp.department}</span>
                    <span>Bergabung: {emp.joinDate}</span>
                  </div>
                </div>

                {/* Performance / KPI Stats Mini Bar */}
                <div className="grid grid-cols-3 gap-2 text-center my-4 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-[10px] text-gray-400">Sprint Points</p>
                    <p className="text-sm font-bold text-accent">{emp.stats.sprintPoints} SP</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Total Task</p>
                    <p className="text-sm font-bold text-gray-800">{emp.stats.totalTasks}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">On Time</p>
                    <p className="text-sm font-bold text-green-600">{emp.stats.onTimeRate}</p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setSelectedEmployee(emp)}
                className="w-full py-2 bg-primary-light hover:bg-primary hover:text-white text-primary text-xs font-semibold rounded-xl transition-all text-center cursor-pointer"
              >
                Lihat Detail KPI & Kinerja
              </button>
            </div>
          ))}
        </div>

        {/* MODAL 1: Detail Karyawan & KPI */}
        {selectedEmployee && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedEmployee.avatar}
                    alt={selectedEmployee.name}
                    className="w-12 h-12 rounded-2xl object-cover"
                  />
                  <div>
                    <h3 className="font-bold text-base text-gray-800">{selectedEmployee.name}</h3>
                    <p className="text-xs text-primary">{selectedEmployee.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="py-4 flex flex-col gap-4">
                {/* Rincian Status */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-400 block text-[11px]">Email Resmi</span>
                    <span className="font-semibold text-gray-700">{selectedEmployee.email}</span>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-400 block text-[11px]">Divisi</span>
                    <span className="font-semibold text-gray-700">{selectedEmployee.department}</span>
                  </div>
                </div>

                {/* KPI Metrics Breakdown */}
                <div>
                  <h4 className="font-bold text-xs text-gray-700 mb-2 flex items-center gap-1.5">
                    <FaChartLine className="text-primary" /> Rincian Metrik KPI Bulan Ini
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-600">Pencapaian Level KPI</span>
                      <span className="font-bold text-green-600">Level {selectedEmployee.stats.kpiLevel} (Sangat Baik)</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-600">Akumulasi Sprint Point (SP)</span>
                      <span className="font-bold text-accent">{selectedEmployee.stats.sprintPoints} SP</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-600">On Time Delivery (Fitur Tepat Waktu)</span>
                      <span className="font-bold text-gray-800">{selectedEmployee.stats.onTimeRate}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-600">SLA Ticket Bug Resolution</span>
                      <span className="font-bold text-gray-800">{selectedEmployee.stats.slaBugRate}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 text-right">
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: Tambah Karyawan Baru */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">Tambah Anggota Tim</h3>
                  <p className="text-xs text-gray-400">Daftarkan karyawan baru ke sistem KPI</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleCreateEmployee} className="mt-4 flex flex-col gap-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ahmad Fauzi"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Email Resmi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="nama@assist.id"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Posisi / Role</label>
                  <select
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer"
                  >
                    <option value="Frontend Developer">Frontend Developer</option>
                    <option value="Backend Developer">Backend Developer</option>
                    <option value="UI/UX Designer">UI/UX Designer</option>
                    <option value="Quality Assurance (QA)">Quality Assurance (QA)</option>
                    <option value="Product Owner (PO)">Product Owner (PO)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Divisi / Departemen</label>
                  <select
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Product & Design">Product & Design</option>
                    <option value="Quality Control">Quality Control</option>
                    <option value="Product Management">Product Management</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl font-semibold bg-primary hover:bg-primary-dark text-white shadow-sm cursor-pointer"
                  >
                    Simpan Karyawan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
