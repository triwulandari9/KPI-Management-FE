import { useState, useEffect, useCallback } from "react";
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
import LinearLoading from "../components/LinearLoading";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { employeeService } from "../services/employeeService";
import { taskService } from "../services/taskService";
import { authService } from "../services/authService";

export default function Employees() {
  const { collapsed } = useSidebar();
  const { currentUser, updateUserProfile } = useAuth();
  const isHR = currentUser?.role?.toUpperCase() === "HR";

  const [employees, setEmployees] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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

  // Helper pencocokan task terhadap karyawan secara akurat
  const isTaskForEmployee = (task, emp) => {
    if (!task || !emp) return false;
    const empId = String(emp._id || emp.id || "").toLowerCase().trim();
    const empEmail = String(emp.email || "").toLowerCase().trim();
    const empName = String(emp.name || "").toLowerCase().trim();
    const empUsername = String(emp.username || "").toLowerCase().trim();

    const matchVal = (val) => {
      if (!val) return false;
      if (typeof val === "object") {
        const vId = String(val._id || val.id || "").toLowerCase().trim();
        const vEmail = String(val.email || "").toLowerCase().trim();
        const vName = String(val.name || val.username || "").toLowerCase().trim();
        if (empId && vId && empId === vId) return true;
        if (empEmail && vEmail && empEmail === vEmail) return true;
        if (empName && vName && (empName === vName || empName.includes(vName) || vName.includes(empName))) return true;
        if (empUsername && vName && empUsername === vName) return true;
        return false;
      }
      const strVal = String(val).toLowerCase().trim();
      if (!strVal) return false;
      if (empId && strVal === empId) return true;
      if (empEmail && strVal === empEmail) return true;
      if (empName && (strVal === empName || strVal.includes(empName) || empName.includes(strVal))) return true;
      if (empUsername && strVal === empUsername) return true;
      return false;
    };

    return (
      matchVal(task.assignee) ||
      matchVal(task.employee) ||
      matchVal(task.assigneeId) ||
      matchVal(task.employeeId) ||
      matchVal(task.assigneeName) ||
      matchVal(task.assignedTo)
    );
  };

  // Fungsi hitung metrik real SP per karyawan dari data tasks BE
  const computeEmployeeStats = (emp, allTasks = []) => {
    const empTasks = allTasks.filter((t) => isTaskForEmployee(t, emp));
    const totalTasks = empTasks.length;
    const realSP = empTasks.reduce(
      (sum, t) => sum + (Number(t.point || t.points || t.sp || t.sprintPoint || 0) || 0),
      0
    );

    const doneTasks = empTasks.filter((t) => t.status === "Done");
    const onTimeRate = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;

    // Tentukan Level berdasarkan SP riil dari BE
    let kpiLevel = 1;
    let predicate = "Perlu Bimbingan";
    if (realSP >= 80) {
      kpiLevel = 4;
      predicate = "Sangat Baik";
    } else if (realSP >= 40) {
      kpiLevel = 3;
      predicate = "Baik";
    } else if (realSP >= 15) {
      kpiLevel = 2;
      predicate = "Cukup";
    } else if (realSP > 0) {
      kpiLevel = 2;
      predicate = "Cukup";
    } else {
      kpiLevel = 1;
      predicate = "Belum Ada Task";
    }

    return {
      sprintPoints: realSP,
      totalTasks: totalTasks,
      onTimeRate: totalTasks > 0 ? `${onTimeRate}%` : "0%",
      kpiLevel: kpiLevel,
      predicate: predicate,
      slaBugRate: "100%",
    };
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [empData, taskData] = await Promise.all([
        employeeService.getEmployees({ _t: Date.now() }).catch(() => []),
        taskService.getTasks({ _t: Date.now() }).catch(() => []),
      ]);

      const rawEmployees = Array.isArray(empData) ? empData : empData?.data || [];
      const rawTasks = Array.isArray(taskData) ? taskData : taskData?.data || [];

      setTasks(rawTasks);

      const enrichedEmployees = rawEmployees.map((emp) => {
        const stats = computeEmployeeStats(emp, rawTasks);

        // Sinkronkan foto avatar jika currentUser punya avatar terbaru
        const isSelf =
          currentUser &&
          (currentUser.email === emp.email ||
            currentUser._id === (emp._id || emp.id) ||
            currentUser.id === (emp._id || emp.id) ||
            currentUser.name?.toLowerCase() === emp.name?.toLowerCase());

        return {
          ...emp,
          avatar: isSelf && currentUser?.avatar ? currentUser.avatar : emp.avatar,
          stats: stats,
        };
      });

      setEmployees(enrichedEmployees);
    } catch (err) {
      console.error("Gagal memuat data karyawan & tasks:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for avatar updates to refresh employee list instantly (custom event)
  useEffect(() => {
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
      window.removeEventListener("user_avatar_updated", handleAvatarUpdated);
    };
  }, [currentUser]);

  // Cross‑tab avatar sync via localStorage
  useEffect(() => {
    const handleStorage = async (e) => {
      if (e.key === "kpi_avatar_updated" && e.newValue) {
        loadData();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [loadData]);

  // Format string Nama agar huruf pertama kapital
  const formatName = (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
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

  // Fungsi Kompresi Foto agar Base64 berukuran kecil (~20-40KB) dan aman di database
  const compressImage = (file, maxWidth = 400, maxHeight = 400, quality = 0.7) => {
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
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Handle upload & validasi foto avatar (Modal Tambah & Modal Edit)
  const handleAvatarChange = async (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!validTypes.includes(file.type)) {
      setAvatarError("Format file harus JPG, JPEG, atau PNG.");
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setAvatarError("Ukuran foto maksimal 2MB.");
      return;
    }

    setAvatarError("");
    try {
      const base64Url = await compressImage(file, 400, 400, 0.7);
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
    if (!newEmployee.name || !newEmployee.email) return;

    const payload = {
      ...newEmployee,
      name: formatName(newEmployee.name),
      avatar:
        newEmployee.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(newEmployee.name)}&background=3b82f6&color=fff&bold=true`,
    };

    try {
      const created = await employeeService.createEmployee(payload);
      const createdStats = computeEmployeeStats(created || payload, tasks);
      const newEmpWithStats = { ...(created || payload), stats: createdStats };

      setEmployees((prev) => [newEmpWithStats, ...prev]);
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
      const localEmp = {
        ...payload,
        id: `EMP-${Date.now().toString().slice(-3)}`,
        stats: computeEmployeeStats(payload, tasks),
      };
      setEmployees((prev) => [localEmp, ...prev]);
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
    const isSelf =
      currentUser &&
      (currentUser.email === editingEmployee.email ||
        currentUser._id === empId ||
        currentUser.id === empId ||
        currentUser.name?.toLowerCase() === editingEmployee.name?.toLowerCase());

    try {
      let updated = null;
      let lastError = null;

      try {
        updated = await employeeService.updateEmployee(empId, editFormData);
      } catch (err1) {
        lastError = err1;
        const currentUserId = currentUser?._id || currentUser?.id;
        if (isSelf && currentUserId && currentUserId !== empId) {
          try {
            updated = await employeeService.updateEmployee(currentUserId, editFormData);
          } catch (err2) {
            lastError = err2;
          }
        }
        if (!updated && isSelf) {
          try {
            updated = await authService.updateProfile(editFormData);
          } catch (err3) {
            lastError = err3;
          }
        }
      }

      if (!updated && lastError) {
        throw lastError;
      }

      setEmployees((prev) =>
        prev.map((emp) => {
          if ((emp._id || emp.id) === empId) {
            const merged = { ...emp, ...editFormData, ...(updated || {}) };
            return { ...merged, stats: computeEmployeeStats(merged, tasks) };
          }
          return emp;
        })
      );
      if (selectedEmployee && (selectedEmployee._id || selectedEmployee.id) === empId) {
        setSelectedEmployee((prev) => {
          const merged = { ...prev, ...editFormData, ...(updated || {}) };
          return { ...merged, stats: computeEmployeeStats(merged, tasks) };
        });
      }
      if (isSelf) {
        updateUserProfile?.({ avatar: editFormData.avatar });
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
      setAvatarError(err.message || "Gagal menyimpan data karyawan ke database server.");
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    return selectedRole === "All" || emp.role?.includes(selectedRole) || emp.department === selectedRole;
  });

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

        {/* State Loading Linear Data Karyawan */}
        {isLoading && (
          <div className="mb-4">
            <LinearLoading message="Memuat daftar karyawan dan menghitung Sprint Points real dari server..." />
          </div>
        )}

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
                        : emp.stats?.kpiLevel === 2
                        ? "bg-amber-50 text-amber-600 border-amber-200"
                        : "bg-gray-50 text-gray-600 border-gray-200"
                    }`}
                  >
                    <FaAward size={10} /> Level {emp.stats?.kpiLevel ?? 1}
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

                {/* Performance / KPI Stats Mini Bar (REAL SP & REAL TASKS) */}
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
                    <p className="text-sm font-bold text-green-600">{emp.stats?.onTimeRate ?? "0%"}</p>
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
                    <FaChartLine className="text-primary" /> Rincian Metrik KPI Real-Time
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-600">Pencapaian Level KPI</span>
                      <span className="font-bold text-green-600">
                        Level {selectedEmployee.stats?.kpiLevel ?? 1} ({selectedEmployee.stats?.predicate || "Cukup"})
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-600">Akumulasi Real Sprint Point (SP)</span>
                      <span className="font-bold text-accent">{selectedEmployee.stats?.sprintPoints ?? 0} SP</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-600">Total Task Ditugaskan</span>
                      <span className="font-bold text-gray-800">{selectedEmployee.stats?.totalTasks ?? 0} Task</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="text-gray-600">On Time Delivery (Penyelesaian Task)</span>
                      <span className="font-bold text-gray-800">{selectedEmployee.stats?.onTimeRate ?? "0%"}</span>
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
                      <span className="text-[10px] text-gray-400 block mt-1">Maksimal 2MB (JPG, PNG)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Tri Wulandari"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Email Resmi</label>
                  <input
                    type="email"
                    required
                    placeholder="nama@perusahaan.com"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Role / Jabatan</label>
                    <select
                      value={newEmployee.role}
                      onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-medium"
                    >
                      <option value="Frontend Developer">Frontend Dev</option>
                      <option value="Backend Developer">Backend Dev</option>
                      <option value="UI/UX Designer">UI/UX Designer</option>
                      <option value="Quality Assurance">QA Engineer</option>
                      <option value="Product Owner">Product Owner</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Divisi</label>
                    <select
                      value={newEmployee.department}
                      onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-medium"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Product">Product</option>
                      <option value="Design">Design</option>
                      <option value="Quality Assurance">Quality Assurance</option>
                    </select>
                  </div>
                </div>

                {avatarError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2 border border-red-100">
                    <FaExclamationCircle className="shrink-0" />
                    <span>{avatarError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setAvatarError("");
                    }}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 font-semibold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    Simpan Karyawan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: Edit Karyawan & Ganti Foto */}
        {editingEmployee && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">
                    {isPhotoOnlyMode ? "Ganti Foto Profil" : "Edit Informasi Karyawan"}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {isPhotoOnlyMode
                      ? "Perbarui foto akun Anda agar tampil di seluruh sistem"
                      : "Perbarui jabatan, divisi, nama, dan foto profil"}
                  </p>
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
                {/* Upload / Ganti Foto Profil */}
                <div className="flex flex-col gap-1.5 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                  <label className="font-semibold text-gray-700">Foto Profil</label>
                  <div className="flex items-center gap-3.5">
                    <img
                      src={
                        editFormData.avatar ||
                        (editFormData.name
                          ? `https://ui-avatars.com/api/?name=${encodeURIComponent(editFormData.name)}&background=3b82f6&color=fff&bold=true`
                          : "https://ui-avatars.com/api/?name=User&background=3b82f6&color=fff&bold=true")
                      }
                      alt="Preview"
                      className="w-13 h-13 rounded-2xl object-cover ring-2 ring-primary/20 shrink-0 bg-white"
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
                            title="Hapus foto profil"
                          >
                            <FaTrashAlt size={12} />
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 block mt-1">Format JPG/PNG, Maksimal 2MB</span>
                    </div>
                  </div>
                </div>

                {!isPhotoOnlyMode ? (
                  <>
                    <div>
                      <label className="font-semibold text-gray-700 block mb-1">Nama Lengkap</label>
                      <input
                        type="text"
                        required
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-semibold text-gray-800"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-gray-700 block mb-1">Email Resmi</label>
                      <input
                        type="email"
                        required
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-gray-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-gray-700 block mb-1">Role / Posisi</label>
                        <select
                          value={editFormData.role}
                          onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-medium"
                        >
                          <option value="Frontend Developer">Frontend Dev</option>
                          <option value="Backend Developer">Backend Dev</option>
                          <option value="UI/UX Designer">UI/UX Designer</option>
                          <option value="Quality Assurance">QA Engineer</option>
                          <option value="Product Owner">Product Owner</option>
                        </select>
                      </div>
                      <div>
                        <label className="font-semibold text-gray-700 block mb-1">Divisi</label>
                        <select
                          value={editFormData.department}
                          onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-medium"
                        >
                          <option value="Engineering">Engineering</option>
                          <option value="Product">Product</option>
                          <option value="Design">Design</option>
                          <option value="Quality Assurance">Quality Assurance</option>
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs text-blue-800">
                    <p className="font-semibold mb-0.5">Akun Anda: {editFormData.name}</p>
                    <p className="text-[11px] text-blue-600">
                      Anda sedang mengganti foto profil untuk akun ini. Foto akan disinkronkan ke seluruh sistem dan navigasi atas.
                    </p>
                  </div>
                )}

                {avatarError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex items-center gap-2 border border-red-100">
                    <FaExclamationCircle className="shrink-0" />
                    <span>{avatarError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEmployee(null);
                      setAvatarError("");
                    }}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 font-semibold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    Simpan Perubahan
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
