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
  FaEdit,
  FaCamera,
  FaTrashAlt,
  FaExclamationCircle,
} from "react-icons/fa";

import Header from "../layouts/Header";
import Sidebar from "../layouts/Sidebar";
import PageHeader from "../layouts/PageHeader";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { employeeService } from "../services/employeeService";

export default function Employees() {
  const { collapsed } = useSidebar();
  const { currentUser, updateUserProfile } = useAuth();
  const isHR = currentUser?.role?.toUpperCase() === "HR";

  // Normalisasi nama dari backend (bisa ALL CAPS) menjadi Title Case
  const formatName = (name) => {
    if (!name) return "";
    return name
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  // Helper untuk generate avatar inisial jika foto belum ada / kosong
  const getAvatarUrl = (emp) => {
    if (emp?.avatar && typeof emp.avatar === "string" && emp.avatar.trim().length > 0) {
      return emp.avatar;
    }
    const name = emp?.name || "User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff&bold=true&rounded=true`;
  };

  const [employees, setEmployees] = useState([]);
  const [selectedRole, setSelectedRole] = useState("All");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [isPhotoOnlyMode, setIsPhotoOnlyMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  // State Form Tambah Karyawan Baru
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    role: "Frontend Developer",
    department: "Engineering",
    email: "",
    avatar: "",
  });

  // State Form Edit Karyawan
  const [editFormData, setEditFormData] = useState({
    name: "",
    role: "Frontend Developer",
    department: "Engineering",
    email: "",
    avatar: "",
  });

  useEffect(() => {
    let isMounted = true;
    async function loadEmployees() {
      try {
        const data = await employeeService.getEmployees();
        if (isMounted && data) {
          // Sinkronkan foto jika currentUser punya avatar terbaru
          const syncedData = data.map((emp) => {
            const isMatch =
              currentUser &&
              (currentUser.email === emp.email ||
                currentUser._id === (emp._id || emp.id) ||
                currentUser.id === (emp._id || emp.id) ||
                currentUser.name?.toLowerCase() === emp.name?.toLowerCase());
            if (isMatch && currentUser.avatar) {
              return { ...emp, avatar: currentUser.avatar };
            }
            return emp;
          });
          setEmployees(syncedData);
        }
      } catch (err) {
        console.error("Gagal load data employees:", err);
      }
    }
    loadEmployees();

    const handleAvatarUpdated = (event) => {
      const { avatar, email, id } = event.detail || {};
      if (avatar) {
        setEmployees((prev) =>
          prev.map((emp) => {
            const isMatch =
              (email && emp.email === email) ||
              (id && (emp._id === id || emp.id === id)) ||
              (currentUser &&
                (currentUser.email === emp.email ||
                  currentUser._id === (emp._id || emp.id) ||
                  currentUser.id === (emp._id || emp.id) ||
                  currentUser.name?.toLowerCase() === emp.name?.toLowerCase()));
            return isMatch ? { ...emp, avatar } : emp;
          })
        );
      }
    };

    window.addEventListener("user_avatar_updated", handleAvatarUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("user_avatar_updated", handleAvatarUpdated);
    };
  }, [currentUser]);

  // Cross‑tab avatar sync via localStorage
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "kpi_avatar_updated" && e.newValue) {
        // Refresh employee list to get updated avatar URLs
        (async () => {
          try {
            const data = await employeeService.getEmployees({ _t: Date.now() });
            setEmployees(data);
          } catch (err) {
            console.error("Failed to refresh employees after avatar update:", err);
          }
        })();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

// Polling to refresh employee data globally every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const freshData = await employeeService.getEmployees({ _t: Date.now() });
        if (Array.isArray(freshData) && freshData.length) {
          setEmployees(freshData);
        }
      } catch (err) {
        console.error("Polling error fetching employees:", err);
      }
    }, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, []);

  const filteredEmployees = employees.filter((emp) => {
    return selectedRole === "All" || emp.role?.includes(selectedRole) || emp.department === selectedRole;
  });

  // Kompresi foto agar ukuran string Base64 kecil (~20-40KB) sehingga selalu diterima oleh database backend
  const compressImageFile = (file, maxWidth = 300, maxHeight = 300, quality = 0.75) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedBase64);
        };
        img.onerror = () => resolve(event.target.result);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Validasi & Upload Foto (JPG, JPEG, PNG, Maks 2MB)
  const handleAvatarChange = async (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Batasan format: JPG, JPEG, PNG
    const validExtensions = ["jpg", "jpeg", "png"];
    const fileExt = file.name.split(".").pop().toLowerCase();
    const validTypes = ["image/jpeg", "image/jpg", "image/png"];

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExt)) {
      setAvatarError("Format file tidak didukung! Harap upload foto format JPG, JPEG, atau PNG.");
      return;
    }

    // Batasan ukuran: Maks 2MB
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Ukuran foto terlalu besar! Maksimal ukuran file 2MB.");
      return;
    }

    setAvatarError("");
    try {
      const base64Url = await compressImageFile(file, 300, 300, 0.75);
      if (isEdit) {
        setEditFormData((prev) => ({ ...prev, avatar: base64Url }));
      } else {
        setNewEmployee((prev) => ({ ...prev, avatar: base64Url }));
      }
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Url = reader.result;
        if (isEdit) {
          setEditFormData((prev) => ({ ...prev, avatar: base64Url }));
        } else {
          setNewEmployee((prev) => ({ ...prev, avatar: base64Url }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployee.name.trim() || !newEmployee.email.trim()) return;

    const payload = {
      ...newEmployee,
      avatar:
        newEmployee.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(newEmployee.name)}&background=3b82f6&color=fff&bold=true`,
    };

    try {
      const created = await employeeService.createEmployee(payload);
      setEmployees((prev) => [...prev, created]);
      setIsModalOpen(false);
      setAvatarError("");
      setNewEmployee({
        name: "",
        role: "Frontend Developer",
        department: "Engineering",
        email: "",
        avatar: "",
      });
    } catch (err) {
      console.error("Gagal menambah karyawan:", err);
      // Fallback local append
      setEmployees((prev) => [
        ...prev,
        {
          id: `EMP-${Date.now().toString().slice(-4)}`,
          ...payload,
          stats: { kpiLevel: 3, sprintPoints: 0, totalTasks: 0, onTimeRate: "100%", slaBugRate: "100%" },
        },
      ]);
      setIsModalOpen(false);
      setAvatarError("");
      setNewEmployee({
        name: "",
        role: "Frontend Developer",
        department: "Engineering",
        email: "",
        avatar: "",
      });
    }
  };

  // Buka modal edit penuh (khusus HR)
  const handleOpenEditModal = (emp) => {
    setEditingEmployee(emp);
    setIsPhotoOnlyMode(false);
    setAvatarError("");
    setEditFormData({
      name: formatName(emp.name || ""),
      role: emp.role || emp.position || "Frontend Developer",
      department: emp.department || "Engineering",
      email: emp.email || "",
      avatar: emp.avatar || "",
    });
  };

  // Buka modal edit foto saja (untuk Karyawan biasa yang ingin ganti fotonya sendiri)
  const handleOpenPhotoOnlyModal = (emp) => {
    setEditingEmployee(emp);
    setIsPhotoOnlyMode(true);
    setAvatarError("");
    setEditFormData({
      name: formatName(emp.name || ""),
      role: emp.role || emp.position || "Frontend Developer",
      department: emp.department || "Engineering",
      email: emp.email || "",
      avatar: emp.avatar || "",
    });
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    if (!editingEmployee) return;

    const empId = editingEmployee._id || editingEmployee.id;
    try {
      const updated = await employeeService.updateEmployee(empId, editFormData);
      setEmployees((prev) =>
        prev.map((emp) =>
          (emp._id || emp.id) === empId
            ? { ...emp, ...editFormData, ...(updated || {}) }
            : emp
        )
      );
      if (selectedEmployee && (selectedEmployee._id || selectedEmployee.id) === empId) {
        setSelectedEmployee((prev) => ({ ...prev, ...editFormData, ...(updated || {}) }));
      }
      if (currentUser && (currentUser.email === editingEmployee.email || currentUser._id === empId || currentUser.id === empId)) {
        // Update global user profile (dispatches event)
        updateUserProfile?.({ avatar: editFormData.avatar });
        // Also broadcast via localStorage for other tabs (employees list)
        try {
          localStorage.setItem(
            "kpi_avatar_updated",
            JSON.stringify({ avatar: editFormData.avatar, email: currentUser?.email, id: empId })
          );
        } catch (e) {
          console.warn("Failed to write avatar update to localStorage", e);
        }
      }
      setEditingEmployee(null);
      setAvatarError("");
    } catch (err) {
      console.error("Gagal update data karyawan:", err);
      // Fallback local update agar UI tetap langsung terupdate
      setEmployees((prev) =>
        prev.map((emp) =>
          (emp._id || emp.id) === empId
            ? { ...emp, ...editFormData }
            : emp
        )
      );
      if (selectedEmployee && (selectedEmployee._id || selectedEmployee.id) === empId) {
        setSelectedEmployee((prev) => ({ ...prev, ...editFormData }));
      }
      if (currentUser && (currentUser.email === editingEmployee.email || currentUser._id === empId || currentUser.id === empId)) {
        // Update profile locally on error fallback
        updateUserProfile?.({ avatar: editFormData.avatar });
        // Broadcast via localStorage for other tabs
        try {
          localStorage.setItem(
            "kpi_avatar_updated",
            JSON.stringify({ avatar: editFormData.avatar, email: currentUser?.email, id: empId })
          );
        } catch (e) {
          console.warn("Failed to write avatar update to localStorage", e);
        }
      }
      setEditingEmployee(null);
      setAvatarError("");
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      <Sidebar />

      <main className={`transition-all duration-300 pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 ${collapsed ? "lg:ml-20" : "lg:ml-64"}`}>
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
              key={emp._id || emp.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Card Top: Avatar & Badge */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={getAvatarUrl(emp)}
                      alt={emp.name}
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name || "U")}&background=3b82f6&color=fff&bold=true`;
                      }}
                      className="w-13 h-13 rounded-2xl object-cover ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all shrink-0 bg-gray-50"
                    />
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-800 text-sm truncate">{formatName(emp.name)}</h3>
                      <p className="text-xs text-primary font-medium truncate">{emp.role}</p>
                      <span className="text-[10px] text-gray-400 font-mono truncate block">{emp._id || emp.id}</span>
                    </div>
                  </div>

                  {/* Level Badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap shrink-0 ${
                      emp.stats?.kpiLevel === 4
                        ? "bg-green-50 text-green-600 border-green-200"
                        : emp.stats?.kpiLevel === 3
                        ? "bg-blue-50 text-blue-600 border-blue-200"
                        : "bg-amber-50 text-amber-600 border-amber-200"
                    }`}
                  >
                    <FaAward size={10} /> Level {emp.stats?.kpiLevel ?? 4}
                  </span>
                </div>

                {/* Email & Join Date */}
                <div className="text-xs text-gray-500 flex flex-col gap-1.5 py-3 border-y border-gray-50">
                  <div className="flex items-center gap-2 text-gray-600">
                    <FaEnvelope className="text-gray-400 text-xs" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400">
                    <span>Divisi: {emp.department}</span>
                    <span>Bergabung: {emp.joinDate || "2026"}</span>
                  </div>
                </div>

                {/* Performance / KPI Stats Mini Bar */}
                <div className="grid grid-cols-3 gap-2 text-center my-4 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-[10px] text-gray-400">Sprint Points</p>
                    <p className="text-sm font-bold text-accent">{emp.stats?.sprintPoints ?? 0} SP</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Total Task</p>
                    <p className="text-sm font-bold text-gray-800">{emp.stats?.totalTasks ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">On Time</p>
                    <p className="text-sm font-bold text-green-600">{emp.stats?.onTimeRate ?? "100%"}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => setSelectedEmployee(emp)}
                  className="flex-1 py-2 bg-primary-light hover:bg-primary hover:text-white text-primary text-xs font-semibold rounded-xl transition-all text-center cursor-pointer shadow-2xs"
                >
                  Lihat Detail KPI
                </button>
                {isHR ? (
                  <button
                    onClick={() => handleOpenEditModal(emp)}
                    className="px-3.5 py-2 bg-gray-100 hover:bg-primary hover:text-white text-gray-700 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                    title="Edit Posisi & Divisi Karyawan"
                  >
                    <FaEdit size={11} /> Edit
                  </button>
                ) : (
                  currentUser &&
                  (currentUser.email === emp.email ||
                    currentUser._id === emp._id ||
                    currentUser.id === emp.id ||
                    currentUser.name?.toLowerCase() === emp.name?.toLowerCase()) && (
                    <button
                      onClick={() => handleOpenPhotoOnlyModal(emp)}
                      className="px-3 py-2 bg-blue-50 hover:bg-primary hover:text-white text-primary text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                      title="Ganti foto profil saya"
                    >
                      <FaCamera size={11} /> Ganti Foto
                    </button>
                  )
                )}
              </div>
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
                    src={getAvatarUrl(selectedEmployee)}
                    alt={selectedEmployee.name}
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedEmployee.name || "U")}&background=3b82f6&color=fff&bold=true`;
                    }}
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-primary/20 bg-gray-50"
                  />
                  <div>
                    <h3 className="font-bold text-base text-gray-800">{formatName(selectedEmployee.name)}</h3>
                    <p className="text-xs text-primary font-medium">{selectedEmployee.role}</p>
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
                    <span className="font-semibold text-gray-700 break-all">{selectedEmployee.email}</span>
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
                      <span className="font-bold text-green-600">Level {selectedEmployee.stats?.kpiLevel ?? 4} (Sangat Baik)</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-600">Akumulasi Sprint Point (SP)</span>
                      <span className="font-bold text-accent">{selectedEmployee.stats?.sprintPoints ?? 0} SP</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-600">On Time Delivery (Fitur Tepat Waktu)</span>
                      <span className="font-bold text-gray-800">{selectedEmployee.stats?.onTimeRate ?? "100%"}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-600">SLA Ticket Bug Resolution</span>
                      <span className="font-bold text-gray-800">{selectedEmployee.stats?.slaBugRate ?? "100%"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                {isHR ? (
                  <button
                    onClick={() => {
                      const empToEdit = selectedEmployee;
                      setSelectedEmployee(null);
                      handleOpenEditModal(empToEdit);
                    }}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <FaEdit size={11} /> Ubah Role & Divisi
                  </button>
                ) : currentUser &&
                  (currentUser.email === selectedEmployee.email ||
                    currentUser._id === selectedEmployee._id ||
                    currentUser.id === selectedEmployee.id ||
                    currentUser.name?.toLowerCase() === selectedEmployee.name?.toLowerCase()) ? (
                  <button
                    onClick={() => {
                      const empToEdit = selectedEmployee;
                      setSelectedEmployee(null);
                      handleOpenPhotoOnlyModal(empToEdit);
                    }}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <FaCamera size={11} /> Ganti Foto Saya
                  </button>
                ) : (
                  <div />
                )}
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
                  onClick={() => {
                    setIsModalOpen(false);
                    setAvatarError("");
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleCreateEmployee} className="mt-4 flex flex-col gap-3.5 text-xs">
                {/* Upload Foto Profil (JPG, JPEG, PNG) */}
                <div className="flex flex-col gap-1.5 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                  <label className="font-semibold text-gray-700">Foto Profil Karyawan (Opsional)</label>
                  <div className="flex items-center gap-3.5">
                    <img
                      src={
                        newEmployee.avatar ||
                        (newEmployee.name
                          ? `https://ui-avatars.com/api/?name=${encodeURIComponent(newEmployee.name)}&background=3b82f6&color=fff&bold=true`
                          : "https://ui-avatars.com/api/?name=User&background=3b82f6&color=fff&bold=true")
                      }
                      alt="Preview"
                      className="w-13 h-13 rounded-2xl object-cover ring-2 ring-primary/20 shrink-0 bg-white"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 shadow-2xs">
                          <FaCamera size={11} className="text-primary" /> Pilih Foto
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                            onChange={(e) => handleAvatarChange(e, false)}
                            className="hidden"
                          />
                        </label>
                        {newEmployee.avatar && (
                          <button
                            type="button"
                            onClick={() => setNewEmployee((prev) => ({ ...prev, avatar: "" }))}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Hapus foto"
                          >
                            <FaTrashAlt size={12} />
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Format: <b>JPG, JPEG, PNG</b> (Maks. 2MB)</p>
                    </div>
                  </div>
                  {avatarError && (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-red-600 bg-red-50 p-2 rounded-xl border border-red-200">
                      <FaExclamationCircle className="shrink-0" />
                      <span>{avatarError}</span>
                    </div>
                  )}
                </div>

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
                    <option value="DevOps Engineer">DevOps Engineer</option>
                    <option value="Mobile Developer">Mobile Developer</option>
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
                    onClick={() => {
                      setIsModalOpen(false);
                      setAvatarError("");
                    }}
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

        {/* MODAL 3: Edit Profil & Role Karyawan (HR: Semua Field | Karyawan: Foto Saja) */}
        {editingEmployee && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary-light text-primary flex items-center justify-center">
                    {isPhotoOnlyMode ? <FaCamera size={16} /> : <FaEdit size={16} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-gray-800">
                      {isPhotoOnlyMode ? "Ubah Foto Profil Saya" : "Edit Profil & Role"}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {isPhotoOnlyMode
                        ? "Upload foto profil baru Anda (.jpg, .jpeg, .png)"
                        : "Ubah posisi kerja dan divisi karyawan"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEditingEmployee(null);
                    setAvatarError("");
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleUpdateEmployee} className="mt-4 flex flex-col gap-3.5 text-xs">
                {/* Upload Foto Profil */}
                <div className="flex flex-col gap-1.5 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                  <label className="font-semibold text-gray-700">Foto Profil</label>
                  <div className="flex items-center gap-3.5">
                    <img
                      src={
                        editFormData.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(editFormData.name || "User")}&background=3b82f6&color=fff&bold=true`
                      }
                      alt="Preview"
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-primary/20 shrink-0 bg-white"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 shadow-2xs">
                          <FaCamera size={11} className="text-primary" /> Pilih Foto Baru
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                            onChange={(e) => handleAvatarChange(e, true)}
                            className="hidden"
                          />
                        </label>
                        {editFormData.avatar && (
                          <button
                            type="button"
                            onClick={() => setEditFormData((prev) => ({ ...prev, avatar: "" }))}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Hapus foto (gunakan avatar inisial)"
                          >
                            <FaTrashAlt size={12} />
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">Format: <b>JPG, JPEG, PNG</b> (Maks. 2MB)</p>
                    </div>
                  </div>
                  {avatarError && (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-red-600 bg-red-50 p-2 rounded-xl border border-red-200">
                      <FaExclamationCircle className="shrink-0" />
                      <span>{avatarError}</span>
                    </div>
                  )}
                </div>

                {/* Jika Mode Karyawan (Foto Saja): Tampilkan info read-only */}
                {isPhotoOnlyMode ? (
                  <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Nama:</span>
                      <span className="font-bold text-gray-800">{editFormData.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Email:</span>
                      <span className="font-semibold text-gray-700">{editFormData.email}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Jabatan & Divisi:</span>
                      <span className="font-semibold text-primary">{editFormData.role} • {editFormData.department}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 italic pt-1 border-t border-gray-200/60 mt-1">
                      *Perubahan nama, jabatan, dan divisi hanya dapat dilakukan oleh HR.
                    </p>
                  </div>
                ) : (
                  /* Jika Mode HR: Semua field dapat diedit */
                  <>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">
                        Nama Lengkap <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
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
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Posisi / Role Kerja</label>
                      <select
                        value={editFormData.role}
                        onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer font-medium"
                      >
                        <option value="Frontend Developer">Frontend Developer</option>
                        <option value="Backend Developer">Backend Developer</option>
                        <option value="UI/UX Designer">UI/UX Designer</option>
                        <option value="Quality Assurance (QA)">Quality Assurance (QA)</option>
                        <option value="Product Owner (PO)">Product Owner (PO)</option>
                        <option value="DevOps Engineer">DevOps Engineer</option>
                        <option value="Mobile Developer">Mobile Developer</option>
                        <option value="Engineering Manager">Engineering Manager</option>
                        <option value="HR / People Operations">HR / People Operations</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Divisi / Departemen</label>
                      <select
                        value={editFormData.department}
                        onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer font-medium"
                      >
                        <option value="Engineering">Engineering</option>
                        <option value="Product & Design">Product & Design</option>
                        <option value="Quality Control">Quality Control</option>
                        <option value="Product Management">Product Management</option>
                        <option value="Human Resources">Human Resources</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEmployee(null);
                      setAvatarError("");
                    }}
                    className="px-4 py-2 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl font-semibold bg-primary hover:bg-primary-dark text-white shadow-sm cursor-pointer"
                  >
                    {isPhotoOnlyMode ? "Simpan Foto Profil" : "Simpan Perubahan"}
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
