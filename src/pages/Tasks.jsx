import { useState, useEffect } from "react";
import {
  FaPlus,
  FaFilter,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimes,
  FaThLarge,
  FaListUl,
  FaExclamationTriangle,
  FaBug,
  FaCode,
  FaTools,
  FaRedoAlt,
  FaUserCircle,
  FaStar,
  FaEdit,
  FaTrashAlt,
  FaLightbulb,
  FaChevronDown,
  FaInbox,
  FaShieldAlt,
  FaUserCheck,
} from "react-icons/fa";

import Header from "../layouts/Header";
import Sidebar from "../layouts/Sidebar";
import PageHeader from "../layouts/PageHeader";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { taskService } from "../services/taskService";
import { employeeService } from "../services/employeeService";

// Nilai Poin Standar Sesuai Catatan Mentor / ClickUp
const SP_OPTIONS = [1, 2, 3, 4, 5, 8, 12, 16, 18, 20, 28, 241];

// Status alur kerja ala ClickUp
const STATUSES = [
  { id: "Backlog", label: "Backlog", color: "bg-slate-50 text-slate-700 border-slate-200", dot: "bg-slate-400", borderTop: "border-t-slate-400" },
  { id: "Ready", label: "Ready", color: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500", borderTop: "border-t-sky-500" },
  { id: "On Progress", label: "On Progress", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", borderTop: "border-t-amber-500" },
  { id: "Code Review", label: "Code Review", color: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500", borderTop: "border-t-purple-500" },
  { id: "QA", label: "QA Review", color: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500", borderTop: "border-t-indigo-500" },
  { id: "Done", label: "Done", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", borderTop: "border-t-emerald-500" },
];

const CATEGORY_BADGES = {
  Feature: { label: "Feature", bg: "bg-blue-50 text-blue-700 border-blue-200/80", icon: <FaCode size={11} /> },
  "Bug Ticket": { label: "Bug Ticket", bg: "bg-rose-50 text-rose-700 border-rose-200/80", icon: <FaBug size={11} /> },
  "Tech Debt": { label: "Tech Debt", bg: "bg-orange-50 text-orange-700 border-orange-200/80", icon: <FaTools size={11} /> },
  Improvement: { label: "Improvement", bg: "bg-emerald-50 text-emerald-700 border-emerald-200/80", icon: <FaLightbulb size={11} /> },
};

export default function Tasks() {
  const { collapsed } = useSidebar();
  const { currentUser } = useAuth();

  // Role & Permission Checks
  const userRole = (currentUser?.role || "").toUpperCase();
  const userPosition = (currentUser?.position || "").toLowerCase();
  const isPO =
    userRole === "PO" ||
    userPosition.includes("product owner") ||
    userPosition.includes("po") ||
    (currentUser?.role || "").toLowerCase().includes("product owner");
  const isHR = userRole === "HR";
  const isRegularEmployee = !isPO && !isHR;
  const canSetPoint = isPO || isHR;

  // Normalisasi nama dari backend (bisa ALL CAPS atau object) menjadi Title Case yang aman
  const formatName = (input) => {
    if (!input) return "";
    let str = "";
    if (typeof input === "string") {
      str = input;
    } else if (typeof input === "object") {
      str = input.name || input.username || input.email || "";
    } else {
      str = String(input);
    }
    if (!str || typeof str !== "string") return "";
    return str
      .toLowerCase()
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  const currentUserName = formatName(currentUser?.name || currentUser?.username || "Saya");
  const currentUserId = currentUser?._id || currentUser?.id;

  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [viewMode, setViewMode] = useState("kanban"); // "kanban" | "list"
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTaskForPoint, setSelectedTaskForPoint] = useState(null);
  const [inputPoint, setInputPoint] = useState(5);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // State Form Tambah Task Baru
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    category: "Feature",
    assignee: currentUserName,
    start: "",
    deadline: "",
    sla: "48 Jam",
    status: "Backlog",
  });

  // Fungsi refresh / get task dari backend secara langsung
  const fetchTasks = async () => {
    try {
      const tasksData = await taskService.getTasks();
      if (tasksData && Array.isArray(tasksData)) {
        setTasks(tasksData);
        return tasksData;
      }
    } catch (err) {
      console.error("Gagal refresh data tasks:", err);
    }
    return null;
  };

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [tasksData, employeesData] = await Promise.all([
          taskService.getTasks().catch(() => []),
          employeeService.getEmployees().catch(() => []),
        ]);
        if (isMounted) {
          if (tasksData && Array.isArray(tasksData)) {
            setTasks(tasksData);
          }
          if (employeesData && Array.isArray(employeesData) && employeesData.length > 0) {
            setEmployees(employeesData);
          }
        }
      } catch (err) {
        console.error("Gagal load data tasks & employees:", err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update default assignee saat modal dibuka atau user berganti
  useEffect(() => {
    if (currentUser) {
      setNewTask((prev) => ({
        ...prev,
        assignee: formatName(currentUser?.name || currentUser?.username || "Saya"),
      }));
    }
  }, [currentUser]);

  // -------------------------------------------------------------
  // PRIVACY & VISIBILITY RULES (Private Task Access)
  // -------------------------------------------------------------
  // 1. Pembuat Task (assignedBy / creator) dapat melihat task yang dibuatnya.
  // 2. Penerima Task (employee / assignee) dapat melihat task yang di-assign padanya.
  // 3. User TIDAK BISA melihat task milik orang lain di luar kedua kondisi di atas.
  const isTaskCreator = (task) => {
    if (!task || !currentUser) return false;
    const cId = currentUser._id || currentUser.id;
    const cEmail = (currentUser.email || "").toLowerCase();
    const cName = (currentUser.name || "").toLowerCase();
    const cUsername = (currentUser.username || "").toLowerCase();

    const assignedBy =
      task.assignedBy ||
      task.assigned_by ||
      task.creator ||
      task.createdBy ||
      task.creatorId ||
      task.creatorName;

    if (!assignedBy) return false;

    if (typeof assignedBy === "object") {
      const creatorId = assignedBy._id || assignedBy.id;
      const creatorEmail = (assignedBy.email || "").toLowerCase();
      const creatorName = (assignedBy.name || assignedBy.username || "").toLowerCase();
      return (
        (cId && creatorId && String(cId) === String(creatorId)) ||
        (cEmail && creatorEmail && cEmail === creatorEmail) ||
        (cName && creatorName && (cName === creatorName || cName.includes(creatorName) || creatorName.includes(cName))) ||
        (cUsername && creatorName && cUsername === creatorName)
      );
    }

    const assignedByStr = String(assignedBy).toLowerCase().trim();
    return (
      (cId && String(cId).toLowerCase() === assignedByStr) ||
      (cEmail && cEmail === assignedByStr) ||
      (cName && (cName === assignedByStr || cName.includes(assignedByStr) || assignedByStr.includes(cName))) ||
      (cUsername && cUsername === assignedByStr)
    );
  };

  const isTaskAssignee = (task) => {
    if (!task || !currentUser) return false;
    const cId = currentUser._id || currentUser.id;
    const cEmail = (currentUser.email || "").toLowerCase();
    const cName = (currentUser.name || "").toLowerCase();
    const cUsername = (currentUser.username || "").toLowerCase();

    const assignee =
      task.assignee ||
      task.employee ||
      task.assigneeId ||
      task.employeeId ||
      task.assigneeName;

    if (!assignee) return false;

    if (typeof assignee === "object") {
      const empId = assignee._id || assignee.id;
      const empEmail = (assignee.email || "").toLowerCase();
      const empName = (assignee.name || assignee.username || "").toLowerCase();
      return (
        (cId && empId && String(cId) === String(empId)) ||
        (cEmail && empEmail && cEmail === empEmail) ||
        (cName && empName && (cName === empName || cName.includes(empName) || empName.includes(cName))) ||
        (cUsername && empName && cUsername === empName)
      );
    }

    const assigneeStr = String(assignee).toLowerCase().trim();
    return (
      (cId && String(cId).toLowerCase() === assigneeStr) ||
      (cEmail && cEmail === assigneeStr) ||
      (cName && (cName === assigneeStr || cName.includes(assigneeStr) || assigneeStr.includes(cName))) ||
      (cUsername && cUsername === assigneeStr)
    );
  };

  // Rule Utama: User hanya dapat melihat task jika ia adalah Pembuat ATAU Penerima
  const userCanSee = (task) => {
    return isTaskCreator(task) || isTaskAssignee(task);
  };

  // Rule Manajemen Task (Edit & Hapus):
  // Fitur edit dan hapus task HANYA muncul untuk si pembuat task (atau PO/HR)
  // Penerima task yang bukan pembuat hanya dapat melihat dan memindahkan alur task
  const canModifyTask = (task) => {
    if (!task) return false;
    return isTaskCreator(task) || isPO || isHR;
  };

  const filteredTasks = tasks
    .filter(userCanSee)
    .filter((task) => selectedCategory === "All" || task.category === selectedCategory);

  // -------------------------------------------------------------
  // PILIHAN ASSIGNEE: Mengambil semua data employee yang ada
  // -------------------------------------------------------------
  const getAssigneeOptions = () => {
    const currentName = formatName(currentUser?.name || "Saya");
    const currentId = currentUser?._id || currentUser?.id;

    if (employees && employees.length > 0) {
      return employees.map((emp) => {
        const formatted = formatName(emp.name || emp.username);
        const roleName = emp.position || emp.role || "Karyawan";
        const isMe =
          (emp.email && emp.email === currentUser?.email) ||
          (emp._id && (emp._id === currentId || emp._id === currentUser?.id)) ||
          (emp.id && (emp.id === currentId || emp.id === currentUser?.id)) ||
          formatted.toLowerCase() === currentName.toLowerCase();
        return {
          value: formatted,
          label: isMe ? `${formatted} (Saya)` : `${formatted} (${roleName})`,
          empId: emp._id || emp.id,
        };
      });
    }

    // Fallback jika data employees belum selesai dimuat dari backend
    return [
      { value: currentName, label: `${currentName} (Saya)`, empId: currentId },
      { value: "Sari", label: "Sari (Frontend Developer)", empId: "sari" },
      { value: "Musa", label: "Musa (Backend Developer)", empId: "musa" },
      { value: "Mitha", label: "Mitha (UI/UX Designer)", empId: "mitha" },
      { value: "Admin HR", label: "Admin HR (HR)", empId: "hr" },
    ];
  };

  const handleSavePoint = async (e) => {
    e.preventDefault();
    if (!selectedTaskForPoint) return;
    const targetId = selectedTaskForPoint._id || selectedTaskForPoint.id;

    try {
      await taskService.updateTaskPoint(targetId, inputPoint);
      const refreshed = await fetchTasks();
      if (!refreshed) {
        setTasks((prev) =>
          prev.map((t) =>
            (t._id || t.id) === targetId ? { ...t, point: Number(inputPoint) } : t
          )
        );
      }
    } catch (err) {
      console.error("Gagal menyimpan poin:", err);
      setTasks((prev) =>
        prev.map((t) =>
          (t._id || t.id) === targetId ? { ...t, point: Number(inputPoint) } : t
        )
      );
    } finally {
      setSelectedTaskForPoint(null);
    }
  };

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData("text/plain", taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnter = (colId) => {
    setDragOverColumn(colId);
  };

  const handleDragLeave = (colId) => {
    if (dragOverColumn === colId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (taskId) {
      handleStatusChange(taskId, targetStatus);
    }
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  // Simpan Task Baru: Post -> Refresh Tasks via API -> Close Modal
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    setIsSubmitting(true);
    const currentName = formatName(currentUser?.name || currentUser?.username || "User");
    const currentId = currentUser?._id || currentUser?.id;

    // Cari target assignee ID jika tersedia di daftar karyawan
    const matchedAssignee = employees.find(
      (emp) =>
        formatName(emp.name || emp.username).toLowerCase() === newTask.assignee.toLowerCase() ||
        (emp._id && String(emp._id) === String(newTask.assignee)) ||
        (emp.id && String(emp.id) === String(newTask.assignee))
    );

    const taskPayload = {
      ...newTask,
      title: newTask.title.trim(),
      description: newTask.description?.trim() || "",
      assignee: newTask.assignee || currentName,
      employee: matchedAssignee?._id || matchedAssignee?.id || newTask.assignee || currentName,
      assigneeId: matchedAssignee?._id || matchedAssignee?.id,
      assignedBy: currentName,
      creator: currentId,
      creatorName: currentName,
      creatorEmail: currentUser?.email,
      start: newTask.start || new Date().toISOString().split("T")[0],
    };

    try {
      const created = await taskService.createTask(taskPayload);
      // Pas simpan langsung refresh api task, setelah post task langsung get task baru close
      const refreshed = await fetchTasks();
      if (!refreshed) {
        setTasks((prev) => [
          created || { ...taskPayload, id: `TASK-${Date.now().toString().slice(-4)}` },
          ...prev,
        ]);
      }
      setIsModalOpen(false);
      setNewTask({
        title: "",
        description: "",
        category: "Feature",
        assignee: currentName,
        start: "",
        deadline: "",
        sla: "48 Jam",
        status: "Backlog",
      });
    } catch (err) {
      console.error("Gagal membuat task baru:", err);
      // Fallback local jika server offline
      const localTask = {
        ...taskPayload,
        id: `TASK-${Date.now().toString().slice(-4)}`,
      };
      setTasks((prev) => [localTask, ...prev]);
      setIsModalOpen(false);
      setNewTask({
        title: "",
        description: "",
        category: "Feature",
        assignee: currentName,
        start: "",
        deadline: "",
        sla: "48 Jam",
        status: "Backlog",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Buka Modal Edit Task
  const handleOpenEditModal = (task) => {
    let assigneeVal = "";
    if (task.assignee && typeof task.assignee === "object") {
      assigneeVal = formatName(task.assignee.name || task.assignee.username);
    } else if (typeof task.assignee === "string") {
      assigneeVal = formatName(task.assignee);
    } else if (task.employee) {
      if (typeof task.employee === "object") {
        assigneeVal = formatName(task.employee.name || task.employee.username);
      } else {
        assigneeVal = formatName(task.employee);
      }
    }

    setEditingTask({
      id: task._id || task.id,
      _id: task._id || task.id,
      title: task.title || "",
      description: task.description || "",
      category: task.category || "Feature",
      assignee: assigneeVal || currentUserName,
      status: task.status || "Backlog",
      deadline: task.deadline ? (task.deadline.includes("T") ? task.deadline.split("T")[0] : task.deadline) : "",
      sla: task.sla || "48 Jam",
      point: task.point ?? 5,
      assignedBy: task.assignedBy || task.creatorName || currentUserName,
      start: task.start || "",
    });
    setIsEditModalOpen(true);
  };

  // Simpan Perubahan Edit Task: Put -> Refresh Tasks via API -> Close Modal
  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editingTask || !editingTask.title.trim()) return;

    setIsSubmitting(true);
    const taskId = editingTask._id || editingTask.id;

    const matchedAssignee = employees.find(
      (emp) =>
        formatName(emp.name || emp.username).toLowerCase() === editingTask.assignee.toLowerCase() ||
        (emp._id && String(emp._id) === String(editingTask.assignee)) ||
        (emp.id && String(emp.id) === String(editingTask.assignee))
    );

    const taskPayload = {
      ...editingTask,
      title: editingTask.title.trim(),
      description: editingTask.description?.trim() || "",
      assignee: editingTask.assignee,
      employee: matchedAssignee?._id || matchedAssignee?.id || editingTask.assignee,
      assigneeId: matchedAssignee?._id || matchedAssignee?.id,
      point: Number(editingTask.point) || 0,
    };

    try {
      await taskService.updateTask(taskId, taskPayload);
      // Pas simpan langsung refresh api task baru close
      const refreshed = await fetchTasks();
      if (!refreshed) {
        setTasks((prev) =>
          prev.map((t) => ((t._id || t.id) === taskId ? { ...t, ...taskPayload } : t))
        );
      }
      setIsEditModalOpen(false);
      setEditingTask(null);
    } catch (err) {
      console.error("Gagal update task:", err);
      // Fallback local update jika offline/error
      setTasks((prev) =>
        prev.map((t) => ((t._id || t.id) === taskId ? { ...t, ...taskPayload } : t))
      );
      setIsEditModalOpen(false);
      setEditingTask(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hapus Task: Panggil API delete -> refresh task dari API -> tutup modal konfirmasi
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    const taskId = taskToDelete._id || taskToDelete.id;
    setIsDeleting(true);

    try {
      await taskService.deleteTask(taskId);
      const refreshed = await fetchTasks();
      if (!refreshed) {
        setTasks((prev) => prev.filter((t) => (t._id || t.id) !== taskId));
      }
      setTaskToDelete(null);
      if (editingTask && (editingTask._id || editingTask.id) === taskId) {
        setIsEditModalOpen(false);
        setEditingTask(null);
      }
    } catch (err) {
      console.error("Gagal menghapus task:", err);
      // Fallback local delete
      setTasks((prev) => prev.filter((t) => (t._id || t.id) !== taskId));
      setTaskToDelete(null);
      if (editingTask && (editingTask._id || editingTask.id) === taskId) {
        setIsEditModalOpen(false);
        setEditingTask(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateTaskStatus(taskId, newStatus);
      const refreshed = await fetchTasks();
      if (!refreshed) {
        setTasks((prev) =>
          prev.map((t) => ((t._id || t.id) === taskId ? { ...t, status: newStatus } : t))
        );
      }
    } catch (err) {
      console.error("Gagal mengubah status task:", err);
      setTasks((prev) =>
        prev.map((t) => ((t._id || t.id) === taskId ? { ...t, status: newStatus } : t))
      );
    }
  };

  const handleRejectQA = async (taskId) => {
    try {
      await taskService.rejectTaskQA(taskId);
      const refreshed = await fetchTasks();
      if (!refreshed) {
        setTasks((prev) =>
          prev.map((t) =>
            (t._id || t.id) === taskId
              ? {
                ...t,
                status: "On Progress",
                backwardCount: (t.backwardCount || 0) + 1,
              }
              : t
          )
        );
      }
    } catch (err) {
      console.error("Gagal reject QA:", err);
      setTasks((prev) =>
        prev.map((t) =>
          (t._id || t.id) === taskId
            ? {
              ...t,
              status: "On Progress",
              backwardCount: (t.backwardCount || 0) + 1,
            }
            : t
        )
      );
    }
  };

  const handleOpenPointModal = (task) => {
    setSelectedTaskForPoint(task);
    setInputPoint(task.point ?? 5);
  };

  const formatTaskId = (id) => {
    if (!id) return "#TASK";
    const str = String(id);
    if (str.length > 6) {
      return `#${str.slice(-4).toUpperCase()}`;
    }
    return `#${str.toUpperCase()}`;
  };

  const getAssigneeInfo = (assigneeInput) => {
    let nameStr = "";
    let avatarUrl = "";
    let roleStr = "Developer";

    if (assigneeInput && typeof assigneeInput === "object") {
      nameStr = assigneeInput.name || assigneeInput.username || "";
      avatarUrl = assigneeInput.avatar || "";
      roleStr = assigneeInput.position || assigneeInput.role || "Developer";
    } else if (typeof assigneeInput === "string") {
      nameStr = assigneeInput;
    }

    const formatted = formatName(nameStr) || "Unassigned";

    const matchedEmp = employees.find(
      (e) =>
        (e.name && formatName(e.name).toLowerCase() === formatted.toLowerCase()) ||
        (e.username && formatName(e.username).toLowerCase() === formatted.toLowerCase()) ||
        (e.name && e.name.toLowerCase().includes(formatted.toLowerCase())) ||
        (e.username && e.username.toLowerCase().includes(formatted.toLowerCase())) ||
        (e._id && String(e._id) === String(assigneeInput)) ||
        (e.id && String(e.id) === String(assigneeInput))
    );

    return {
      name: formatted,
      avatar:
        avatarUrl ||
        matchedEmp?.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(formatted)}&background=0284c7&color=fff&bold=true&size=64`,
      role: matchedEmp?.position || matchedEmp?.role || roleStr,
    };
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      <Sidebar />

      <main className={`transition-all duration-300 pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 ${collapsed ? "lg:ml-20" : "lg:ml-64"}`}>
        {/* Page Header */}
        <PageHeader title="Task Management" subtitle="Kelola dan pantau alur tugas sprint harian dengan akses privat">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Status Akses / Role Badge */}
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 shadow-2xs">
              <FaShieldAlt className={isPO ? "text-amber-500" : isHR ? "text-purple-500" : "text-primary"} />
              <span>
                Mode: <b>{isPO ? "Product Owner" : isHR ? "HR" : "Karyawan"}</b>
              </span>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer justify-center"
            >
              <FaPlus size={12} /> Tambah Task Baru
            </button>
          </div>
        </PageHeader>

        {/* Banner Penjelasan Hak Akses Privat */}
        <div className="mb-5 p-3.5 bg-white border border-blue-100 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 text-xs text-gray-600">
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
              <FaShieldAlt size={13} />
            </div>
            <span>
              <b>Akses Privat Aktif:</b> Anda hanya melihat task yang <b>Anda buat</b> (<i>assignedBy</i>) atau task yang <b>ditugaskan kepada Anda</b> (<i>assignee</i>).
            </span>
          </div>
          <span className="text-[11px] font-bold text-primary bg-blue-50 px-2.5 py-1 rounded-full shrink-0 hidden sm:inline-block">
            {filteredTasks.length} Task Ditampilkan
          </span>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          {/* Filter Category */}
          <div className="flex items-center gap-2 justify-between sm:justify-start">
            <span className="text-xs font-semibold text-gray-500 shrink-0">Filter Kategori:</span>
            <div className="flex items-center gap-1.5 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-xl border border-gray-200 transition-colors flex-1 sm:flex-initial">
              <FaFilter className="text-gray-400 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent focus:outline-none font-medium cursor-pointer w-full"
              >
                <option value="All">Semua Kategori</option>
                <option value="Feature">Feature (Fitur)</option>
                <option value="Bug Ticket">Ticket Bug (CH)</option>
                <option value="Tech Debt">Tech Debt</option>
                <option value="Improvement">Continuous Improvement</option>
              </select>
            </div>
          </div>

          {/* Switch View Mode: Kanban vs List */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewMode === "kanban" ? "bg-white text-primary shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <FaThLarge size={12} /> Board Kanban
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${viewMode === "list" ? "bg-white text-primary shadow-xs" : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <FaListUl size={12} /> List View
            </button>
          </div>
        </div>

        {/* View Mode: KANBAN BOARD */}
        {viewMode === "kanban" && (
          <div className="w-full pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 items-start w-full">
              {STATUSES.map((col) => {
                const colTasks = filteredTasks.filter((t) => t.status === col.id);
                const isOver = dragOverColumn === col.id;

                return (
                  <div
                    key={col.id}
                    onDragOver={handleDragOver}
                    onDragEnter={() => handleDragEnter(col.id)}
                    onDragLeave={() => handleDragLeave(col.id)}
                    onDrop={(e) => handleDrop(e, col.id)}
                    className={`rounded-2xl p-2.5 sm:p-3 border transition-all duration-200 flex flex-col min-h-[460px] w-full min-w-0 border-t-4 ${col.borderTop || "border-t-primary"} ${isOver
                        ? "bg-primary-light/40 border-primary border-dashed shadow-md"
                        : "bg-slate-100/70 border-slate-200/80"
                      }`}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200/80">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full ring-2 ring-white shrink-0 ${col.dot}`}></span>
                        <h3 className="text-xs font-bold text-gray-800 whitespace-nowrap uppercase tracking-wider">{col.label}</h3>
                      </div>
                      <span className="text-[11px] font-bold bg-white text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 shadow-2xs shrink-0">
                        {colTasks.length}
                      </span>
                    </div>

                    {/* Task Cards Container */}
                    <div className="flex flex-col gap-3 flex-1">
                      {colTasks.length === 0 ? (
                        <div className="h-32 rounded-xl border-2 border-dashed border-gray-200/80 flex flex-col items-center justify-center gap-1.5 text-gray-400 text-xs text-center p-3 bg-white/40">
                          <FaInbox className="text-gray-300" size={20} />
                          <span className="text-[11px] font-medium">{isOver ? "Lepaskan task di sini" : "Tidak ada task"}</span>
                        </div>
                      ) : (
                        colTasks.map((task) => {
                          const assigneeInfo = getAssigneeInfo(task.assignee);
                          const isCreator = isTaskCreator(task);
                          const isAssignee = isTaskAssignee(task);
                          const taskCreatorName = formatName(task.assignedBy || task.creatorName || (isCreator ? currentUserName : "Atasan / PO"));

                          return (
                            <div
                              key={task._id || task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task._id || task.id)}
                              className="bg-white rounded-xl sm:rounded-2xl p-3 border border-gray-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col gap-2 group relative w-full min-w-0"
                            >
                              {/* Top Meta: ID & Kategori Badge & Edit Task */}
                              <div className="flex items-center justify-between gap-1 flex-wrap">
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70">
                                  {formatTaskId(task._id || task.id)}
                                </span>
                                <div className="flex items-center gap-1">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 shadow-2xs ${CATEGORY_BADGES[task.category]?.bg || "bg-gray-50 text-gray-700 border-gray-200"
                                      }`}
                                  >
                                    {CATEGORY_BADGES[task.category]?.icon}
                                    {CATEGORY_BADGES[task.category]?.label || task.category}
                                  </span>
                                  {canModifyTask(task) && (
                                    <div className="flex items-center gap-0.5">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEditModal(task);
                                        }}
                                        className="p-1 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                                        title="Edit Task (Khusus Pembuat Task)"
                                      >
                                        <FaEdit size={11} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setTaskToDelete(task);
                                        }}
                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                        title="Hapus Task (Khusus Pembuat Task)"
                                      >
                                        <FaTrashAlt size={11} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Label Relasi Kepemilikan Task */}
                              <div className="flex items-center">
                                {isCreator && isAssignee ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                                    <FaUserCheck size={10} className="text-gray-500" /> Tugas Mandiri
                                  </span>
                                ) : isCreator ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                                    <FaUserCircle size={10} className="text-indigo-500" /> Diberikan ke {assigneeInfo.name}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                                    <FaUserCircle size={10} className="text-emerald-500" /> Dari: {taskCreatorName}
                                  </span>
                                )}
                              </div>

                              {/* Judul & Deskripsi */}
                              <div>
                                <h4 className="text-[13px] font-bold text-gray-800 group-hover:text-primary transition-colors leading-snug line-clamp-2">
                                  {task.title}
                                </h4>
                                {task.description && (
                                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed mt-1">
                                    {task.description}
                                  </p>
                                )}
                              </div>

                              {/* Info Deadline & SP Point */}
                              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                                  <FaCalendarAlt className="text-gray-400" size={10} /> {task.deadline || "Tanpa deadline"}
                                </span>

                                {/* Badge Poin (Bisa diklik khusus PO / HR untuk atur nilai poin) */}
                                {canSetPoint ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenPointModal(task);
                                    }}
                                    className="inline-flex items-center gap-1 font-bold text-[10px] bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200/80 transition-all cursor-pointer shadow-2xs"
                                    title="Klik untuk ubah poin task (Mode PO / HR)"
                                  >
                                    <FaStar className="text-amber-500" size={10} /> {task.point ?? 0} SP
                                  </button>
                                ) : (
                                  <span className="inline-flex items-center gap-1 font-bold text-[10px] bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200/60 shadow-2xs">
                                    <FaStar className="text-amber-500" size={10} /> {task.point ?? 0} SP
                                  </span>
                                )}
                              </div>

                              {/* Assignee Footer & Quick Status Picker */}
                              <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-gray-100/80">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <img
                                    src={assigneeInfo.avatar}
                                    alt={assigneeInfo.name}
                                    className="w-5 h-5 rounded-full object-cover ring-1 ring-gray-200 shrink-0"
                                    onError={(e) => {
                                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(assigneeInfo.name)}&background=0284c7&color=fff&bold=true&size=64`;
                                    }}
                                  />
                                  <span className="text-[10.5px] font-semibold text-gray-700 truncate">
                                    {assigneeInfo.name}
                                  </span>
                                </div>

                                {/* Dropdown pemindah status cepat */}
                                <div className="relative shrink-0">
                                  <select
                                    value={task.status}
                                    onChange={(e) => handleStatusChange(task._id || task.id, e.target.value)}
                                    className="text-[9.5px] font-semibold bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg pl-1.5 pr-4 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer appearance-none shadow-2xs transition-colors max-w-[85px] truncate"
                                  >
                                    {STATUSES.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.label}
                                      </option>
                                    ))}
                                  </select>
                                  <FaChevronDown
                                    size={6}
                                    className="text-gray-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none"
                                  />
                                </div>
                              </div>

                              {/* Tombol Aksi Khusus jika berada di QA */}
                              {task.status === "QA" && (
                                <div className="pt-2 flex gap-1.5 border-t border-gray-100">
                                  <button
                                    onClick={() => handleRejectQA(task._id || task.id)}
                                    className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold bg-red-50 text-red-600 hover:bg-red-100 py-1.5 px-2 rounded-xl border border-red-200/80 cursor-pointer shadow-2xs transition-colors"
                                    title="Kembalikan task ke Developer karena ada temuan bug"
                                  >
                                    <FaExclamationTriangle size={9} /> Reject Bug
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(task._id || task.id, "Done")}
                                    className="flex-1 flex items-center justify-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-1.5 px-2 rounded-xl border border-emerald-200/80 cursor-pointer shadow-2xs transition-colors"
                                  >
                                    <FaCheckCircle size={10} /> Lolos Done
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View Mode: LIST VIEW */}
        {viewMode === "list" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden w-full">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs min-w-full">
                <thead className="bg-gray-50/90 border-b border-gray-100 text-gray-500 font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-3.5">ID & Judul Task</th>
                    <th className="py-3 px-2.5 whitespace-nowrap">Kategori</th>
                    <th className="py-3 px-2.5 whitespace-nowrap">Dibuat Oleh</th>
                    <th className="py-3 px-2.5 whitespace-nowrap">Assignee</th>
                    <th className="py-3 px-2.5 whitespace-nowrap">SLA / Deadline</th>
                    <th className="py-3 px-2.5 whitespace-nowrap text-center">Point (SP)</th>
                    <th className="py-3 px-2.5 whitespace-nowrap text-center">Status</th>
                    <th className="py-3 px-2.5 whitespace-nowrap text-center">Aksi / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredTasks.map((task) => {
                    const assigneeInfo = getAssigneeInfo(task.assignee);
                    const isCreator = isTaskCreator(task);
                    const creatorName = formatName(task.assignedBy || task.creatorName || (isCreator ? currentUserName : "Atasan / PO"));

                    return (
                      <tr key={task._id || task.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3 px-3.5">
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/70 inline-block mb-0.5">
                            {formatTaskId(task._id || task.id)}
                          </span>
                          <p className="font-bold text-gray-800 text-xs sm:text-sm">{task.title}</p>
                          <p className="text-gray-400 text-xs line-clamp-1">{task.description}</p>
                        </td>
                        <td className="py-3 px-2.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shadow-2xs ${CATEGORY_BADGES[task.category]?.bg || "bg-gray-50 text-gray-700 border-gray-200"
                              }`}
                          >
                            {CATEGORY_BADGES[task.category]?.icon}
                            {CATEGORY_BADGES[task.category]?.label || task.category}
                          </span>
                        </td>
                        {/* Dibuat Oleh */}
                        <td className="py-3 px-2.5 whitespace-nowrap">
                          <span className="font-medium text-gray-800 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100 text-xs">
                            {creatorName}
                          </span>
                        </td>
                        {/* Assignee */}
                        <td className="py-3 px-2.5 font-semibold text-gray-800 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <img
                              src={assigneeInfo.avatar}
                              alt={assigneeInfo.name}
                              className="w-5.5 h-5.5 rounded-full object-cover ring-1 ring-gray-200 shrink-0"
                              onError={(e) => {
                                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(assigneeInfo.name)}&background=0284c7&color=fff&bold=true&size=64`;
                              }}
                            />
                            <span className="text-xs">{assigneeInfo.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2.5 whitespace-nowrap">
                          <p className="font-medium text-gray-700 text-xs">{task.deadline || "-"}</p>
                          <span className="text-[10px] text-gray-400">SLA: {task.sla || "48 Jam"}</span>
                        </td>
                        <td className="py-3 px-2.5 text-center whitespace-nowrap">
                          {canSetPoint ? (
                            <button
                              onClick={() => handleOpenPointModal(task)}
                              className="inline-flex items-center justify-center gap-1 font-bold text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200/80 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                              title="Atur Poin Task (PO / HR)"
                            >
                              <FaStar className="text-amber-500" size={10} /> {task.point ?? 0} SP
                            </button>
                          ) : (
                            <span className="inline-flex items-center justify-center font-bold text-xs bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200/60 whitespace-nowrap shadow-2xs">
                              <FaStar className="text-amber-500" size={10} /> {task.point ?? 0} SP
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center justify-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap shadow-2xs ${STATUSES.find((s) => s.id === task.status)?.color || "bg-gray-100 text-gray-700 border-gray-200"
                              }`}
                          >
                            {task.status}
                          </span>
                        </td>
                        <td className="py-3 px-2.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <div className="relative inline-block">
                              <select
                                value={task.status}
                                onChange={(e) => handleStatusChange(task._id || task.id, e.target.value)}
                                className="text-xs font-semibold bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl pl-2.5 pr-6 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-2xs appearance-none transition-colors"
                              >
                                {STATUSES.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                              <FaChevronDown
                                size={8}
                                className="text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                              />
                            </div>
                            {canModifyTask(task) && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(task)}
                                  className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary-light/20 rounded-lg border border-gray-200 transition-colors cursor-pointer"
                                  title="Edit Task (Khusus Pembuat Task)"
                                >
                                  <FaEdit size={12} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTaskToDelete(task)}
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-200 transition-colors cursor-pointer"
                                  title="Hapus Task (Khusus Pembuat Task)"
                                >
                                  <FaTrashAlt size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL: Tambah Task Baru */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">Tambah Task Baru</h3>
                  <p className="text-xs text-gray-400">Pilih penerima tugas (assignee) dari daftar karyawan yang tersedia</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="mt-4 flex flex-col gap-4">
                {/* Judul Task */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Judul Task <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Integrasi API Payment Gateway"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
                  />
                </div>

                {/* Deskripsi */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Deskripsi & Catatan</label>
                  <textarea
                    rows="3"
                    placeholder="Tuliskan rincian pengerjaan atau kendala tiket..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
                  ></textarea>
                </div>

                {/* Kategori & Assignee */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Kategori Task</label>
                    <select
                      value={newTask.category}
                      onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer"
                    >
                      <option value="Feature">Feature (Fitur Utama)</option>
                      <option value="Bug Ticket">Ticket Bug (Dari CH)</option>
                      <option value="Tech Debt">Tech Debt (Hutang Teknis)</option>
                      <option value="Improvement">Continuous Improvement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Penerima Task (Assignee) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newTask.assignee}
                      onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer font-medium"
                      required
                    >
                      {getAssigneeOptions().map((opt) => (
                        <option key={opt.empId || opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tanggal & SLA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Target Deadline</label>
                    <input
                      type="date"
                      value={newTask.deadline}
                      onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Target SLA</label>
                    <select
                      value={newTask.sla}
                      onChange={(e) => setNewTask({ ...newTask, sla: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer"
                    >
                      <option value="24 Jam">24 Jam (Bug Urgent)</option>
                      <option value="48 Jam">48 Jam (Normal SLA)</option>
                      <option value="72 Jam">72 Jam</option>
                      <option value="1 Minggu">1 Minggu (Feature)</option>
                    </select>
                  </div>
                </div>

                {/* Info Catatan tentang Akses & Poin */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-700 flex items-start gap-2.5">
                  <FaLightbulb className="text-blue-600 shrink-0 text-sm mt-0.5" />
                  <span>
                    <b>Privasi & Story Points:</b> Task ini hanya dapat dilihat oleh Anda (sebagai pembuat) dan penerima task. Penilaian Story Points (SP) akan dinilai oleh <b>Product Owner (PO) / HR</b>.
                  </span>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-dark text-white shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? "Menyimpan..." : "Simpan Task"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Edit Task */}
        {isEditModalOpen && editingTask && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">Edit Task</h3>
                  <p className="text-xs text-gray-400">
                    Perbarui informasi task <span className="font-mono font-bold text-slate-600">{formatTaskId(editingTask._id || editingTask.id)}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTask(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleUpdateTask} className="mt-4 flex flex-col gap-4">
                {/* Judul Task */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Judul Task <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
                  />
                </div>

                {/* Deskripsi */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Deskripsi & Catatan</label>
                  <textarea
                    rows="3"
                    value={editingTask.description}
                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
                  ></textarea>
                </div>

                {/* Kategori & Assignee */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Kategori Task</label>
                    <select
                      value={editingTask.category}
                      onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer"
                    >
                      <option value="Feature">Feature (Fitur Utama)</option>
                      <option value="Bug Ticket">Ticket Bug (Dari CH)</option>
                      <option value="Tech Debt">Tech Debt (Hutang Teknis)</option>
                      <option value="Improvement">Continuous Improvement</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Penerima Task (Assignee) <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editingTask.assignee}
                      onChange={(e) => setEditingTask({ ...editingTask, assignee: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer font-medium"
                      required
                    >
                      {getAssigneeOptions().map((opt) => (
                        <option key={opt.empId || opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status & Story Points */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Status Alur Kerja</label>
                    <select
                      value={editingTask.status}
                      onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer font-medium"
                    >
                      {STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Story Points (SP)</label>
                    <select
                      value={editingTask.point}
                      onChange={(e) => setEditingTask({ ...editingTask, point: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer font-medium"
                    >
                      {SP_OPTIONS.map((sp) => (
                        <option key={sp} value={sp}>
                          {sp} SP
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tanggal & SLA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Target Deadline</label>
                    <input
                      type="date"
                      value={editingTask.deadline}
                      onChange={(e) => setEditingTask({ ...editingTask, deadline: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Target SLA</label>
                    <select
                      value={editingTask.sla}
                      onChange={(e) => setEditingTask({ ...editingTask, sla: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer"
                    >
                      <option value="24 Jam">24 Jam (Bug Urgent)</option>
                      <option value="48 Jam">48 Jam (Normal SLA)</option>
                      <option value="72 Jam">72 Jam</option>
                      <option value="1 Minggu">1 Minggu (Feature)</option>
                    </select>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  {canModifyTask(editingTask) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setTaskToDelete(editingTask);
                      }}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <FaTrashAlt size={12} /> Hapus Task
                    </button>
                  ) : (
                    <div></div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditModalOpen(false);
                        setEditingTask(null);
                      }}
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer disabled:opacity-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-dark text-white shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Atur Poin Task (Khusus PO / HR) */}
        {selectedTaskForPoint && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-accent-light text-accent flex items-center justify-center font-bold text-sm">
                    SP
                  </span>
                  <div>
                    <h3 className="font-bold text-base text-gray-800">Atur Poin Task (PO / HR)</h3>
                    <p className="text-xs text-gray-400 font-mono">{selectedTaskForPoint.id} • {getAssigneeInfo(selectedTaskForPoint.assignee).name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTaskForPoint(null)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSavePoint} className="mt-4 flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-1">Judul Tugas:</p>
                  <p className="text-xs font-bold text-gray-900 bg-gray-50 p-2.5 rounded-xl border border-gray-200/80">
                    {selectedTaskForPoint.title}
                  </p>
                </div>

                {/* Pilihan Story Points Standar ClickUp */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Pilih Story Point (SP):
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {SP_OPTIONS.map((sp) => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => setInputPoint(sp)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${inputPoint === sp
                            ? "bg-accent text-white border-accent shadow-xs scale-105"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                          }`}
                      >
                        {sp} SP
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Custom Point */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Atau Ketik Nilai Poin Kustom:</label>
                  <input
                    type="number"
                    min="1"
                    value={inputPoint}
                    onChange={(e) => setInputPoint(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-light"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setSelectedTaskForPoint(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-semibold bg-accent hover:opacity-90 text-white shadow-sm cursor-pointer"
                  >
                    Simpan Poin
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Konfirmasi Hapus Task (Khusus Pembuat Task / PO / HR) */}
        {taskToDelete && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                  <FaTrashAlt size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-gray-900">Hapus Task?</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Apakah Anda yakin ingin menghapus task ini? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
                  </p>
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {formatTaskId(taskToDelete._id || taskToDelete.id)}
                    </span>
                    <p className="text-xs font-bold text-gray-800 mt-1 line-clamp-2">
                      {taskToDelete.title}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setTaskToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTask}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? "Menghapus..." : "Ya, Hapus Task"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
